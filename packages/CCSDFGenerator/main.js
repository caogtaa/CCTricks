/*
 * @Date: 2021-05-20 18:09:25
 * @LastEditors: GT<caogtaa@gmail.com>
 * @LastEditTime: 2021-08-26 22:24:07
 */

const Path = require("path")
const Fs = require("fs")
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
        label: '生成SDF纹理',
        click: () => {
            // Editor.log("生成SDF纹理");
            Editor.Scene.callSceneScript('sdf-generator', 'do-gen-sdf', null, (err) => {
                if (err)
                    Editor.log(err);
            });
        }
    }
]

function _injectAssetMenuKlass(klass) {
    function AssetMenu() {
        if (AssetMenu.__gt_context && AssetMenu.__gt_context.isAssetSelected) {
            // insert your custom menu
            arguments[0].push(...assetMenuTemplateEx);
        }

        return new klass(...arguments);
    }

    // subclass Editor.Menu
    // 可以用class AssetMenu extends Editor.Menu {}简单处理，但是多个插件同时这么做会互相覆盖
    let propNames = Object.getOwnPropertyNames(klass);
    console.warn(propNames);
    for (let name of propNames) {
        let obj = Object.getOwnPropertyDescriptor(klass, name);
        if (obj.writable) {
            AssetMenu[name] = klass[name];
        }
    }

    AssetMenu.prototype = klass.prototype;
    
    Object.assign(AssetMenu, {
        // 获外部变量会导致组件重新加载后变量失效
        // 保存到类内部，每次加载插件时刷新
        __gt_context: null,
    });

    return AssetMenu;
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

    if (Editor['__gt_sdf_generator_injected']) {
        Editor.Menu.__gt_context = boundContext;
        return;
    }

    Editor['__gt_sdf_generator_injected'] = true;
    let newKlass = _injectAssetMenuKlass(Editor.Menu);
    newKlass.__gt_context = boundContext;

    // replace current menu class
    Editor.Menu = newKlass;
}

module.exports = {
    load() {
        let localSettingPath = Path.join(Editor.Project.path, 'local', 'settings.json');
        let content = Fs.readFileSync(localSettingPath);
        if (content) {
            let srcFilePath = Path.join(Editor.Project.path, 'assets', 'Demo', 'SDF', 'Shader', 'sdf.inc');
            try {
                // 拷贝sdf.inc到引擎目录
                // TODO: 需要测试Mac
                let targetEngineDir = "";
                let jsonContent = JSON.parse(content);
                if (!jsonContent['use-global-engine-setting'] && !jsonContent['use-default-js-engine']) {
                    // 检测到自定义引擎
                    targetEngineDir = jsonContent['js-engine-path'];
                } else {
                    // C:\CocosDashboard_1.0.12\resources\.editors\Creator\2.4.2\resources\app.asar
                    let editorDir = Path.dirname(require('electron').app.getAppPath());
                    targetEngineDir = Path.join(editorDir, 'engine');

                    // targetEngineDir = Path.join(Path.dirname(), 'engine');
                }

                let targetFilePath = Path.join(targetEngineDir, 'cocos2d', 'renderer', 'build', 'chunks', 'sdf.inc');
                if (!Fs.existsSync(targetFilePath)) {
                    Editor.log(`[SDF-GEN] 正在拷贝sdf.inc到引擎目录 ${targetFilePath}`);
                    Fs.copyFileSync(srcFilePath, targetFilePath);
                } else {
                    Editor.log(`[SDF-GEN] sdf.inc已经存在: ${targetFilePath}`);
                }
            } catch (e) {
                Editor.err(`[SDF-GEN] 拷贝sdf.inc失败，请按照文件头部注释操作 ${srcFilePath}`);
            }
        }

        injectAssetsMenu();
    },

    unload() {
        clearBoundContext();
        Editor.Menu.__gt_context = null;
    },

    // register your ipc messages here
    messages: {
        'gen-sdf'() {
            // Editor.log('gen-sdf from main menu');
            Editor.Scene.callSceneScript('sdf-generator', 'do-gen-sdf', null, (err) => {
                if (err)
                    Editor.log(err);
            });
        },

        'on-gen-finished'(event, param) {
            let outputPath = param;
            try {
                // refresh asset db
                let assetdb = Editor.assetdb;
                let url = assetdb.fspathToUrl(outputPath);
                url = Path.dirname(url);
                Editor.log(`[SDF-GEN] refresh ${url}`);
                assetdb.refresh(url, (err, results) => {
                    if (err) {
                        Editor.log('[SDF-GEN]', err);
                        return;
                    }
                });
            } catch (e) {
                Editor.log(e);
            }
        }
    }
}
