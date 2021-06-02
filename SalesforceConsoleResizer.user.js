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
    GM_addStyle('[flexipage-recordhomepinnedheaderleftsidebartwocoltemplatedesktop2_recordhomepinnedheaderleftsidebartwocoltemplatedesktop2].slds-region__pinned-left {overflow-y: auto; position: relative; resize: horizontal; min-width: 25%; max-width: 50%; width: 25%;}');
    GM_addStyle('[flexipage-recordhomepinnedheaderleftsidebartwocoltemplatedesktop2_recordhomepinnedheaderleftsidebartwocoltemplatedesktop2].main-container-wrapper {flex: auto}');
    GM_addStyle('div.tabContainer.oneConsoleTabContainer.slds-grid { flex: auto; width: 100% !important;}');
})();
