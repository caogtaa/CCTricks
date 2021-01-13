// Copyright 2020 Cao Gaoting<caogtaa@gmail.com>
// https://caogtaa.github.io
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

/*
 * Date: 2021-01-13 23:22:00
 * LastEditors: GT<caogtaa@gmail.com>
 * LastEditTime: 2021-01-13 23:22:50
*/ 

const { ccclass, property } = cc._decorator;

@ccclass
export default class SceneParticlesBatching extends cc.Component {
    protected _originFillBuffersFn = null;

    onLoad() {
    }

    Batching() {
        if (this._originFillBuffersFn) {
            // 已经开启和批
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


// cc.game.on(cc.game.EVENT_GAME_INITED, () => {
//     let _render = cc.RenderFlow.prototype._render;
//     cc.RenderFlow.prototype._render = function(node) {
//         return _render.apply(this, arguments);
//     };

//     // let _updateMaterial = cc.ParticleSystem.prototype._updateMaterial;
//     // cc.ParticleSystem.prototype._updateMaterial = function() {
//     //     let material = this.getMaterial(0);
//     //     if (!material) return;
        
//     //     // material.define('CC_USE_MODEL', this._positionType !== cc.ParticleSystem.PositionType.FREE);
//     //     material.setProperty('texture', this._getTexture());

//     //     cc.BlendFunc.prototype._updateMaterial.call(this);
//     // };


//     // let _step = cc.ParticleSimulator.prototype.step;
//     // cc.ParticleSimulator.prototype.step = function(dt) {
//     //     return _step.apply(this, arguments);
//     // };

//     let particleAssembler = cc.ParticleSystem.__assembler__;
//     let _fillBuffers = particleAssembler.prototype.fillBuffers;
//     particleAssembler.prototype.fillBuffers = function(comp, renderer) {
//         // fn2.apply(this, arguments);
//         // return;

//         if (!this._ia) return;
        
//         // const PositionType = cc.ParticleSystem.PositionType;
//         // if (comp.positionType === PositionType.RELATIVE) {
//         //     renderer.node = comp.node.parent;
//         // } else {
//         //     renderer.node = comp.node;
//         // }
//         // renderer.material = comp._materials[0];
//         // renderer._flushIA(this._ia);

//         let simulator = comp._simulator;
//         let particleCount = simulator.particles.length;
//         if (particleCount === 0)
//             return;

//         const PositionType = cc.ParticleSystem.PositionType;
//         if (comp.positionType === PositionType.RELATIVE) {
//             renderer.node = comp.node.parent;
//         } else {
//             renderer.node = comp.node;
//         }
        
//         // this.getBuffer() will return assembler's standalone buffer
//         let ownBuffer = this.getBuffer();
//         let commitBuffer = cc.renderer._handle._meshBuffer;
//         let offsetInfo = commitBuffer.request(particleCount * 4, particleCount * 6);

//         let vertexOffset = offsetInfo.byteOffset >> 2,
//             vbuf = commitBuffer._vData;

//         let vData = ownBuffer._vData,
//             iData = ownBuffer._iData;

//         let vLen = particleCount * 4 * 5;   // 5 = FloatsPerVertex
//         if (vLen + vertexOffset > vbuf.length) {
//             vbuf.set(vData.subarray(0, vbuf.length - vertexOffset), vertexOffset);
//         } else {
//             vbuf.set(vData.subarray(0, vLen), vertexOffset);
//         }

//         // fill indices
//         let ibuf = commitBuffer._iData,
//             indiceOffset = offsetInfo.indiceOffset,
//             vertexId = offsetInfo.vertexOffset;             // vertexId是已经在buffer里的顶点数，也是当前顶点序号的基数
//         let iLen = particleCount * 6;
//         for (let i = 0; i < iLen; i++) {
//             ibuf[indiceOffset++] = vertexId + iData[i];
//         }
//     };

//     // let _packToDynamicAtlas = function(comp, frame) {
//     //     if (CC_TEST) return;
        
//     //     if (!frame._original && cc.dynamicAtlasManager && frame._texture.packable) {
//     //         let packedFrame = cc.dynamicAtlasManager.insertSpriteFrame(frame);
//     //         //@ts-ignore
//     //         if (packedFrame) {
//     //             frame._setDynamicAtlasFrame(packedFrame);
//     //         }
//     //     }
//     //     let material = comp._materials[0];
//     //     if (!material) return;
        
//     //     if (material.getProperty('texture') !== frame._texture) {
//     //         // texture was packed to dynamic atlas, should update uvs
//     //         comp._vertsDirty = true;
//     //         comp._updateMaterial();
//     //     }
//     // };

//     // let _updateRenderData = particleAssembler.prototype.updateRenderData;
//     // particleAssembler.prototype.updateRenderData = function(sprite: cc.Sprite) {
//     //     // todo: 如果当前模式无法让CC_USE_MODEL=false，那么这里没有必要进行合图
//     //     _packToDynamicAtlas(sprite, sprite._spriteFrame);
//     //     _updateRenderData.apply(this, arguments);
//     // }
// });
