// Copyright 2020 Cao Gaoting<caogtaa@gmail.com>
// https://caogtaa.github.io
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

/*
 * Date: 2020-07-13 02:48:43
 * LastEditors: GT<caogtaa@gmail.com>
 * LastEditTime: 2020-07-22 14:01:23
*/ 


const { ccclass, property } = cc._decorator;

@ccclass
export default class NavigatorButton extends cc.Component {
    @property(cc.String)
    sceneName: string = "SceneWelcome";

    onLoad() {
        let sceneName = this.sceneName;
        this.node.on(cc.Node.EventType.TOUCH_END, () => {
            cc.director.loadScene(sceneName);
        });
    }
}
