/*
 * @Date: 2021-05-20 18:09:25
 * @LastEditors: GT<caogtaa@gmail.com>
 * @LastEditTime: 2021-06-30 17:53:32
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
            Editor.Scene.callSceneScript('music-visualizer', 'do-extract-fft', null, (err) => {
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

    if (Editor['__gt_asset_injected']) {
        Editor.Menu.__gt_context = boundContext;
        return;
    }

    Editor['__gt_asset_injected'] = true;
    let newKlass = _injectAssetMenuKlass(Editor.Menu);
    newKlass.__gt_context = boundContext;

    // replace current menu class
    Editor.Menu = newKlass;
}

module.exports = {
    load() {
        injectAssetsMenu();
    },

    unload() {
        clearBoundContext();
        Editor.Menu.__gt_context = null;
    },

    // register your ipc messages here
    messages: {
        'gen-sdf'() {
            // Editor.log('extract-fft from main menu');
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
                Editor.log(`[VIS] refresh ${url}`);
                assetdb.refresh(url, (err, results) => {
                    if (err) {
                        Editor.log('[VIS]', err);
                        return;
                    }

                    let outUuid = assetdb.fspathToUuid(outputPath);
                    Editor.log(`[VIS] outUuid = ${outUuid}`);
                    let meta = assetdb.loadMetaByUuid(outUuid);
                    if (meta) {
                        meta.filterMode = 'point';
                        meta.packable = false;

                        // Editor自带的meta功能太难用了，stringify meta时还不包含subMeta信息。改用自己读写meta文件。
                        let metaPath = outputPath + ".meta";
                        let data = Fs.readFileSync(metaPath, 'utf8');
                        let obj = JSON.parse(data);
                        obj.filterMode = 'point';
                        obj.packable = false;
                        Fs.writeFileSync(metaPath, JSON.stringify(obj, null, 2));
                        Editor.log("[VIS] meta updated");
                        Editor.log("[VIS] finished");

                        /*var cache = [];
                        var str = JSON.stringify(meta, function(key, value) {
                            if (key.startsWith('_'))
                                return undefined;

                            if (typeof value === 'object' && value !== null) {
                                if (cache.indexOf(value) !== -1) {
                                    // 移除
                                    return undefined;
                                }
                                // 收集所有的值
                                cache.push(value);
                            }
                            return value;
                        });

                        cache = null;
                        Editor.log(`[VIS] ${str}`);
                        // assetdb.saveMeta(url, str, (err, meta) => {
                        //     Editor.log("[VIS] meta updated");
                        //     Editor.log("[VIS] finished");
                        // });*/
                    }
                });
            } catch (e) {
                Editor.log(e);
            }
        }
    }
}
