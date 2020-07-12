const { ccclass, property } = cc._decorator;

@ccclass
export default class NavigatorButton extends cc.Component {
    @property(String)
    sceneName: string = "SceneWelcome";

    onLoad() {
        let sceneName = this.sceneName;
        this.node.on(cc.Node.EventType.TOUCH_END, () => {
            cc.director.loadScene(sceneName);
        });
    }
}
