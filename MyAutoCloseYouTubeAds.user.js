// ==UserScript==
// @name         My Auto Close YouTube Ads
// @namespace    https://github.com/Delvar/TamperMonkeyScripts/
// @version      1.0.4
// @description  Close and/or Mute YouTube ads automatically!
// @author       fuzetsu / Morgan
// @run-at       document-body
// @match        *://*.youtube.com/*
// @match        https://www.youtube.com/*
// @exclude      *://*.youtube.com/subscribe_embed?*
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_deleteValue
// @grant        GM_registerMenuCommand
// @require      https://cdn.jsdelivr.net/gh/kufii/My-UserScripts@23586fd0a72b587a1786f7bb9088e807a5b53e79/libs/gm_config.js
// https://github.com/Delvar/TamperMonkeyScripts/raw/main/MyAutoCloseYouTubeAds.user.js
// ==/UserScript==
/* globals GM_getValue GM_setValue GM_deleteValue GM_registerMenuCommand GM_config */
/**
 * This section of the code holds the css selectors that point different parts of YouTube's
 * user interface. If the script ever breaks and you don't want to wait for me to fix it
 * chances are that it can be fixed by just updating these selectors here.
 */
const CSS = {
    // the button used to skip an ad
    skipButton: '.videoAdUiSkipButton,.ytp-ad-skip-button,.ytp-ad-skip-button-modern,.ytp-skip-ad-button',
    // the area showing the countdown to the skip button showing
    preSkipButton: '.videoAdUiPreSkipButton,.ytp-ad-preview-container,.ytp-preview-ad',
    // little x that closes banner ads
    closeBannerAd: '.close-padding.contains-svg,a.close-button,.ytp-ad-overlay-close-button',
    // button that toggle mute on the video
    muteButton: '.ytp-mute-button',
    // the slider bar handle that represents the current volume
    muteIndicator: '.ytp-volume-slider-handle',
    // container for ad on video
    adArea: '.videoAdUi,.ytp-ad-player-overlay,.ytp-ad-player-overlay-layout',
    // container that shows ad length eg 3:23
    adLength: '.videoAdUiAttribution,.ytp-ad-duration-remaining',
    // container for header ad on the home page
    homeAdContainer: '#masthead-ad,#big-yoodle,.ytd-ad-slot-renderer,ytd-ad-slot-renderer.style-scope.ytd-rich-item-renderer,ytd-in-feed-ad-layout-renderer.style-scope.ytd-ad-slot-renderer,div.style-scope.yt-mealbar-promo-renderer'
}

// From: https://stackoverflow.com/questions/20156453/how-to-detect-element-being-added-removed-from-dom-element
function onRemove(element, callback) {
    const parent = element.parentNode;
    if (!parent) throw new Error("The node must already be attached");

    const obs = new MutationObserver(mutations => {
        for (const mutation of mutations) {
            for (const el of mutation.removedNodes) {
                if (el === element) {
                    obs.disconnect();
                    callback();
                }
            }
        }
    });
    obs.observe(parent, {
        childList: true,
    });
}

const util = {
    log: (...args) => console.log(`%c${SCRIPT_NAME}:`, 'font-weight: bold;color: purple;', ...args),
    storeGet: key => {
        if (typeof GM_getValue === 'undefined') {
            const value = localStorage.getItem(key)
            return value === 'true' ? true : value === 'false' ? false : value
        }
        return GM_getValue(key)
    },
    storeSet: (key, value) =>
    typeof GM_setValue === 'undefined' ? localStorage.setItem(key, value) : GM_setValue(key, value),
    storeDel: key =>
    typeof GM_deleteValue === 'undefined' ? localStorage.removeItem(key) : GM_deleteValue(key),
    q: (query, context) => (context || document).querySelector(query),
    qq: (query, context) => Array.from((context || document).querySelectorAll(query)),
    get: (obj, str) => util.getPath(obj, str.split('.').reverse()),
    getPath: (obj, path) =>
    obj == null ? null : path.length > 0 ? util.getPath(obj[path.pop()], path) : obj,
}

