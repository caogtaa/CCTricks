
const { ccclass, property } = cc._decorator;

@ccclass
export default class SceneTest extends cc.Component {
    onLoad() {
    }

    onBtnClick(e) {
        let name = e.currentTarget.name;
        cc.director.loadScene(name);
    }
}
