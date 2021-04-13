/****************************************************************************
 Author: GT <caogtaa@gmail.com>
 https://caogtaa.github.io
****************************************************************************/

//@ts-ignore
let gfx = cc.gfx;
var vfmtPosCenterWeb = new gfx.VertexFormat([
    { name: gfx.ATTR_POSITION, type: gfx.ATTR_TYPE_FLOAT32, num: 2 },   // 粒子顶点（1个粒子有3个或4个顶点）
    { name: "a_center", type: gfx.ATTR_TYPE_FLOAT32, num: 2 }           // 原粒子中心（每个顶点相同数据）
]);

var vfmtPosCenterNative = new gfx.VertexFormat([
    { name: gfx.ATTR_POSITION, type: gfx.ATTR_TYPE_FLOAT32, num: 2 },   // 粒子顶点（1个粒子有3个或4个顶点）
    { name: "a_corner", type: gfx.ATTR_TYPE_FLOAT32, num: 2 },          // a_position的冗余，a_position在native是个大坑
    { name: "a_center", type: gfx.ATTR_TYPE_FLOAT32, num: 2 }           // 原粒子中心（每个顶点相同数据）
]);

export default class MetaBallsAssembler extends cc.Assembler {
    verticesCount = 0;
    indicesCount = 0;
    floatsPerVert = CC_NATIVERENDERER ? 6 : 4;

    public particles;

    protected _renderData: cc.RenderData = null;
    protected _prevVerticesCount: number = 0;

    init(comp: cc.RenderComponent) {
        super.init(comp);

        this._renderData = new cc.RenderData();
        this._renderData.init(this);
    }

    // initData() {
    //     // do nothing
    // }

    updateColor(comp, color) {
        // do nothing
    }

    updateUVs(comp) {
        // do nothing
    }

    updateVerts(comp) {
        if (!CC_NATIVERENDERER) {
            // web模式直接在fillbuffer里做所有操作，不经过RenderData缓存
            return;
        }

        let particles = this.particles;
        let PTM_RATIO = cc.PhysicsManager.PTM_RATIO;
		let posBuff = particles.GetPositionBuffer();
        let r = particles.GetRadius() * PTM_RATIO * 3;      // 倍数扩大渲染距离，超出r的范围颜色衰减
        let particleCount = this.particles.GetParticleCount();
        let verts = this._renderData.vDatas[0];

        let xoffset = comp.node.width * comp.node.anchorX;
        let yoffset = comp.node.height * comp.node.anchorY;

        // fill vertices
        // 暂时不考虑buffer满的情况
        let vertexOffset = 0;
        for (let i = 0; i < particleCount; ++i) {
            let x = posBuff[i].x * PTM_RATIO - xoffset;
            let y = posBuff[i].y * PTM_RATIO - yoffset;

            // left-bottom
            verts[vertexOffset++] = x - r;
            verts[vertexOffset++] = y + r;
            verts[vertexOffset++] = x - r;
            verts[vertexOffset++] = y + r;
            verts[vertexOffset++] = x;
            verts[vertexOffset++] = y;

            // right-bottom
            verts[vertexOffset++] = x + r;
            verts[vertexOffset++] = y + r;
            verts[vertexOffset++] = x + r;
            verts[vertexOffset++] = y + r;
            verts[vertexOffset++] = x;
            verts[vertexOffset++] = y;

            // left-top
            verts[vertexOffset++] = x - r;
            verts[vertexOffset++] = y - r;
            verts[vertexOffset++] = x - r;
            verts[vertexOffset++] = y - r;
            verts[vertexOffset++] = x;
            verts[vertexOffset++] = y;

            // right-top
            verts[vertexOffset++] = x + r;
            verts[vertexOffset++] = y - r;
            verts[vertexOffset++] = x + r;
            verts[vertexOffset++] = y - r;
            verts[vertexOffset++] = x;
            verts[vertexOffset++] = y;
        }
    }

    updateRenderData(comp) {
        if (!CC_NATIVERENDERER) {
            return;
        }

        let particleCount = this.particles?.GetParticleCount();
        if (!particleCount)
            return;

        if (this._prevVerticesCount != particleCount) {
            this._prevVerticesCount = particleCount;

            // rebuild render data
            this.verticesCount = particleCount * 4;
            this.indicesCount = particleCount * 6;

            let data = this._renderData;
            data.createFlexData(0, this.verticesCount, this.indicesCount, this.getVfmt());

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

        if (comp._vertsDirty) {
            this.updateVerts(comp);
            comp._vertsDirty = false;
        }        
    }

    getVfmt() {
        if (CC_NATIVERENDERER)
            return vfmtPosCenterNative;
        
        return vfmtPosCenterWeb;
    }

    getBuffer() {
        //@ts-ignore
        return cc.renderer._handle.getBuffer("mesh", this.getVfmt());
    }

    fillBuffers(comp, renderer) {
        if (CC_NATIVERENDERER) {
            // 仅对web实现
            // native由于fillBuffer实现在了C++层，需要使用RenderData做缓存
            return;
        }

        let particles = this.particles;
        let particleCount = particles?.GetParticleCount();
        if (!particleCount)
            return;

        // TODO: 简化为按照三角形渲染
        let verticesCount = particleCount * 4;
        let indicesCount = particleCount * 6;
        let PTM_RATIO = cc.PhysicsManager.PTM_RATIO;
		let posBuff = particles.GetPositionBuffer();
        let r = particles.GetRadius() * PTM_RATIO * 3;      // 倍数扩大渲染距离，超出r的范围颜色衰减
        
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
            vbuf[vertexOffset++] = x;
            vbuf[vertexOffset++] = y;

            // right-bottom
            vbuf[vertexOffset++] = x + r;
            vbuf[vertexOffset++] = y + r;
            vbuf[vertexOffset++] = x;
            vbuf[vertexOffset++] = y;

            // left-top
            vbuf[vertexOffset++] = x - r;
            vbuf[vertexOffset++] = y - r;
            vbuf[vertexOffset++] = x;
            vbuf[vertexOffset++] = y;

            // right-top
            vbuf[vertexOffset++] = x + r;
            vbuf[vertexOffset++] = y - r;
            vbuf[vertexOffset++] = x;
            vbuf[vertexOffset++] = y;
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
    }
}