const SCRIPT_NAME = 'My Auto Close YouTube Ads'
const SHORT_AD_MSG_LENGTH = 12000
const TICKS = []
let DONT_SKIP = false

const config = GM_config([
    {
        key: 'muteAd',
        label: 'Mute ads?',
        type: 'bool',
        default: true
    },
    {
        key: 'hideAd',
        label: 'Hide video ads?',
        type: 'bool',
        default: false
    },
    {
        key: 'secWaitBanner',
        label: 'Banner ad close delay (seconds)',
        type: 'number',
        default: 3,
        min: 0
    },
    {
        key: 'secWaitVideo',
        label: 'Video ad skip delay (seconds)',
        type: 'number',
        default: 3,
        min: 0
    },
    {
        key: 'minAdLengthForSkip',
        label: 'Dont skip video shorter than this (seconds)',
        type: 'number',
        default: 0,
        min: 0
    },
    {
        key: 'muteEvenIfNotSkipping',
        label: 'Mute video even if not skipping',
        type: 'bool',
        default: true
    },
    {
        key: 'debug',
        label: 'Show extra debug information.',
        type: 'bool',
        default: false
    },
    {
        key: 'version',
        type: 'hidden',
        default: 1
    }
])

const configVersion = 2
let conf = config.load()

config.onsave = cfg => (conf = cfg)

// config upgrade procedure
function upgradeConfig() {
    let lastVersion
    while (conf.version < configVersion && lastVersion !== conf.version) {
        util.log('Upgrading config version, current = ', conf.version, ', target = ', configVersion)
        lastVersion = conf.version
        switch (conf.version) {
            case 1: {
                const oldConf = {
                    muteAd: util.storeGet('MUTE_AD'),
                    hideAd: util.storeGet('HIDE_AD'),
                    secWait: util.storeGet('SEC_WAIT')
                }

                if (oldConf.muteAd != null) {conf.muteAd = !!oldConf.muteAd;}
                if (oldConf.hideAd != null) {conf.hideAd = !!oldConf.hideAd;}
                if (oldConf.secWait != null && !isNaN(oldConf.secWait)){
                    conf.secWaitBanner = conf.secWaitVideo = parseInt(oldConf.secWait);}

                conf.version = 2

                config.save(conf)
                ;['SEC_WAIT', 'HIDE_AD', 'MUTE_AD'].forEach(util.storeDel)
                break
            }
        }
    }
}
upgradeConfig()

function createMessageElement() {
    const elem = document.createElement('div')
    elem.setAttribute(
        'style',
        'border: 1px solid white;border-right: none;background: rgb(0,0,0,0.75);color:white;position: absolute;right: 0;z-index: 1000;top: 30px;padding: 10px;padding-right: 20px;cursor: pointer;pointer-events: all;'
    )
    return elem
}

function showMessage(container, text, ms) {
    const message = createMessageElement()
    message.textContent = text
    container.appendChild(message)
    util.log(`Showing message [${ms}ms]: ${text}`)
    setTimeout(() => message.remove(), ms)
}

function setupCancelDiv(ad) {
    const skipArea = util.q(CSS.preSkipButton, ad)
    const skipText = skipArea && skipArea.textContent.trim().replace(/\s+/g, ' ')
    if (skipText && !['will begin', 'will play'].some(snip => skipText.includes(snip))) {
        const cancelClass = 'acya-cancel-skip'
        let cancelDiv = util.q('.' + cancelClass)
        if (cancelDiv) cancelDiv.remove()
        cancelDiv = createMessageElement()
        cancelDiv.className = cancelClass
        cancelDiv.textContent = (conf.muteAd ? 'Un-mute & ' : '') + 'Cancel Auto Skip'
        cancelDiv.onclick = () => {
            util.log('Sancel clicked')
            DONT_SKIP = true
            cancelDiv.remove()
            if (conf.hideAd) {
                ad.style.zIndex = ''
                ad.style.background = ''
            }
            const muteButton = getMuteButton()
            const muteIndicator = getMuteIndicator()
            if (conf.muteAd && muteButton && muteIndicator && isMuted(muteIndicator)) muteButton.click()
        }
        ad.appendChild(cancelDiv)
    } else {
        util.log("Skip button area wasn't there for some reason.. couldn't place cancel button.")
    }
}

