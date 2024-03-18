// ==UserScript==
// @name         Resize Salesforce Opportunity And Products Window
// @namespace    https://github.com/Delvar/TamperMonkeyScripts/
// @version      0.1
// @description  Try to resize and clean up the Opportunity Add Product window to maek it more usable.
// @author       Morgan Gilroy
// @match        https://*.sandbox.lightning.force.com/*
// @match        https://*.sandbox.lightning.force.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=force.com
// @grant        none
// ==/UserScript==

// https://github.com/Delvar/TamperMonkeyScripts/raw/main/ResizeSalesforceOpportunityAndProductsWindow.user.js

(function() {
    'use strict';

    function resizeProductWindow( element ) {
        if (element == undefined) {
            element = document.querySelector('[data-aura-class="forceMultiAddUsingLVM"]');
        }
        element.style['max-height'] = (window.innerHeight - 388) + 'px';
        element.parentElement.parentElement.style.padding = '5px';
        element.parentElement.parentElement.style.width = '99%';
    }

    window.addEventListener("resize", (event) => resizeProductWindow() );

    function waitForElm(selector) {
        return new Promise(resolve => {
            if (document.querySelector(selector)) {
                return resolve(document.querySelector(selector));
            }

            const observer = new MutationObserver(mutations => {
                if (document.querySelector(selector)) {
                    observer.disconnect();
                    resolve(document.querySelector(selector));
                }
            });

            observer.observe(document.body, {
                childList: true,
                subtree: true
            });
        });
    }
    waitForElm('[data-aura-class="forceMultiAddUsingLVM"]').then(resizeProductWindow);

})();