// Copyright 2020 Cao Gaoting<caogtaa@gmail.com>
// https://caogtaa.github.io
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

/*
 * Date: 2021-01-13 23:22:00
 * LastEditors: GT<caogtaa@gmail.com>
 * LastEditTime: 2021-04-13 13:49:48
*/ 

const { ccclass, property } = cc._decorator;

@ccclass
export default class SceneParticlesBatching extends cc.Component {
    protected _originFillBuffersFn = null;

    onLoad() {
    }

    Batching() {
        if (this._originFillBuffersFn) {
            // 已经开启合批
            return;
        }
 
        //@ts-ignore
        let particleAssembler = cc.ParticleSystem.__assembler__;

        // 保存原fillBuffers函数，并替换
        this._originFillBuffersFn = particleAssembler.prototype.fillBuffers;
        particleAssembler.prototype.fillBuffers = function(comp, renderer) {
            if (!this._ia) return;
    
            let simulator = comp._simulator;
            let particleCount = simulator.particles.length;
            if (particleCount === 0)
                // 粒子数量为0，无需渲染
                return;
    
            const PositionType = cc.ParticleSystem.PositionType;
            if (comp.positionType === PositionType.RELATIVE) {
                renderer.node = comp.node.parent;
            } else {
                renderer.node = comp.node;
            }
            
            // ownBuffer是粒子系统自己保存顶点数据的buffer
            let ownBuffer = this.getBuffer();

            // commitBuffer是将所有粒子系统数据合并后一起提交GPU的buffer
            //@ts-ignore
            let commitBuffer = cc.renderer._handle._meshBuffer;

            // 在commitBuffer里申请一段空间用于存放当前粒子系统的顶点数据
            let offsetInfo = commitBuffer.request(particleCount * 4, particleCount * 6);
    
            let vertexOffset = offsetInfo.byteOffset >> 2,
                vbuf = commitBuffer._vData;
    
            let vData = ownBuffer._vData,
                iData = ownBuffer._iData;
    
            // 从ownBuffer拷贝顶点属性到commitBuffer
            let vLen = particleCount * 4 * 5;   // 5 = FloatsPerVertex
            if (vLen + vertexOffset > vbuf.length) {
                vbuf.set(vData.subarray(0, vbuf.length - vertexOffset), vertexOffset);
            } else {
                vbuf.set(vData.subarray(0, vLen), vertexOffset);
            }
    
            // 从ownBuffer拷贝顶点索引到commitBuffer
            let ibuf = commitBuffer._iData,
                indiceOffset = offsetInfo.indiceOffset,
                vertexId = offsetInfo.vertexOffset;
            let iLen = particleCount * 6;
            for (let i = 0; i < iLen; i++) {
                ibuf[indiceOffset++] = vertexId + iData[i];
            }
        };    
    }

    Recover() {
        if (!this._originFillBuffersFn) {
            return;
        }

        // 替换回原来的fillBuffers函数
        //@ts-ignore
        cc.ParticleSystem.__assembler__.prototype.fillBuffers = this._originFillBuffersFn;
        this._originFillBuffersFn = null;
    }

    onDisable() {
        this.Recover();
    }
}
