/*
 * @Date: 2021-05-20 18:09:25
 * @LastEditors: GT<caogtaa@gmail.com>
 * @LastEditTime: 2021-05-20 18:34:14
 */


// 'use strict';

// let boundContext = {
//     isAssetSelected: Boolean = false
// };

function injectAssetsMenu() {


    return;

    /*if (Editor['__gt_asset_injected']) {
        return;
    }

    Editor['__gt_asset_injected'] = true;

    let listener = new Editor.IpcListener();
    listener.on('selection:context', function () {
        Editor.log(arguments);
        if (arguments[1] == 'asset') {
            boundContext.isAssetSelected = true;
            // let path = arguments[2] ? Editor.assetdb.uuidToFspath(arguments[2]) : null;
            // Editor.log(path);
        } else {
            boundContext.isAssetSelected = false;
        }
    });*/
}

module.exports = {
    load() {
        injectAssetsMenu();
        /*loadMenu();
        try {
          if (Editor.Window.main.nativeWin.webContents.__gt_injected) {
            // in case plugin if reloaded
            return;
          }
        } catch(error) {
          // usually happen when creator is just started and main window is not created
          Editor.log(error);
        }

        // todo: 如果插件是中途加载的，判断webContents如果就绪了就注入
        const electron = require('electron');
        let injectFn = injectContextMenu;
        electron.app.on('web-contents-created', (sender, webContents) => {
          webContents.on('dom-ready', (e) => {
            
            // injectFn(e.sender);
          });
        });*/
    },

    unload() {
        // let webContenst = Editor.Window.main.nativeWin.webContents;
        // if (webContenst.__gt_injected) {
        //     // todo: removeEventListeners
        //     webContenst.__gt_injected = false;
        // }
        // execute when package unloaded
    },

    // register your ipc messages here
    messages: {
        /*'assets:popup-context-menu'(e, e1, e2, e3, e4) {
            Editor.log(e);
            Editor.log(e1);
            Editor.log(e2);
            Editor.log(e3);
            Editor.log(e4);
            Editor.log(e.sender);
            e.preventDefault();

            Editor.log(new Error().stack);

            return;

            const Remote = require('electron').remote;
            const Menu = Remote.Menu;
            const MenuItem = Remote.MenuItem;
            Editor.load()
        },*/

        'extract-fft'() {
            Editor.log('extract-fft');
        }
    }
}
