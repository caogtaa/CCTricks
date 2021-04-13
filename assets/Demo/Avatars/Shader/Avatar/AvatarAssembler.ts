// Copyright 2020 Cao Gaoting<caogtaa@gmail.com>
// https://caogtaa.github.io
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

/*
 * Date: 2020-07-21 17:27:48
 * LastEditors: GT<caogtaa@gmail.com>
 * LastEditTime: 2020-07-23 16:46:05
*/ 

import GTAutoFitSpriteAssembler2D from "../../../../Shader/GTAutoFitSpriteAssembler2D";

//@ts-ignore
let gfx = cc.gfx;
var vfmtCustom = new gfx.VertexFormat([
    { name: gfx.ATTR_POSITION, type: gfx.ATTR_TYPE_FLOAT32, num: 2 },
    { name: gfx.ATTR_UV0, type: gfx.ATTR_TYPE_FLOAT32, num: 2 },
    { name: "a_p", type: gfx.ATTR_TYPE_FLOAT32, num: 2 },
    { name: "a_q", type: gfx.ATTR_TYPE_FLOAT32, num: 2 }
]);

export default class AvatarAssembler extends GTAutoFitSpriteAssembler2D {
    floatsPerVert = 8;

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
        return vfmtCustom;
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

        // this._uv可以用sprite._spriteFrame.uv代替
        // this._uv是spriteFrame对node大小自适应缩放后的uv
        let uv = this._uv;
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

        let px = 1.0 / (r-l),
        qx = -l * px;   // l / (l-r);

        let py = 1.0 / (b-t),
        qy = -t * py;   // t / (t-b);

        let uvOffset = this.uvOffset;
        let floatsPerVert = this.floatsPerVert;
        let verts = this._renderData.vDatas[0];
        for (let i = 0; i < 4; i++) {
            let dstOffset = floatsPerVert * i + uvOffset;
            if (isRotated) {
                verts[dstOffset + 2] = py;
                verts[dstOffset + 3] = px;
                verts[dstOffset + 4] = qy;
                verts[dstOffset + 5] = qx;
            } else {
                verts[dstOffset + 2] = px;
                verts[dstOffset + 3] = py;
                verts[dstOffset + 4] = qx;
                verts[dstOffset + 5] = qy;
            }
        }
    }
}
