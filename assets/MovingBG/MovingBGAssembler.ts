import GTSimpleSpriteAssembler2D from "../GTSimpleSpriteAssembler2D";

// 自定义顶点格式，在vfmtPosUvColor基础上，加入gfx.ATTR_UV1，去掉gfx.ATTR_COLOR
let gfx = cc.gfx;
var vfmtCustom = new gfx.VertexFormat([
    { name: gfx.ATTR_POSITION, type: gfx.ATTR_TYPE_FLOAT32, num: 2 },
    { name: gfx.ATTR_UV0, type: gfx.ATTR_TYPE_FLOAT32, num: 2 },        // texture纹理uv
    { name: gfx.ATTR_UV1, type: gfx.ATTR_TYPE_FLOAT32, num: 2 }         // uv起点坐标
]);

const VEC2_ZERO = cc.Vec2.ZERO;

export default class MovingBGAssembler extends GTSimpleSpriteAssembler2D {
    // 根据自定义顶点格式，调整下述常量
    verticesCount = 4;
    indicesCount = 6;
    uvOffset = 2;
    uv1Offset = 4;
    floatsPerVert = 6;

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
        return cc.renderer._handle.getBuffer("mesh", this.getVfmt());
    }

    // pos数据没有变化，不用重载
    // updateVerts(sprite) {
    // }

    updateColor(sprite) {
        // 由于已经去掉了color字段，这里重载原方法，并且不做任何事
    }


    updateUVs(sprite) {
        let uv = sprite._spriteFrame.uv;
        let uvOffset = this.uvOffset;
        let floatsPerVert = this.floatsPerVert;
        let verts = this._renderData.vDatas[0];
        let srcOffset, dstOffset;
        for (let i = 0; i < 4; i++) {
            srcOffset = i * 2;
            dstOffset = floatsPerVert * i + uvOffset;
            verts[dstOffset] = uv[srcOffset];
            verts[dstOffset + 1] = uv[srcOffset + 1];
        }

        let sx = this.moveSpeed.x;
        let sy = this.moveSpeed.y;
        for (let i = 0; i < 4; ++i) {
            dstOffset = floatsPerVert * i + uvOffset;
            // fill uv1
            verts[dstOffset + 2] = sx;
            verts[dstOffset + 3] = sy;
        }
    }

}

// cc.game.on(cc.game.EVENT_ENGINE_INITED, function () {
//     // 不管是否原生环境，都进行替换
//     //@ts-ignore
//     MovingBGAssembler.prototype.updateWorldVerts = cc.Sprite.__assembler__.Tiled.prototype.updateWorldVerts;
// });
