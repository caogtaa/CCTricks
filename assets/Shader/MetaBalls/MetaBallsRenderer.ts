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
            material.setProperty("radius", particles.GetRadius() * PTM_RATIO / this.node.width * 2);
            material.setProperty("yratio", this.node.height / this.node.width);
        }
    }

    _resetAssembler() {
        this.setVertsDirty();
        let assembler = this._assembler = new MetaBallsAssembler();
        assembler.init(this);
    }
}