function parseTime(str) {
    const [minutes, seconds] = str
    .split(' ')
    .pop()
    .split(':')
    .map(num => parseInt(num))
    util.log('parseTime:', str, minutes, seconds)
    return minutes * 60 + seconds || 0
}

const getMuteButton = () => util.qq(CSS.muteButton).find(elem => elem.offsetParent)
const getMuteIndicator = () => util.qq(CSS.muteIndicator).find(elem => elem.offsetParent)
const isMuted = m => m.style.left === '0px'

function getAdLength(ad) {
    if (!ad) return 0
    const time = ad.querySelector(CSS.adLength)
    return time ? parseTime(time.textContent) : 0
}


// Look for different elements
// ---------------------------

// Skip Button
function foundSkipButton( btn ) {
    const ms = conf.secWaitVideo * 1000;
    util.log( 'Found skip button, waiting for activation', btn );
    onRemove( btn, () => waitForSkipButton() );

    //Some better way to do othis tahn using an interval
    var waitForActivationInterval = setInterval(
        () => {
            if ( btn.offsetParent !== null ) {
                util.log('Skip button active, waiting ' + ms + 'ms');
                clearInterval( waitForActivationInterval );
                setTimeout( () => {
                    if (DONT_SKIP) {
                        util.log( 'Not skipping...' );
                        DONT_SKIP = false;
                        return;
                    }
                    util.log( 'Clicking skip button' );
                    btn.click();
                }, ms );
            }
        }
        ,100 );
}

const observerForSkipButton = new MutationObserver( ( mutations, observer ) => {
    for ( const mutation of mutations ) {

        for ( const added of mutation.addedNodes ) {
            if ( added.nodeType === Node.ELEMENT_NODE && added.nodeName == 'button' ) {
                util.log( 'Added: skip button observer found button', added );
            }
            if ( added.nodeType === Node.ELEMENT_NODE && added.matches( CSS.skipButton ) ) {
                observer.disconnect();
                foundSkipButton( added );
                return;
            }
        }

        for (const {target} of mutations) {
            if ( target.nodeType === Node.ELEMENT_NODE && target.nodeName == 'button' ) {
                util.log( 'Updated: skip button observer found button', target );
            }
            if ( target.nodeType === Node.ELEMENT_NODE && target.matches( CSS.skipButton ) ) {
                observer.disconnect();
                foundSkipButton( target );
                return;
            }
        }


    }

    var elements = document.querySelectorAll( CSS.skipButton );
    for ( const element of elements ) {
        if ( element.nodeType === Node.ELEMENT_NODE && element.matches( CSS.skipButton ) ) {
            util.log( 'Catch-all: skip button observer found button' );
            observer.disconnect();
            foundSkipButton( element );
            return;
        }
    }
});

//FIXME: we should only observer the player not the whole document
function waitForSkipButton() {
    util.log( 'Waiting for skip button' );

    var elements = document.querySelectorAll( CSS.skipButton );
    for ( const element of elements ) {
        if ( element.nodeType === Node.ELEMENT_NODE && element.matches( CSS.skipButton ) ) {
            util.log( 'Already present' );
            foundSkipButton( element );
            return;
        }
    }
    observerForSkipButton.disconnect();
    observerForSkipButton.observe( document.body, {
        childList: true,
        subtree: true
    } );
};

