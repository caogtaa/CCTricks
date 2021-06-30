// Copyright 2021 Cao Gaoting<caogtaa@gmail.com>
// https://caogtaa.github.io
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

/*
 * Date: 2021-05-20 20:45:01
 * @LastEditors: GT<caogtaa@gmail.com>
 * @LastEditTime: 2021-06-30 18:02:12
*/ 

// let fs = require("fs");
// let PNG = require("pngjs").PNG;

const Path = require("path");

function isPngFile(uuid) {
    let filePath = Editor.assetdb.remote.uuidToFspath(uuid);
    let ext = Path.extname(filePath);
    return ['.png'].includes(ext);
}

// @ts-ignore
module.exports = {
    'do-gen-sdf': function(event, param) {
        try {
            let selection = Editor.Selection.curSelection('asset');
            if (selection.length === 0) {
                event.reply("未选中图片文件");
                return;
            }

            let uuid = selection[0];
            if (!isPngFile(uuid)) {
                event.reply("未选中图片文件");
                return;
            }

            let path = Editor.assetdb.remote.uuidToFspath(uuid);
            let Generator = require("./SDFGenerator");
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
