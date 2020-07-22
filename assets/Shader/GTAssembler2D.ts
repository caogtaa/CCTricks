// Copyright 2020 Cao Gaoting<caogtaa@gmail.com>
// https://caogtaa.github.io
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

/*
 * Date: 2020-07-13 02:44:17
 * LastEditors: GT<caogtaa@gmail.com>
 * LastEditTime: 2020-07-22 14:04:43
*/ 

// 自定义渲染
// https://docs.cocos.com/creator/manual/zh/advanced-topics/custom-render.html#%E8%87%AA%E5%AE%9A%E4%B9%89-assembler
export default class GTAssembler2D extends cc.Assembler {
    // 每个2d渲染单元里的有:
    // 4个顶点属性数据
    // 6个顶点索引 -> 三角剖分成2个三角形

    // 每个顶点属性由5个32位数据组成
    // 顶点属性声明:
    // var vfmtPosUvColor = new gfx.VertexFormat([
    //     { name: gfx.ATTR_POSITION, type: gfx.ATTR_TYPE_FLOAT32, num: 2 },
    //     { name: gfx.ATTR_UV0, type: gfx.ATTR_TYPE_FLOAT32, num: 2 },
    //     { name: gfx.ATTR_COLOR, type: gfx.ATTR_TYPE_UINT8, num: 4, normalize: true },       // 4个uint8
    // ]);
    // 顶点属性数据排列，每一格是32位 (float32/uint32)
    // x|y|u|v|color|x|y|u|v|color|...
    // 其中uv在一组数据中的偏移是2，color的偏移是4
    verticesCount = 4;
    indicesCount = 6;
    floatsPerVert = 5;

    // vdata offset info
    uvOffset = 2;
    colorOffset = 4;
    
    protected _renderData: cc.RenderData = null;
    protected _local: any = null;          // 中间结果。[l,b,r,t]。node对象左下、右上顶点的本地坐标，即相对于锚点的偏移

    init(comp: cc.RenderComponent) {
        super.init(comp);

        // cc.Assembler2D的初始化放在constructor里
        // 此处把初始化放在init里，以便成员变量能够有机会修改
        this._renderData = new cc.RenderData();
        this._renderData.init(this);

        this.initLocal();
        this.initData();
    }

    get verticesFloats() {
        return this.verticesCount * this.floatsPerVert;
    }

    initData() {
        let data = this._renderData;
        data.createQuadData(0, this.verticesFloats, this.indicesCount);
        // createQuadData内部会调用initQuadIndices初始化索引信息
        // 如果是用用flexbuffer创建则需要自己初始化
    }

    initLocal() {
        this._local = [];
        this._local.length = 4;
    }

    updateColor(comp, color) {
        // render data = verts = x|y|u|v|color|x|y|u|v|color|...
        // 填充render data中4个顶点的color部分
        let uintVerts = this._renderData.uintVDatas[0];
        if (!uintVerts) return;
        color = color != null ? color : comp.node.color._val;
        let floatsPerVert = this.floatsPerVert;
        let colorOffset = this.colorOffset;
        for (let i = colorOffset, l = uintVerts.length; i < l; i += floatsPerVert) {
            uintVerts[i] = color;
        }
    }

    getBuffer() {
        //@ts-ignore
        return cc.renderer._handle._meshBuffer;
    }

    updateWorldVerts(comp) {
        if (CC_NATIVERENDERER) {
            this.updateWorldVertsNative(comp);
        } else {
            this.updateWorldVertsWebGL(comp);
        }
    }

    updateWorldVertsWebGL(comp) {
        let local = this._local;
        let verts = this._renderData.vDatas[0];

        let matrix = comp.node._worldMatrix;
        let matrixm = matrix.m,
            a = matrixm[0], b = matrixm[1], c = matrixm[4], d = matrixm[5],
            tx = matrixm[12], ty = matrixm[13];

        let vl = local[0], vr = local[2],
            vb = local[1], vt = local[3];
        
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

        // render data = verts = x|y|u|v|color|x|y|u|v|color|...
        // 填充render data中4个顶点的xy部分
        let index = 0;
        let floatsPerVert = this.floatsPerVert;
        if (justTranslate) {
            // left bottom
            verts[index] = vl + tx;
            verts[index+1] = vb + ty;
            index += floatsPerVert;
            // right bottom
            verts[index] = vr + tx;
            verts[index+1] = vb + ty;
            index += floatsPerVert;
            // left top
            verts[index] = vl + tx;
            verts[index+1] = vt + ty;
            index += floatsPerVert;
            // right top
            verts[index] = vr + tx;
            verts[index+1] = vt + ty;
        } else {
            // 4对xy分别乘以 [2,2]仿射矩阵，然后+平移量
            let al = a * vl, ar = a * vr,
            bl = b * vl, br = b * vr,
            cb = c * vb, ct = c * vt,
            db = d * vb, dt = d * vt;

            // left bottom
            // newx = vl * a + vb * c + tx
            // newy = vl * b + vb * d + ty
            verts[index] = al + cb + tx;
            verts[index+1] = bl + db + ty;
            index += floatsPerVert;
            // right bottom
            verts[index] = ar + cb + tx;
            verts[index+1] = br + db + ty;
            index += floatsPerVert;
            // left top
            verts[index] = al + ct + tx;
            verts[index+1] = bl + dt + ty;
            index += floatsPerVert;
            // right top
            verts[index] = ar + ct + tx;
            verts[index+1] = br + dt + ty;
        }
    }

