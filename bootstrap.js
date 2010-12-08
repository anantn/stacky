/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1/GPL 2.0/LGPL 2.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * The Original Code is Stacky.
 *
 * The Initial Developer of the Original Code is The Mozilla Foundation.
 * Portions created by the Initial Developer are Copyright (C) 2010
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *	Anant Narayanan <anant@mozilla.com>
 *
 * Alternatively, the contents of this file may be used under the terms of
 * either the GNU General Public License Version 2 or later (the "GPL"), or
 * the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
 * in which case the provisions of the GPL or the LGPL are applicable instead
 * of those above. If you wish to allow use of your version of this file only
 * under the terms of either the GPL or the LGPL, and not to allow others to
 * use your version of this file under the terms of the MPL, indicate your
 * decision by deleting the provisions above and replace them with the notice
 * and other provisions required by the GPL or the LGPL. If you do not delete
 * the provisions above, a recipient may use your version of this file under
 * the terms of any one of the MPL, the GPL or the LGPL.
 *
 * ***** END LICENSE BLOCK ***** */

const {classes: Cc, interfaces: Ci, utils: Cu} = Components;
Cu.import("resource://gre/modules/Services.jsm");
Cu.import("resource://gre/modules/AddonManager.jsm");

function Stacky(win, add)
{
    this._addon = add;
    this._window = win;
    let uri = this._addon.getResourceURI("content/browser.xul").spec;
    this._window.document.loadOverlay(uri, this);

    // Create catch-all group   
    this._groups = [];
    this._activeGroup = null;
    this._ungrouped = this.createGroup();
    this._window.gBrowser.hideTab(this._ungrouped);
}
Stacky.prototype = {
    createGroup: function() {
        let grp = this._window.gBrowser.addTab();
        let uri = this._addon.getResourceURI("content/stack.xml").spec;
        grp.style.MozBinding = "url(" + uri + "#stacky-tab)";
        
        grp._tabs = [];
        this._groups.push(grp);
        return grp;
    },

    createStack: function(tab) {
        this._window.alert(tab.class + tab.id);
        let grp = this.createGroup();
        this.addTabToStack(tab, grp);
    },

    addTabToStack: function(tab, group) {
        let present = !group._tabs.every(function(el, idx, ar) {
            return (el !== tab);
        });
        
        if (present) return;
        group._tabs.push(tab);
    
        // XBL may not have been applied yet
        let self = this;
        function doTabMove() {
            if (typeof group.mCounter === "undefined") {
                self._window.setTimeout(doTabMove, 10);
                return;
            }
            group.mCounter.value = group._tabs.length;
            self.activateStackWithTab(group, tab);
        }
        doTabMove();
    },

    activateStackWithTab: function(group, tab) {
        this._window.gBrowser.selectedTab = group;
        tab.style.display = "none";
    },

    observe: function(subject, topic, data) {
        dump("received " + subject + " & " + topic + "\n");
    }
};


/* Restartless add-on glue code. We associate an instance of Stacky with every
 * open window and all windows that may be opened in the future under gBrowser.
 */
let unloaders = [];
function startup(data, reason)
{
    function winWatcher(subject, topic) {
        if (topic != "domwindowopened")
            return;

        subject.addEventListener("load", function() {
            subject.removeEventListener("load", arguments.callee, false);
            let doc = subject.document.documentElement;
            if (doc.getAttribute("windowtype") == "navigator:browser") {
                AddonManager.getAddonByID("stacky@labs.mozilla", function(addon) {
                    subject.gBrowser.Stacky = new Stacky(subject, addon);
                });
            }
        }, false);
    }
    Services.ww.registerNotification(winWatcher);
    unloaders.push(function() Services.ww.unregisterNotification(winWatcher));
}

function shutdown(data, reason)
{
    if (reason !== APP_SHUTDOWN)
        unloaders.forEach(function(unload) unload && unload());
}

function install()
{
}

function uninstall()
{
}

