
import MovingBGAssembler from "./MovingBGAssembler";

const {ccclass, property} = cc._decorator;

@ccclass
export default class MovingBGSprite extends cc.Sprite {
    @property(cc.Vec2)
    bgOffset: cc.Vec2 = cc.Vec2.ZERO;

    public FlushProperties() {
        //@ts-ignore
        let assembler: MovingBGAssembler = this._assembler;
        if (!assembler)
            return;

        assembler.bgOffset = this.bgOffset;
        this.setVertsDirty();
    }

    onEnable () {
        super.onEnable();
    }

    // // 使用cc.Sprite默认逻辑
    _resetAssembler () {
        this.setVertsDirty();
        let assembler = this._assembler = new MovingBGAssembler();
        this.FlushProperties();

        assembler.init(this);

        //@ts-ignore
        this._updateColor();        // may be no need
    }
}
