/****************************************************************************
 Author: GT <caogtaa@gmail.com>
 https://caogtaa.github.io
****************************************************************************/

import GTSimpleSpriteAssembler2D from "../GTSimpleSpriteAssembler2D";

//@ts-ignore
let gfx = cc.gfx;
var vfmtCustom = new gfx.VertexFormat([
    { name: gfx.ATTR_POSITION, type: gfx.ATTR_TYPE_FLOAT32, num: 2 },
    { name: gfx.ATTR_UV0, type: gfx.ATTR_TYPE_FLOAT32, num: 2 },
    { name: "a_xmap", type: gfx.ATTR_TYPE_FLOAT32, num: 2 },
    { name: "a_ymap", type: gfx.ATTR_TYPE_FLOAT32, num: 2 }
]);

export default class AvatarAssembler extends GTSimpleSpriteAssembler2D {
    floatsPerVert = 8;

    private _uv = [];

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

        let px = 1.0 / (r-l),
        qx = -l * px;   // l / (l-r);

        let py = 1.0 / (b-t),
        qy = -t * py;   // t / (t-b);

        let uvOffset = this.uvOffset;
        let floatsPerVert = this.floatsPerVert;
        let verts = this._renderData.vDatas[0];
        for (let i = 0; i < 4; i++) {
            let srcOffset = i * 2;
            let dstOffset = floatsPerVert * i + uvOffset;
            verts[dstOffset] = uv[srcOffset];
            verts[dstOffset + 1] = uv[srcOffset + 1];
            if (isRotated) {
                verts[dstOffset + 2] = py;
                verts[dstOffset + 3] = qy;
                verts[dstOffset + 4] = px;
                verts[dstOffset + 5] = qx;
            } else {
                verts[dstOffset + 2] = px;
                verts[dstOffset + 3] = qx;
                verts[dstOffset + 4] = py;
                verts[dstOffset + 5] = qy;
            }
        }
    }
}