// Ad Area
function foundAdArea( ad )
{
    // reset don't skip
    DONT_SKIP = false;
    onRemove( ad, () => waitForAdArea() );
    waitForSkipButton();
    const adLength = getAdLength( ad );
    const isShort = adLength < conf.minAdLengthForSkip;
    const debug = () =>
    conf.debug
    ? `[DEBUG adLength = ${adLength}, minAdLengthForSkip = ${conf.minAdLengthForSkip}]`
            : '';
    if ( isShort && !conf.muteEvenIfNotSkipping ) {
        DONT_SKIP = true;
        return showMessage(
            ad,
            `Shot AD detected, will not skip or mute. ${debug()}`,
            SHORT_AD_MSG_LENGTH
        );
    }
    if ( conf.hideAd ) {
        ad.style.zIndex = 10;
        ad.style.background = 'black';
    }
    // show option to cancel automatic skip
    if ( !isShort ) setupCancelDiv(ad);
    if ( !conf.muteAd ) return;
    const muteButton = getMuteButton();
    const muteIndicator = getMuteIndicator();
    if ( !muteIndicator ) return util.log( 'Unable to determine mute state, skipping mute' );
    muteButton.click()
    util.log( 'Video ad detected, muting audio' )
    // wait for the ad to disappear before unmuting
    onRemove( ad, ()=>{
        if ( isMuted( muteIndicator ) ) {
            muteButton.click();
            util.log( 'Video ad ended, unmuting audio' );
        } else {
            util.log( 'Video ad ended, audio already unmuted' );
        }
    });

    if ( isShort ) {
        DONT_SKIP = true;
        return showMessage(
            ad,
            `Short AD detected, will not skip but will mute. ${debug()}`,
            SHORT_AD_MSG_LENGTH
        );
    }
}

const observerForAdArea = new MutationObserver( ( mutations, observer ) => {
    for ( const mutation of mutations ) {
        for ( const added of mutation.addedNodes ) {
            if ( added.nodeType === Node.ELEMENT_NODE && added.matches( CSS.adArea ) ) {
                observer.disconnect();
                foundAdArea( added );
            }
        }
    }
});

function waitForAdArea() {
    util.log( 'Waiting for ad area' );

    var elements = document.querySelectorAll( CSS.adArea );
    for ( const element of elements ) {
        if ( element.nodeType === Node.ELEMENT_NODE && element.matches( CSS.adArea ) ) {
            util.log( 'Already present' );
            foundAdArea( element );
            return;
        }
    }
    observerForAdArea.disconnect();
    observerForAdArea.observe( document.body, {
        childList: true,
        subtree: true
    });
};

// Banner Ad
function foundCloseBannerAd( btn )
{
    onRemove( btn, () => waitForCloseBannerAd() );
    const ms = conf.secWaitBanner * 1000;
    util.log('Found banner ad, closing in ' + ms + 'ms');
    setTimeout(() => {
        btn.click();
    }, ms);
}

const observerForCloseBannerAd = new MutationObserver( ( mutations, observer ) => {
    for ( const mutation of mutations ) {
        for ( const added of mutation.addedNodes ) {
            if ( added.nodeType === Node.ELEMENT_NODE && added.matches( CSS.closeBannerAd ) ) {
                observer.disconnect();
                foundCloseBannerAd( added );
            }
        }
    }
});

function waitForCloseBannerAd() {
    util.log( 'Waiting for banner ad' );

    var elements = document.querySelectorAll( CSS.closeBannerAd );
    for ( const element of elements ) {
        if ( element.nodeType === Node.ELEMENT_NODE && element.matches( CSS.closeBannerAd ) ) {
            util.log( 'Already present' );
            foundBannerAd( element );
            return;
        }
    }
    observerForCloseBannerAd.disconnect();
    observerForCloseBannerAd.observe( document.body, {
        childList: true,
        subtree: true
    });
};

