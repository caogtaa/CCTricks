import GTSimpleSpriteAssembler2D from "../GTSimpleSpriteAssembler2D";

//@ts-ignore
let gfx = cc.gfx;
var vfmtCustom = new gfx.VertexFormat([
    { name: gfx.ATTR_POSITION, type: gfx.ATTR_TYPE_FLOAT32, num: 2 },
    { name: gfx.ATTR_UV0, type: gfx.ATTR_TYPE_FLOAT32, num: 2 },        // texture纹理uv
    { name: gfx.ATTR_UV1, type: gfx.ATTR_TYPE_FLOAT32, num: 2 }         // uv起点坐标
]);

const VEC2_ZERO = cc.Vec2.ZERO;

export default class PieceMaskAssembler extends GTSimpleSpriteAssembler2D {
    verticesCount = 4;
    indicesCount = 6;
    uvOffset = 2;
    uv1Offset = 4;
    floatsPerVert = 6;

    public bgOffset: cc.Vec2 = VEC2_ZERO;

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

        let bgx = this.bgOffset.x;
        let bgy = this.bgOffset.y;
        srcOffset = 3 * 2;
        for (let i = 0; i < 4; ++i) {
            let dstOffset = floatsPerVert * i + uvOffset;
            // fill uv1
            verts[dstOffset + 2] = uv[srcOffset];
            verts[dstOffset + 3] = uv[srcOffset + 1];
            // verts[dstOffset + 2] = bgx;
            // verts[dstOffset + 3] = bgy;
        }
    }

    updateColor(sprite) {
        // 由于已经去掉了color字段，这里重载原方法，并且不做任何事
    }

    initData() {
        let data = this._renderData;

        // todo: 确定这里传递total verticesFloats还是verticesFloats in 1
        //@ts-ignore
        data.createFlexData(0, this.verticesCount /*this.verticesFloats*/, this.indicesCount, this.getVfmt());

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

    // initLocal() {
    //     this._local = { x: [], y: []};
    // }

    getBuffer() {
        //@ts-ignore
        return cc.renderer._handle.getBuffer("mesh", this.getVfmt());
        // return cc.renderer._handle._meshBuffer;
    }
}

// cc.game.on(cc.game.EVENT_ENGINE_INITED, function () {
//     // 不管是否原生环境，都进行替换
//     //@ts-ignore
//     MovingBGAssembler.prototype.updateWorldVerts = cc.Sprite.__assembler__.Tiled.prototype.updateWorldVerts;
// });
