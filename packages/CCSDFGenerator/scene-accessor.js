// Copyright 2021 Cao Gaoting<caogtaa@gmail.com>
// https://caogtaa.github.io
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

/*
 * Date: 2021-05-20 20:45:01
 * @LastEditors: GT<caogtaa@gmail.com>
 * @LastEditTime: 2021-07-03 00:19:49
*/ 

// let fs = require("fs");
// let PNG = require("pngjs").PNG;

const Path = require("path");
const Fs = require("fs");
const Png = require("./pngjs/lib/png").PNG;

function isPngFile(uuid) {
    let filePath = Editor.assetdb.remote.uuidToFspath(uuid);
    let ext = Path.extname(filePath);
    return ['.png'].includes(ext);
}

function Extend(imgData, width, height, extend) {
    if (extend === 0)
        return imgData;

    let newWidth = width + 2 * extend;
    let newHeight = height + 2 * extend;
    let result = new Uint8Array(newWidth * newHeight * 4);
    for (let i = 0; i < height; ++i) {
        let srcOffset = i * width * 4;
        let dstOffset = ((i + extend) * newWidth + extend) * 4;
        result.set(imgData.subarray(srcOffset, srcOffset + width * 4), dstOffset);
    }

    return result;
}

function SaveSDFTexture(imgData, width, height, outputPath) {
    let output = new Png({
        // colorType: 6,
        // inputColorType: 6,
        width: width,
        height: height
    });

    output.data = imgData;
    output.pack().pipe(Fs.createWriteStream(outputPath));
}

// @ts-ignore
module.exports = {
    'do-gen-sdf': function(event, param) {
        try {
            let selection = Editor.Selection.curSelection('asset');
            if (selection.length === 0) {
                event.reply("[SDF-GEN] 未选中图片文件");
                return;
            }

            let uuid = selection[0];
            if (!isPngFile(uuid)) {
                event.reply("[SDF-GEN] 未选中图片文件");
                return;
            }

            let inputPath = Editor.assetdb.remote.uuidToFspath(uuid);
            let SDF = require("./SDF").SDF;
            let sdf = new SDF;

            // read image data from path
            let data = Fs.readFileSync(inputPath);
            let png = Png.sync.read(data);
            let imgData = png.data;
            let width = png.width;
            let height = png.height;
            
            // extend imgData
            // same config as SceneSDF.ts
            let sdfRadius = Math.max(60, height / 3);
            let cutoff = 0.5;
            let extend = Math.floor(sdfRadius * (1-cutoff));

            // extend image
            let newImgData = Extend(imgData, width, height, extend);
            let newWidth = width + 2 * extend;
            let newHeight = height + 2 * extend;
            let alpha32 = sdf.RenderSDFToData(newImgData, newWidth, newHeight, sdfRadius, cutoff);

            const dir = Path.dirname(inputPath);
            const ext = Path.extname(inputPath);
            const baseName = Path.basename(inputPath, ext);
            const outputPath = Path.join(dir, baseName + "-sdf.png");
            SaveSDFTexture(alpha32, newWidth, newHeight, outputPath);
            Editor.Ipc.sendToMain("sdf-generator:on-gen-finished", outputPath);

            event.reply(null);
        } catch (e) {
            Editor.log(e);
            event.reply(null);
        } finally {
            
        }
    }
};
