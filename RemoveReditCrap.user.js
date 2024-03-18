// ==UserScript==
// @name         Remove Reddit's promoted posts and other noise
// @namespace    https://github.com/Delvar/TamperMonkeyScripts/
// @version      0.5
// @description  Get rid of Reddit's "promoted" posts and other noise
// @author       Lyle Hanson / Morgan
// @match        https://www.reddit.com/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    function kill_ads() {
        let spans = Array.prototype.slice.call( document.getElementsByTagName( "span" ) ).filter((span) => span.textContent == "promoted");
        spans.forEach((span) => {span.parentElement.parentElement.parentElement.parentElement.style.display="none"});

        spans = document.querySelectorAll( "span.promoted-label" );
        spans.forEach((span) => {span.parentElement.parentElement.parentElement.parentElement.style.display="none"});

        Array.from(document.getElementsByTagName("shreddit-dynamic-ad-link")).forEach((e) => { e.style.display = "none" } );
        Array.from(document.getElementsByTagName("shreddit-sidebar-ad")).forEach((e) => { e.style.display = "none" } );
        Array.from(document.getElementsByTagName("shreddit-ad-post")).forEach((e) => { e.style.display = "none" } );
    }

    kill_ads()
    // Hide the chat button
    //document.getElementById("HeaderUserActions--Chat").remove();
    // Also rerun the code each time document change (i.e new posts are added when user scroll down)
    document.addEventListener("DOMNodeInserted", kill_ads);
    //setInterval(kill_ads, 1000);
})();
