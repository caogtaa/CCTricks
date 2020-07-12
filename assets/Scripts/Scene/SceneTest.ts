const { ccclass, property } = cc._decorator;

@ccclass
export default class SceneTest extends cc.Component {
    @property(cc.Node)
    avatar: cc.Node = null;

    onLoad() {
    }

    onBtnClick() {
        if (this.avatar) {
            this.avatar.position = this.avatar.position.add(cc.v2(10, 10));
        }
    }
}