// Home Ad Container
const observerForHomeAdContainer = new MutationObserver( ( mutations, observer ) => {
    for ( const mutation of mutations ) {
        for ( const added of mutation.addedNodes ) {
            if ( added.nodeType === Node.ELEMENT_NODE && added.matches( CSS.homeAdContainer ) ) {
                util.log( 'Found home ad container, removing' );
                // Give them a red box
                // added.style.border = "thick solid Red";
                // or remove them
                added.remove();
                // #FIXME remove 'hole' left by removing the add, need to remove pairant too.
            }
        }
    }
});

function waitForHomeAdContainer() {
    util.log( 'Waiting for home ad container' );
    observerForHomeAdContainer.disconnect();
    observerForHomeAdContainer.observe( document.body, {
        childList: true,
        subtree: true
    });
};

function waitForAds() {
    DONT_SKIP = false;
    waitForSkipButton();
    waitForAdArea();
    waitForCloseBannerAd();
}

function stopWaitingForAds() {
    observerForSkipButton.disconnect();
    observerForAdArea.disconnect();
    observerForCloseBannerAd.disconnect();
}

util.log('Started');

/*
(() => {
    util.log("history redirect");
    let oldPushState = history.pushState;
    history.pushState = function pushState() {
        util.log("history pushState");
        let ret = oldPushState.apply(this, arguments);
        window.dispatchEvent(new Event('pushstate'));
        window.dispatchEvent(new Event('locationchange'));
        return ret;
    };

    let oldReplaceState = history.replaceState;
    history.replaceState = function replaceState() {
        util.log("history replaceState");
        let ret = oldReplaceState.apply(this, arguments);
        window.dispatchEvent(new Event('replacestate'));
        window.dispatchEvent(new Event('locationchange'));
        return ret;
    };

    window.addEventListener('popstate', () => {
        util.log("history popstate");
        window.dispatchEvent(new Event('locationchange'));
    });
})();

window.addEventListener('popstate', function (event) {
    util.log("window.popstate");
});
window.addEventListener('pushstate', function (event) {
    util.log("window.pushstate");
});
window.addEventListener('locationchange', function (event) {
    util.log('window.locationchange');
});
window.addEventListener('hashchange', function (event) {
    util.log('window.hashchange');
});

window.addEventListener('yt-page-data-fetched', function (event) {
    util.log('window.yt-page-data-fetched');
});
window.addEventListener('yt-navigate-finish', function (event) {
    util.log('window.yt-navigate-finish');
});
document.addEventListener('yt-page-data-fetched', function (event) {
    util.log('document.yt-page-data-fetched');
});
document.addEventListener('yt-navigate-finish', function (event) {
    util.log('document.yt-navigate-finish');
});
*/
if (window.self === window.top) {
    util.log('Adding content update event listener');
    let videoUrl;
    let wasWatching = false;

    // Look for when we start or stop watchign a video
    document.addEventListener("yt-navigate-finish", function(event) {
        util.log("Content changed")
        const nowWatching = /^https:\/\/www\.youtube\.com\/watch\?.*v=.+/.test(location.href);
        if ( nowWatching ) {
            if ( wasWatching ) {
                if ( location.href !== videoUrl ) {
                    util.log('Changed video');
                    // Restart Observers
                    stopWaitingForAds();
                    waitForAds();
                } //else its the same video, do nothing
            } else {
                // Must have jsut astarted watchign a new video
                util.log('Started video');
                waitForAds();
            }
            videoUrl = location.href;
        } else {
            if ( wasWatching ) {
                //Stopped watching a video
                util.log('Left video, stopped waiting for ads')
                stopWaitingForAds();
            } //else we were not watchign a video and are not currently watchign a video, do nothing.
            videoUrl = null;
        }
        wasWatching = nowWatching;
    });
    waitForHomeAdContainer();
} else {
    if (/^https:\/\/www\.youtube\.com\/embed\//.test(location.href)) {
        util.log('Found embedded video, waiting for ads')
        waitForAds()
    }
}

GM_registerMenuCommand('My Auto Close Youtube Ads - Manage Settings', config.setup)
