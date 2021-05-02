// Copyright 2021 Cao Gaoting<caogtaa@gmail.com>
// https://caogtaa.github.io
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

/*
 * Date: 2021-05-02 11:45:22
 * LastEditors: GT<caogtaa@gmail.com>
 * LastEditTime: 2021-05-02 11:46:07
*/ 

const { ccclass, property } = cc._decorator;

@ccclass
export default class SceneLoad extends cc.Component {
    onLoad() {
    }

    start() {
        if (this.Redirect())
            return;

        cc.director.loadScene("SceneWelcome");
    }

    protected Redirect(): boolean {
        let search = window.location.search;
        if (search) {
            let param = new URLSearchParams(search);
            let sceneName = param.get("scene");
            return cc.director.loadScene(sceneName);
        }

        return false;
    }
}
