// Copyright 2020 Cao Gaoting<caogtaa@gmail.com>
// https://caogtaa.github.io
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

/*
 * Date: 2020-07-21 16:23:10
 * LastEditors: GT<caogtaa@gmail.com>
 * LastEditTime: 2020-07-22 14:04:52
*/ 

import GTSimpleSpriteAssembler2D from "./GTSimpleSpriteAssembler2D";

export default class GTAutoFitSpriteAssembler2D extends GTSimpleSpriteAssembler2D {
    protected _uv = [];

    updateUVs(sprite) {
        let rect: cc.Rect = sprite._spriteFrame.getRect();
        let node: cc.Node = sprite.node;
        if (!rect.width || !rect.height || !node.width || !node.height) {
            super.updateUVs(sprite);
            return;
        }

        Object.assign(this._uv, sprite._spriteFrame.uv);

        let uv = this._uv;
        let wscale = rect.width / node.width;
        let hscale = rect.height / node.height;
        let ratio: number = 1.0;
        let isRotated = sprite._spriteFrame.isRotated();
        let l = uv[0],
            r = uv[2],
            b = uv[1],
            t = uv[5];
        
        if (isRotated) {
            // cc图集里的旋转总是顺时针旋转90度，以原左下角为中心。（旋转后左下角变为左上角）
            l = uv[1];  r = uv[3];
            b = uv[0];  t = uv[4];
        }

        // 图片在等比缩放的前提下自适应容器大小
        if (wscale > hscale) {
            // fit height
            ratio = hscale / wscale;
            let ro = isRotated ? 1 : 0;
            let c = (l+r) * 0.5;
            let half = (r-l) * 0.5 * ratio;
            l = uv[0+ro] = uv[4+ro] = c - half;
            r = uv[2+ro] = uv[6+ro] = c + half;
        } else {
            // fit width
            ratio = wscale / hscale;
            let ro = isRotated ? -1 : 0;
            let c = (b+t) * 0.5;
            let half = (b-t) * 0.5 * ratio;
            b = uv[1+ro] = uv[3+ro] = c + half;
            t = uv[5+ro] = uv[7+ro] = c - half;
        }

        let uvOffset = this.uvOffset;
        let floatsPerVert = this.floatsPerVert;
        let verts = this._renderData.vDatas[0];
        for (let i = 0; i < 4; i++) {
            let srcOffset = i * 2;
            let dstOffset = floatsPerVert * i + uvOffset;
            verts[dstOffset] = uv[srcOffset];
            verts[dstOffset + 1] = uv[srcOffset + 1];
        }
    }
}
