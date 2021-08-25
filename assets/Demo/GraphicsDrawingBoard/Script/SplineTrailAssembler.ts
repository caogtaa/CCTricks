

import { SplineTrailRenderer } from './SplineTrailRenderer';

//@ts-ignore
let gfx = cc.gfx;
let vfmtSplineTrail = new gfx.VertexFormat([
    { name: 'a_position', type: gfx.ATTR_TYPE_FLOAT32, num: 2 },
    { name: 'a_width', type: gfx.ATTR_TYPE_FLOAT32, num: 1 },		// 旁侧相对于中心线的距离，范围（0, segmentWidth）
    { name: 'a_dist', type: gfx.ATTR_TYPE_FLOAT32, num: 1 },		// 距离线段起始点的距离（累积线段长度）
    { name: gfx.ATTR_COLOR, type: gfx.ATTR_TYPE_UINT8, num: 4, normalize: true },       // 4个uint8
]);

export class SplineTrailRendererAssembler extends cc.Assembler {
    public useWorldPos: boolean = true;         // 表示从component里获取的坐标是世界坐标
    protected _worldDatas: any = {};
    protected _renderNode: cc.Node = null;

    protected _floatsPerVert: number = 2;       // update by vfmt
    protected _renderData: cc.RenderData = null;
    protected _splineTrailComp: SplineTrailRenderer = null;
    protected _flexBuffer: cc.FlexBuffer = null;

    init(comp: SplineTrailRenderer) {
        super.init(comp);

        this._splineTrailComp = comp;
        this._worldDatas = {};
        this._renderNode = null;
        this._floatsPerVert = this.getVfmt()._bytes >> 2;

        let data = this._renderData = new cc.RenderData();
        data.init(this);

        this.initData();
        // Note: 如果不是用quad渲染，对应的vdata, idata大小不一样
        // this._flexBuffer = data.createFlexData(0, initVertexCount * 4, initVertexCount * 6, this.getVfmt());

        // todo: 初始化idata，quad模式下idata分布规则是固定的
    }

    initData() {
        // 先创建初始化一个固定大小的buffer
        let initQuadCount = 50;
        let data = this._renderData;
        data.createFlexData(0, initQuadCount * 4, initQuadCount * 6, this.getVfmt());
        this._flexBuffer = data._flexBuffer;
    }

    updateRenderData(comp: SplineTrailRenderer) {
        if (comp._vertsDirty) {
            // this.updateVerts(comp);
            // todo: fetch vertex data
            let vertices = comp._vertices;
            let vertexCount = vertices.length;
            let indicesCount = vertexCount / 4 * 6;

            let flexBuffer = this._flexBuffer;
            flexBuffer.reserve(vertexCount, indicesCount);
            flexBuffer.used(vertexCount, indicesCount);

            this.updateVerts(comp);

            // todo: optimize idata update, do no update old part
            this.initQuadIndices(flexBuffer.iData, indicesCount);
            comp._vertsDirty = false;
        }
    }

