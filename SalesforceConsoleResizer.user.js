// ==UserScript==
// @name         Salesforce Console Resizer
// @namespace    https://github.com/Delvar/TamperMonkeyScripts/
// @version      0.3
// @description  Make salesforce built in console app areas resizable .. quick hack.
// @author       Morgan Gilroy
// @match        https://*.lightning.force.com/lightning/*
// @icon         https://www.google.com/s2/favicons?domain=force.com
// @grant        GM_addStyle
// ==/UserScript==

(function() {
    // https://github.com/Delvar/TamperMonkeyScripts/raw/main/SalesforceConsoleResizer.user.js
    'use strict';
    GM_addStyle('.main-container-wrapper { flex: auto; width: 100% !important;}');
    GM_addStyle('flexipage-record-home-scrollable-column {overflow-y: auto; resize: horizontal; flex: auto;}');
    GM_addStyle('flexipage-record-home-scrollable-column.left-pinned {min-width: 300px; max-width: 50%; width: 25%;}');
    GM_addStyle('flexipage-record-home-scrollable-column.slds-size_8-of-12 {width: 66.6666%; max-width: 97.6%; min-width:50%; padding: 12px;}');
    GM_addStyle('flexipage-record-home-scrollable-column.slds-size_4-of-12 {max-width: 50%; width: 0px; resize: none; flex: auto;}');
    GM_addStyle('[navex-consoleTab2_consoleTab2-host].is-pinned > section.tabContent[navex-consoleTab2_consoleTab2].active {overflow: hidden}');
})();
