/*
 * @Date: 2021-05-20 18:09:25
 * @LastEditors: GT<caogtaa@gmail.com>
 * @LastEditTime: 2021-05-20 20:54:12
 */


'use strict';

// 根据用户点击位置实时变化true/false
let boundContext = {
    isAssetSelected: false,
    listener: null
};


// 追加到asset菜单下方的自定义菜单项
let assetMenuTemplateEx = [
    {
        type: 'separator'
    },
    {
        label: '提取FFT纹理',
        click: () => {
            // Editor.log("提取FFT纹理");
            Editor.Scene.callSceneScript('music-visualizer', 'do-extract-fft', null, (err) => {
                if (err)
                    Editor.log(err);
            });
        }
    }
]

// todo: 如果想要多个插件复用这个扩展功能，需要
// 1. 不同插件使用唯一的__gt_context
// 2. AssetMenu不要直接继承Editor.Menu，而是在onload阶段mixin
class AssetMenu extends Editor.Menu {
    // 获外部变量会导致组件重新加载后变量失效
    // 保存到类内部，每次加载插件时刷新
    static __gt_context = null;

    constructor() {
        if (AssetMenu.__gt_context && AssetMenu.__gt_context.isAssetSelected) {
            // insert your custom menu
            arguments[0].push(...assetMenuTemplateEx);
        }

        super(...arguments);

        // Editor.log(...arguments);
        // return new Editor.Menu(...arguments);
    }
}

function onSelected() {
    // Editor.log('selection:selected');
    // Editor.log(...arguments);
    if (arguments[1] === 'asset') {
        boundContext.isAssetSelected = true;
    } else {
        boundContext.isAssetSelected = false;
    }
}

function clearBoundContext() {
    boundContext.isAssetSelected = false;
    if (boundContext.listener) {
        boundContext.listener.clear();
        boundContext.listener = null;
    }
}

function injectAssetsMenu() {
    clearBoundContext();

    boundContext.listener = new Editor.IpcListener();
    boundContext.listener.on('selection:context', onSelected);          // context消息每次点击会多次触发，但是目前没有更好的选择
    // boundContext.listener.on('selection:selected', onSelected);      // selected触发时机太晚

    if (Editor['__gt_asset_injected']) {
        Editor.Menu.__gt_context = boundContext;
        return;
    }

    Editor['__gt_asset_injected'] = true;

    // cc.js.mixin(AssetMenu.prototype, Editor.Menu.prototype);     // 没有cc命名空间，改用继承的方式
    Editor.Menu = AssetMenu;
    Editor.Menu.__gt_context = boundContext;
}

module.exports = {
    load() {
        Editor.log('load');
        injectAssetsMenu();
    },

    unload() {
        clearBoundContext();
        Editor.Menu.__gt_context = null;
    },

    // register your ipc messages here
    messages: {
        'extract-fft'() {
            // Editor.log('extract-fft from main menu');
            Editor.Scene.callSceneScript('music-visualizer', 'do-extract-fft', null, (err) => {
                if (err)
                    Editor.log(err);
            });
        }
    }
}
