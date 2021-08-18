// Copyright 2021 Cao Gaoting<caogtaa@gmail.com>
// https://caogtaa.github.io
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

/*
 * Date: 2021-08-13 01:30:09
 * LastEditors: GT<caogtaa@gmail.com>
 * LastEditTime: 2021-08-18 02:40:55
*/ 


import { SmoothTrail } from "./Script/SmoothTrail";
import { SmoothTrailAssembler } from "./Script/SmoothTrailAssembler";
const {ccclass, property} = cc._decorator;

@ccclass
export default class GraphicsShowMesh extends SmoothTrail {
    onLoad () {
        super.onLoad();
        let mat = this.getMaterial(0);
        if (mat.name.startsWith("GraphicsShowMesh"))
            this.InjectAssembler();
    }

    start () {
        
    }

    protected InjectAssembler() {
        let ctx = this;

        let assembler = ctx._assembler as SmoothTrailAssembler;
        //@ts-ignore
        let originFn = assembler._vset;

        //@ts-ignore
        let gfx = cc.gfx;
        let vfmtPosIndexSdf = new gfx.VertexFormat([
            { name: gfx.ATTR_POSITION, type: gfx.ATTR_TYPE_FLOAT32, num: 2 },
            { name: 'a_index', type: gfx.ATTR_TYPE_FLOAT32, num: 1 },           // kth vertex
            { name: 'a_dist', type: gfx.ATTR_TYPE_FLOAT32, num: 1 },
        ]);
        
        vfmtPosIndexSdf.name = 'vfmtPosIndexSdf';
        assembler.getVfmt = () => {
            return vfmtPosIndexSdf;
        };

        //@ts-ignore
        assembler._vset = (x, y, distance = 0) => {
            let cverts = assembler.PATH_VERTEX;
            let pathVertexStart = assembler._pathVertexStart;

            //@ts-ignore
            let buffer = assembler._buffer;
            let meshbuffer = buffer.meshbuffer;
            //@ts-ignore
            let dataOffset = buffer.vertexStart * assembler.getVfmtFloatCount();
    
            let vData = meshbuffer._vData;
            let uintVData = meshbuffer._uintVData;
    
            vData[dataOffset] = x;
            vData[dataOffset+1] = y;
            //@ts-ignore
            // uintVData[dataOffset+2] = assembler._curColor;
            vData[dataOffset+2] = Math.floor(buffer.vertexStart);
            vData[dataOffset+3] = distance;
    
            buffer.vertexStart ++;
            meshbuffer._dirty = true;
        };
    }
}
