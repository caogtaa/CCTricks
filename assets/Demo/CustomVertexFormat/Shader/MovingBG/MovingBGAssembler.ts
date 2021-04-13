// Copyright 2020 Cao Gaoting<caogtaa@gmail.com>
// https://caogtaa.github.io
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

import GTSimpleSpriteAssembler2D from "../../../../Shader/GTSimpleSpriteAssembler2D";

/*
 * Date: 2020-07-13 02:44:17
 * LastEditors: GT<caogtaa@gmail.com>
 * LastEditTime: 2020-07-22 14:03:25
*/ 



// 自定义顶点格式，在vfmtPosUvColor基础上，加入gfx.ATTR_UV1，去掉gfx.ATTR_COLOR
// 20200703 增加了uv2, uv3用于处理uv在图集里的映射
//@ts-ignore
let gfx = cc.gfx;
var vfmtCustom = new gfx.VertexFormat([
    { name: gfx.ATTR_POSITION, type: gfx.ATTR_TYPE_FLOAT32, num: 2 },
    { name: gfx.ATTR_UV0, type: gfx.ATTR_TYPE_FLOAT32, num: 2 },        // texture纹理uv
    { name: gfx.ATTR_UV1, type: gfx.ATTR_TYPE_FLOAT32, num: 2 },        // uv1，控制图片滚动方向 & 速度
    { name: "a_p", type: gfx.ATTR_TYPE_FLOAT32, num: 2 },               // uv remap到 [0, 1]区间用的中间变量
    { name: "a_q", type: gfx.ATTR_TYPE_FLOAT32, num: 2 }                // 同上
]);

const VEC2_ZERO = cc.Vec2.ZERO;

export default class MovingBGAssembler extends GTSimpleSpriteAssembler2D {
    // 根据自定义顶点格式，调整下述常量
    verticesCount = 4;
    indicesCount = 6;
    uvOffset = 2;
    uv1Offset = 4;
    uv2Offset = 6;
    uv3Offset = 8;
    floatsPerVert = 10;

    // 自定义数据，将被写入uv1的位置
    public moveSpeed: cc.Vec2 = VEC2_ZERO;
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

    // 自定义格式以getVfmt()方式提供出去，除了当前assembler，render-flow的其他地方也会用到
    getVfmt() {
        return vfmtCustom;
    }

    // 重载getBuffer(), 返回一个能容纳自定义顶点数据的buffer
    // 默认fillBuffers()方法中会调用到
    getBuffer() {
        //@ts-ignore
        return cc.renderer._handle.getBuffer("mesh", this.getVfmt());
    }

    // pos数据没有变化，不用重载
    // updateVerts(sprite) {
    // }

    updateColor(sprite, color) {
        // 由于已经去掉了color字段，这里重载原方法，并且不做任何事
    }


    updateUVs(sprite) {
        super.updateUVs(sprite);
        let uv = sprite._spriteFrame.uv;
        let uvOffset = this.uvOffset;
        let floatsPerVert = this.floatsPerVert;
        let verts = this._renderData.vDatas[0];
        let dstOffset;

        let l = uv[0],
            r = uv[2],
            t = uv[5],
            b = uv[1];

        // px, qx用于x轴的uv映射
        // py, qy同理，公式推导过程略...
        let px = 1.0 / (r-l),
            qx = -l * px;   // l / (l-r);

        let py = 1.0 / (b-t),
            qy = -t * py;   // t / (t-b);

        let sx = this.moveSpeed.x;
        let sy = this.moveSpeed.y;
        for (let i = 0; i < 4; ++i) {
            dstOffset = floatsPerVert * i + uvOffset;
            // fill uv1
            verts[dstOffset + 2] = sx;
            verts[dstOffset + 3] = sy;

            // fill uv2
            verts[dstOffset + 4] = px;
            verts[dstOffset + 5] = py;

            // fill uv3
            verts[dstOffset + 6] = qx;
            verts[dstOffset + 7] = qy;
        }
    }
}
