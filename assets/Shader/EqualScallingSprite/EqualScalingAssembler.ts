import GTSimpleSpriteAssembler2D from "../GTSimpleSpriteAssembler2D";


export default class EqualScalingAssembler extends GTSimpleSpriteAssembler2D {
    private _uv = [];

    updateUVs(sprite) {
        // uv顺序和rect已经旋转对齐，此处不需要主动考虑旋转
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
        if (wscale > hscale) {
            // fit height
            let ratio = hscale / wscale;
            let l = uv[0], r = uv[2];
            let c = (l+r) * 0.5;
            let half = (r-l) * 0.5 * ratio;
            uv[0] = uv[4] = c - half;
            uv[2] = uv[6] = c + half;
        } else {
            // fit width
            let ratio = wscale / hscale;
            let b = uv[1], t = uv[5];
            let c = (b+t) * 0.5;
            let half = (b-t) * 0.5 * ratio;
            uv[1] = uv[3] = c + half;
            uv[5] = uv[7] = c - half;
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
