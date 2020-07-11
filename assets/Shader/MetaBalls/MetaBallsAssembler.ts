import GTAssembler2D from "../GTAssembler2D";

let gfx = cc.gfx;
var vfmtPos = new gfx.VertexFormat([
    { name: gfx.ATTR_POSITION, type: gfx.ATTR_TYPE_FLOAT32, num: 2 }
]);

export default class MetaBallsAssembler extends cc.Assembler {
    public particles;

    // protected _lastFrameParticleCount: number = 0;
    // protected _indicesCache = null;

    init(comp: cc.RenderComponent) {
        super.init(comp);
    }

    initData() {
        // do nothing   
    }

    updateColor(comp, color) {
        // do nothing
    }

    updateUVs(comp) {
        // do nothing
    }

    updateVerts(comp) {
        // do nothing
    }

    getVfmt() {
        return vfmtPos;
    }

    getBuffer() {
        //@ts-ignore
        return cc.renderer._handle.getBuffer("mesh", this.getVfmt());
    }

    fillBuffers(comp, renderer) {
        let particles = this.particles;
        let particleCount = particles?.GetParticleCount();
        if (!particleCount)
            return;

        // TODO: 简化为按照三角形渲染
        let verticesCount = particleCount * 4;
        let indicesCount = particleCount * 6;
        let PTM_RATIO = cc.PhysicsManager.PTM_RATIO;
		let posBuff = particles.GetPositionBuffer();
        let r = particles.GetRadius() * PTM_RATIO;
        
        //@ts-ignore
        let buffer = this.getBuffer(/*renderer*/);
        let offsetInfo = buffer.request(verticesCount, indicesCount);

        let vertexOffset = offsetInfo.byteOffset >> 2,
            vbuf = buffer._vData;

        // fill vertices
        // 暂时不考虑buffer满的情况
        for (let i = 0; i < particleCount; ++i) {
            let x = posBuff[i].x * PTM_RATIO;
            let y = posBuff[i].y * PTM_RATIO;

            // left-bottom
            vbuf[vertexOffset++] = x - r;
            vbuf[vertexOffset++] = y + r;

            // right-bottom
            vbuf[vertexOffset++] = x + r;
            vbuf[vertexOffset++] = y + r;

            // left-top
            vbuf[vertexOffset++] = x - r;
            vbuf[vertexOffset++] = y - r;

            // right-top
            vbuf[vertexOffset++] = x + r;
            vbuf[vertexOffset++] = y - r;
        }

        // 仅当顶点索引发生变化时计算? 
        // vertexOffset是动态的，每一帧都有可能有差异，无法批量拷贝
        let ibuf = buffer._iData,
        indiceOffset = offsetInfo.indiceOffset,
        vertexId = offsetInfo.vertexOffset;             // vertexId是已经在buffer里的顶点数，也是当前顶点序号的基数

        for (let i = 0; i < particleCount; ++i) {
            ibuf[indiceOffset++] = vertexId;
            ibuf[indiceOffset++] = vertexId + 1;
            ibuf[indiceOffset++] = vertexId + 2;
            ibuf[indiceOffset++] = vertexId + 1;
            ibuf[indiceOffset++] = vertexId + 3;
            ibuf[indiceOffset++] = vertexId + 2;
            vertexId += 4;
        }


        // // fill vertices
        // let vertexOffset = offsetInfo.byteOffset >> 2,
        //     vbuf = buffer._vData;

        // if (vData.length + vertexOffset > vbuf.length) {
        //     vbuf.set(vData.subarray(0, vbuf.length - vertexOffset), vertexOffset);
        // } else {
        //     vbuf.set(vData, vertexOffset);
        // }

        // // fill indices
        // let ibuf = buffer._iData,
        //     indiceOffset = offsetInfo.indiceOffset,
        //     vertexId = offsetInfo.vertexOffset;             // vertexId是已经在buffer里的顶点数，也是当前顶点序号的基数
        // for (let i = 0, l = iData.length; i < l; i++) {
        //     ibuf[indiceOffset++] = vertexId + iData[i];
        // }
    }
}
