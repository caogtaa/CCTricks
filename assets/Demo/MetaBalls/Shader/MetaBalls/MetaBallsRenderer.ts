/****************************************************************************
 Author: GT <caogtaa@gmail.com>
 https://caogtaa.github.io
****************************************************************************/

import MetaBallsAssembler from "./MetaBallsAssembler";

const {ccclass, property} = cc._decorator;

@ccclass
export default class MetaBallsRenderer extends cc.Sprite {
    @property(cc.Material)
    materialWeb: cc.Material = null;

    @property(cc.Material)
    materialNative: cc.Material = null;

    onLoad() {
        if (CC_NATIVERENDERER) {
            this.materialNative && this.setMaterial(0, this.materialNative);
        } else {
            this.materialWeb && this.setMaterial(0, this.materialWeb);
        }
    }

    public SetParticles(particles) {
        //@ts-ignore
        this._assembler.particles = particles;
        let material = this.getMaterial(0);
        if (particles && material) {
            let PTM_RATIO = cc.PhysicsManager.PTM_RATIO;
            if (CC_NATIVERENDERER) {
                // native渲染时以节点anchor为世界空间原点
                material.setProperty("offset", [0.5, 0.5]);
            } else {
                // web默认以左下为世界空间原点。两个平台内shader内通过offset实现坐标统一
                material.setProperty("offset", [0.0, 0.0]);
            }

            // particles.GetRadius() * PTM_RATIO 是相对于场景(世界空间)的大小
            // particles.GetRadius() * PTM_RATIO / this.node.width 是相对于纹理的大小(纹理和屏幕同宽)，范围[0, 1]
            material.setProperty("radius", particles.GetRadius() * PTM_RATIO / this.node.width);
            material.setProperty("yratio", this.node.height / this.node.width);
            material.setProperty("reverseRes", [1.0 / this.node.width, 1.0 / this.node.height]);
        }

        this.setVertsDirty();
    }

    _resetAssembler() {
        this.setVertsDirty();
        let assembler = this._assembler = new MetaBallsAssembler();
        assembler.init(this);
    }

    update() {
        this.setVertsDirty();
    }
}