    initQuadIndices(indices, len) {
        let count = len / 6;
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

    updateVerts(comp: SplineTrailRenderer) {
        let floatsPerVert = this._floatsPerVert;
        let vertices = comp._vertices;
        let sideDist = comp._sideDist;
        let dist = comp._dist;

        let vertexCount = vertices.length;

        let vData = this._flexBuffer.vData;
        let baseIndex: number = 0;
        for (let i=0, n=vertexCount; i<n; ++i) {
            baseIndex = i * floatsPerVert;
            vData[baseIndex++] = vertices[i].x;
            vData[baseIndex++] = vertices[i].y;
            vData[baseIndex++] = sideDist[i];
            vData[baseIndex++] = dist[i];
            // vData[baseIndex++] = color[i];
        }

        
        this.updateWorldVerts(comp);
    }

    updateWorldVerts(comp) {
        if (CC_NATIVERENDERER) {
            // Native模式
            if (this.useWorldPos) {
                this.updateWorldVertsNative(comp);
            }
        } else {
            // WegGL模式
            // 如果vData表示的是世界坐标，需要转换成节点本地坐标
            if (!this.useWorldPos) {
                this.updateWorldVertsWebGL(comp);
            }
        }
    }

    updateWorldVertsWebGL(comp) {
        let vData = this._flexBuffer.vData;
        let vertexCount = this._flexBuffer.usedVertices;

        let matrix = comp.node._worldMatrix;
        let matrixm = matrix.m,
            a = matrixm[0], b = matrixm[1], c = matrixm[4], d = matrixm[5],
            tx = matrixm[12], ty = matrixm[13];

        // let vl = local[0], vr = local[2],
        //     vb = local[1], vt = local[3];
        
        /*
        m00 = 1, m01 = 0, m02 = 0, m03 = 0,
        m04 = 0, m05 = 1, m06 = 0, m07 = 0,
        m08 = 0, m09 = 0, m10 = 1, m11 = 0,
        m12 = 0, m13 = 0, m14 = 0, m15 = 1
        */
        // [a,b,c,d] = _worldMatrix[1,2,4,5] == [1,0,0,1]
        // _worldMatrix[12,13]是xy的平移量
        // 即世界矩阵的左上角2x2是单元矩阵，说明在2D场景内没有出现旋转或者缩放
        let justTranslate = a === 1 && b === 0 && c === 0 && d === 1;
        justTranslate = true;       // todo: 目前强行认为没有旋转缩放

        let floatsPerVert = this._floatsPerVert;
        if (justTranslate) {
            let baseIndex: number = 0;
            for (let i=0, n=vertexCount; i<n; ++i) {
                baseIndex = i * floatsPerVert;
                vData[baseIndex] += tx;
                vData[baseIndex+1] += ty;
                baseIndex += floatsPerVert;
            }
        } else {
            // // 4对xy分别乘以 [2,2]仿射矩阵，然后+平移量
            // let al = a * vl, ar = a * vr,
            // bl = b * vl, br = b * vr,
            // cb = c * vb, ct = c * vt,
            // db = d * vb, dt = d * vt;

            // // left bottom
            // // newx = vl * a + vb * c + tx
            // // newy = vl * b + vb * d + ty
            // verts[index] = al + cb + tx;
            // verts[index+1] = bl + db + ty;
            // index += floatsPerVert;
            // // right bottom
            // verts[index] = ar + cb + tx;
            // verts[index+1] = br + db + ty;
            // index += floatsPerVert;
            // // left top
            // verts[index] = al + ct + tx;
            // verts[index+1] = bl + dt + ty;
            // index += floatsPerVert;
            // // right top
            // verts[index] = ar + ct + tx;
            // verts[index+1] = br + dt + ty;
        }
    }

    // native场景下使用的updateWorldVerts
    // copy from \jsb-adapter-master\engine\assemblers\assembler-2d.js
    protected _tmpVec2 = cc.v2(0, 0);
    updateWorldVertsNative(comp: SplineTrailRenderer) {
        // 将vdata做一个偏移，偏移量等于所在节点相对于世界坐标原点的偏移
        // 因为Native里的vdata以节点anchor为原点
        // TODO: 考虑旋转缩放
        let baseIndex: number = 0;
        let vData = this._flexBuffer.vData;
        let vertexCount = this._flexBuffer.usedVertices;
        let floatsPerVert = this._floatsPerVert;
        let tmpVec2 = this._tmpVec2;
        tmpVec2.x = tmpVec2.y = 0;

        comp.node.convertToWorldSpaceAR(tmpVec2, tmpVec2);
        let tx = -tmpVec2.x;
        let ty = -tmpVec2.y;
        for (let i=0, n=vertexCount; i<n; ++i) {
            baseIndex = i * floatsPerVert;
            vData[baseIndex] += tx;
            vData[baseIndex+1] += ty;
            baseIndex += floatsPerVert;
        }
    }

    updateColor(comp, color) {
        // do nothing
        let k = 0;
    }

    // not necessary
    // get verticesFloats(): number {
    //     return this._splineTrailComp._vertices.length * vfmtSplineTrail._bytes / 4; 
    // }

    updateUVs(comp) {
        // do nothing
        let k = 0;
    }

    getVfmt() {
        return vfmtSplineTrail;
    }

    getBuffer() {
        //@ts-ignore
        return cc.renderer._handle.getBuffer("mesh", this.getVfmt());
    }

    setRenderNode(node) {
        this._renderNode = node;
    }

        // 将准备好的顶点数据填充进 VertexBuffer 和 IndiceBuffer
    fillBuffers(comp, renderer) {
        let flexBuffer = this._flexBuffer;
        if (!flexBuffer?.usedVertices)
            return;

        let renderData = this._renderData;
        let vData = renderData.vDatas[0];
        let iData = renderData.iDatas[0];

        let buffer = this.getBuffer(/*renderer*/);
        let offsetInfo = buffer.request(flexBuffer.usedVertices, flexBuffer.usedIndices);

        // if (!this.useWorldPos) {
        //     // vData里不是世界坐标，需要做一次转换
        //     if (renderer.worldMatDirty || !this._worldDatas[0]) {
        //         // 从本地坐标更新成世界坐标
        //         this._updateWorldVertices(0, flexBuffer.usedVertices, vData, this.getVfmt(), comp.node._worldMatrix);
        //         vData = this._worldDatas[0];
        //     }
        // }

        // fill vertices
        let vertexOffset = offsetInfo.byteOffset >> 2,
            vbuf = buffer._vData;

        if (vData.length + vertexOffset > vbuf.length) {
            vbuf.set(vData.subarray(0, vbuf.length - vertexOffset), vertexOffset);
        } else {
            vbuf.set(vData, vertexOffset);
        }

        // fill indices
        // 合批的情况下indiceOffset > 0
        let ibuf = buffer._iData,
            indiceOffset = offsetInfo.indiceOffset,
            vertexId = offsetInfo.vertexOffset;             // vertexId是已经在buffer里的顶点数，也是当前顶点序号的基数
        for (let i = 0, l = iData.length; i < l; i++) {
            ibuf[indiceOffset++] = vertexId + iData[i];
        }
    }

    protected _tmpVec3 = new cc.Vec3();
    _updateWorldVertices(dataIndex, vertexCount, local, vtxFormat, wolrdMatrix) {
        let world = this._worldDatas[dataIndex];
        if (!world) {
            world = this._worldDatas[dataIndex] = new Float32Array(local.length);
            // world.set(local);    // not necessary
        }

        let floatCount = vtxFormat._bytes / 4;

        let elements = vtxFormat._elements;
        let tmpVec3 = this._tmpVec3;
        for (let i = 0, n = elements.length; i < n; i++) {
            let element = elements[i];
            let attrOffset = element.offset / 4;

            if (element.name === gfx.ATTR_POSITION || element.name === gfx.ATTR_NORMAL) {
                let transformMat4 = element.name === gfx.ATTR_NORMAL ? cc.Vec3.transformMat4Normal : cc.Vec3.transformMat4;
                for (let j = 0; j < vertexCount; j++) {
                    let offset = j * floatCount + attrOffset;

                    tmpVec3.x = local[offset];
                    tmpVec3.y = local[offset + 1];
                    tmpVec3.z = local[offset + 2];

                    transformMat4(tmpVec3, tmpVec3, wolrdMatrix);

                    world[offset] = tmpVec3.x;
                    world[offset + 1] = tmpVec3.y;
                    world[offset + 2] = tmpVec3.z;
                }
            }
        }
    }

    _drawDebugDatas(comp, renderer, name) {
        let debugDatas = comp._debugDatas[name];
        if (!debugDatas) return;
        for (let i = 0; i < debugDatas.length; i++) {
            let debugData = debugDatas[i];
            if (!debugData) continue;
            let material = debugData.material;
            renderer.material = material;
            renderer._flushIA(debugData.ia);
        }
    }
}

cc.Assembler.register(SplineTrailRenderer, SplineTrailRendererAssembler);
