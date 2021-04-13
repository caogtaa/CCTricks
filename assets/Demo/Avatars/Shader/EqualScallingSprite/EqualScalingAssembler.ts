// Copyright 2020 Cao Gaoting<caogtaa@gmail.com>
// https://caogtaa.github.io
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

/*
 * Date: 2020-07-21 16:23:10
 * LastEditors: GT<caogtaa@gmail.com>
 * LastEditTime: 2020-07-22 14:00:52
*/ 

import GTSimpleSpriteAssembler2D from "../../../../Shader/GTSimpleSpriteAssembler2D";

export default class EqualScalingAssembler extends GTSimpleSpriteAssembler2D {
    private _uv = [];

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
        if (wscale > hscale) {
            // fit height
            ratio = hscale / wscale;
            let ro = sprite._spriteFrame.isRotated() ? 1 : 0;
            let l = uv[0+ro], r = uv[2+ro];
            let c = (l+r) * 0.5;
            let half = (r-l) * 0.5 * ratio;
            uv[0+ro] = uv[4+ro] = c - half;
            uv[2+ro] = uv[6+ro] = c + half;
        } else {
            // fit width
            ratio = wscale / hscale;
            let ro = sprite._spriteFrame.isRotated() ? -1 : 0;
            let b = uv[1+ro], t = uv[5+ro];
            let c = (b+t) * 0.5;
            let half = (b-t) * 0.5 * ratio;
            uv[1+ro] = uv[3+ro] = c + half;
            uv[5+ro] = uv[7+ro] = c - half;
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
