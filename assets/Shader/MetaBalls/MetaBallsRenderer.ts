import MetaBallsAssembler from "./MetaBallsAssembler";

const {ccclass, property} = cc._decorator;

@ccclass
export default class MetaBallsRenderer extends cc.Sprite {
    public SetParticles(particles) {
        //@ts-ignore
        this._assembler.particles = particles;
        let material = this.getMaterial(0);
        if (particles && material) {
            let PTM_RATIO = cc.PhysicsManager.PTM_RATIO;
            // particles.GetRadius() * PTM_RATIO 是相对于场景(世界空间)的大小
            // particles.GetRadius() * PTM_RATIO / this.node.width 是相对于纹理的大小(纹理和屏幕同宽)，范围[0, 1]
            // * 2是因为裁剪空间uv原点屏幕居中，范围[-1, 1]，对应半径要 * 2
            if (CC_NATIVERENDERER) {
                material.setProperty("offset", [0.5, 0.5]);
                // material.setProperty("radius", particles.GetRadius() * PTM_RATIO);
            } else {
                material.setProperty("offset", [0.0, 0.0]);
                // material.setProperty("radius", particles.GetRadius() * PTM_RATIO * 2);
            }

            material.setProperty("radius", particles.GetRadius() * PTM_RATIO / this.node.width);
            material.setProperty("yratio", this.node.height / this.node.width);
            material.setProperty("reverseResX", 1.0 / this.node.width);
            material.setProperty("reverseResY", 1.0 / this.node.height);
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