    // native场景下使用的updateWorldVerts
    // copy from \jsb-adapter-master\engine\assemblers\assembler-2d.js
    updateWorldVertsNative(comp) {
        let local = this._local;
        let verts = this._renderData.vDatas[0];
        let floatsPerVert = this.floatsPerVert;
      
        let vl = local[0],
            vr = local[2],
            vb = local[1],
            vt = local[3];
      
        let index: number = 0;
        // left bottom
        verts[index] = vl;
        verts[index+1] = vb;
        index += floatsPerVert;
        // right bottom
        verts[index] = vr;
        verts[index+1] = vb;
        index += floatsPerVert;
        // left top
        verts[index] = vl;
        verts[index+1] = vt;
        index += floatsPerVert;
        // right top
        verts[index] = vr;
        verts[index+1] = vt;
    }

    // 将准备好的顶点数据填充进 VertexBuffer 和 IndiceBuffer
    fillBuffers(comp, renderer) {
        if (renderer.worldMatDirty) {
            this.updateWorldVerts(comp);
        }

        let renderData = this._renderData;
        let vData = renderData.vDatas[0];
        let iData = renderData.iDatas[0];

        let buffer = this.getBuffer(/*renderer*/);
        let offsetInfo = buffer.request(this.verticesCount, this.indicesCount);

        // buffer data may be realloc, need get reference after request.

        // fill vertices
        let vertexOffset = offsetInfo.byteOffset >> 2,
            vbuf = buffer._vData;

        if (vData.length + vertexOffset > vbuf.length) {
            vbuf.set(vData.subarray(0, vbuf.length - vertexOffset), vertexOffset);
        } else {
            vbuf.set(vData, vertexOffset);
        }

        // fill indices
        let ibuf = buffer._iData,
            indiceOffset = offsetInfo.indiceOffset,
            vertexId = offsetInfo.vertexOffset;             // vertexId是已经在buffer里的顶点数，也是当前顶点序号的基数
        for (let i = 0, l = iData.length; i < l; i++) {
            ibuf[indiceOffset++] = vertexId + iData[i];
        }
    }

    packToDynamicAtlas(comp, frame) {
        if (CC_TEST) return;
        
        if (!frame._original && cc.dynamicAtlasManager && frame._texture.packable) {
            let packedFrame = cc.dynamicAtlasManager.insertSpriteFrame(frame);
            //@ts-ignore
            if (packedFrame) {
                frame._setDynamicAtlasFrame(packedFrame);
            }
        }
        let material = comp._materials[0];
        if (!material) return;
        
        if (material.getProperty('texture') !== frame._texture) {
            // texture was packed to dynamic atlas, should update uvs
            comp._vertsDirty = true;
            comp._updateMaterial();
        }
    }

    protected updateUVs(comp: cc.RenderComponent) {
        // 4个顶点的uv坐标，对应左下、右下、左上、右上
        // 如果是cc.Sprite组件，这里取sprite._spriteFrame.uv;
        let uv = [0, 0, 1, 0, 0, 1, 1, 1];
        let uvOffset = this.uvOffset;
        let floatsPerVert = this.floatsPerVert;
        let verts = this._renderData.vDatas[0];

        // render data = verts = x|y|u|v|color|x|y|u|v|color|...
        // 填充render data中4个顶点的uv部分
        for (let i = 0; i < 4; i++) {
            let srcOffset = i * 2;
            let dstOffset = floatsPerVert * i + uvOffset;
            verts[dstOffset] = uv[srcOffset];
            verts[dstOffset + 1] = uv[srcOffset + 1];
        }
    }

    protected updateVerts(comp: cc.RenderComponent) {
        let node: cc.Node = comp.node,
            cw: number = node.width,
            ch: number = node.height,
            appx: number = node.anchorX * cw,
            appy: number = node.anchorY * ch,
            l: number,
            b: number, 
            r: number,
            t: number;

        l = - appx;
        b = - appy;
        r = cw - appx;
        t = ch - appy;

        let local = this._local;
        local[0] = l;
        local[1] = b;
        local[2] = r;
        local[3] = t;
        this.updateWorldVerts(comp);
    }

    protected updateRenderData(comp: cc.RenderComponent) {
        if (comp._vertsDirty) {
            this.updateUVs(comp);
            this.updateVerts(comp);
            comp._vertsDirty = false;
        }
    }
}
