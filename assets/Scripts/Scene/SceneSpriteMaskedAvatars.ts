import SpriteMaskedAvatarSprite from "../../Shader/SpriteMaskedAvatar/SpriteMaskedAvatarSprite";

const { ccclass, property } = cc._decorator;

@ccclass
export default class SceneSpriteMaskedAvatars extends cc.Component {
    @property(cc.Node)
    board: cc.Node = null;

    protected _enableMask: boolean = true;

    onLoad() {

    }

    onToggleMask() {
        let enable = this._enableMask = !this._enableMask;

        for (let c of this.board.children) {
            let comp = c.getComponent(SpriteMaskedAvatarSprite);
            comp.enableMask = enable;
        }
    }
}
