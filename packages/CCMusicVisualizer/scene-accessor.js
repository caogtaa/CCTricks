// Copyright 2021 Cao Gaoting<caogtaa@gmail.com>
// https://caogtaa.github.io
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

/*
 * Date: 2021-05-20 20:45:01
 * @LastEditors: GT<caogtaa@gmail.com>
 * @LastEditTime: 2021-07-01 12:18:32
*/ 

// let fs = require("fs");
// let PNG = require("pngjs").PNG;

const Path = require("path");

function isAudioFile(uuid) {
    let meta = Editor.assetdb.remote.loadMetaByUuid(uuid);
    //@ts-ignore
    if (meta.duration === undefined) {
        return false;
    }

    let filePath = Editor.assetdb.remote.uuidToFspath(uuid);
    let ext = Path.extname(filePath);
    return ['.wav', '.mp3', '.ogg'].includes(ext);
}

// @ts-ignore
module.exports = {
    /*'create-node': function (event, param) {
        let selected = Editor.Selection.curSelection('node');
        if (selected.length > 0) {
            param.parentId = selected[0];
        }

        insertNode(param, (error, node) => {
            if (node) {
                // select new node
                Editor.Selection.select('node', node.uuid);
                // Editor.log(`'${node.name}' created`);
            }

            if (event.reply) {
                event.reply(error);
            }
        });
    },*/

    'do-extract-fft': function(event, param) {
        try {
            let selection = Editor.Selection.curSelection('asset');
            if (selection.length === 0) {
                event.reply("[VIS] 未选中声音文件");
                return;
            }

            let uuid = selection[0];
            if (!isAudioFile(uuid)) {
                event.reply("[VIS] 未选中声音文件");
                return;
            }

            let path = Editor.assetdb.remote.uuidToFspath(uuid);
            let Generator = require("./FFTTextureGenerator");
            let generator = new Generator;
            generator.Generate(uuid, path);
            event.reply(null);
        } catch (e) {
            Editor.log(e);
            event.reply(null);
        } finally {
            
        }
    }
};
