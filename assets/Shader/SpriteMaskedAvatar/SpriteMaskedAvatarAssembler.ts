// Copyright 2020 Cao Gaoting<caogtaa@gmail.com>
// https://caogtaa.github.io
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

/*
 * Date: 2020-07-22 01:42:00
 * LastEditors: GT<caogtaa@gmail.com>
 * LastEditTime: 2020-07-22 14:03:56
*/ 

import AvatarAssembler from "../Avatar/AvatarAssembler";

//@ts-ignore
let gfx = cc.gfx;
var vfmtCustom = new gfx.VertexFormat([
    { name: gfx.ATTR_POSITION, type: gfx.ATTR_TYPE_FLOAT32, num: 2 },
    { name: "a_mask_uv", type: gfx.ATTR_TYPE_FLOAT32, num: 2 },
    { name: gfx.ATTR_UV0, type: gfx.ATTR_TYPE_FLOAT32, num: 2 },
    { name: "a_xmap", type: gfx.ATTR_TYPE_FLOAT32, num: 2 },
    { name: "a_ymap", type: gfx.ATTR_TYPE_FLOAT32, num: 2 }
]);

export default class SpriteMaskedAvatarAssembler extends AvatarAssembler {
    maskOffset = 2;
    uvOffset = 4;
    floatsPerVert = 10;

    getVfmt() {
        return vfmtCustom;
    }

    updateUVs(sprite) {
        super.updateUVs(sprite);

        let maskSpriteFrame = sprite._mask;
        if (maskSpriteFrame) {
            let uv = maskSpriteFrame.uv;
            let maskOffset = this.maskOffset;
            let floatsPerVert = this.floatsPerVert;
            let verts = this._renderData.vDatas[0];
            for (let i = 0; i < 4; i++) {
                let srcOffset = i * 2;
                let dstOffset = floatsPerVert * i + maskOffset;
                verts[dstOffset] = uv[srcOffset];
                verts[dstOffset + 1] = uv[srcOffset + 1];
            }
        }
    }
}
