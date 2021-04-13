// Copyright 2020 Cao Gaoting<caogtaa@gmail.com>
// https://caogtaa.github.io
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

/*
 * Date: 2020-08-19 21:18:54
 * LastEditors: GT<caogtaa@gmail.com>
 * LastEditTime: 2021-04-13 12:08:08
*/ 

import GTAutoFitSpriteAssembler2D from "../../../../Shader/GTAutoFitSpriteAssembler2D";

//@ts-ignore
let gfx = cc.gfx;
var vfmtPosUvUv = new gfx.VertexFormat([
    { name: gfx.ATTR_POSITION, type: gfx.ATTR_TYPE_FLOAT32, num: 2 },
    { name: gfx.ATTR_UV0, type: gfx.ATTR_TYPE_FLOAT32, num: 2 },
    { name: "a_mask_uv", type: gfx.ATTR_TYPE_FLOAT32, num: 2 }
]);

export default class SpriteMaskedAvatarAssembler extends GTAutoFitSpriteAssembler2D {
    maskUvOffset = 4;
    floatsPerVert = 6;

    // todo: mixin this part
    initData() {
        let data = this._renderData;
        // createFlexData支持创建指定格式的renderData
        data.createFlexData(0, this.verticesCount, this.indicesCount, this.getVfmt());

        // createFlexData不会填充顶点索引信息，手动补充一下
        let indices = data.iDatas[0];
        let count = indices.length / 6;
        for (let i = 0, idx = 0; i < count; i++) {
            let vertextID = i * 4;
            indices[idx++] = vertextID;
            indices[idx++] = vertextID+1;
            indices[idx++] = vertextID+2;
            indices[idx++] = vertextID+1;
            indices[idx++] = vertextID+3;
            indices[idx++] = vertextID+2;
        }
    }

    getVfmt() {
        return vfmtPosUvUv;
    }

    getBuffer() {
        //@ts-ignore
        return cc.renderer._handle.getBuffer("mesh", this.getVfmt());
    }

    updateColor(comp, color) {
        // do nothing
    }

    updateUVs(sprite) {
        super.updateUVs(sprite);

        let maskUvOffset = this.maskUvOffset;
        let floatsPerVert = this.floatsPerVert;
        let verts = this._renderData.vDatas[0];
        let maskUv = sprite._mask.uv;
        for (let i = 0; i < 4; i++) {
            let srcOffset = i * 2;
            let dstOffset = floatsPerVert * i + maskUvOffset;
            verts[dstOffset] = maskUv[srcOffset];
            verts[dstOffset + 1] = maskUv[srcOffset + 1];
        }
    }
}
