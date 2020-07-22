// Copyright 2020 Cao Gaoting<caogtaa@gmail.com>
// https://caogtaa.github.io
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

/*
 * Date: 2020-07-13 02:44:17
 * LastEditors: GT<caogtaa@gmail.com>
 * LastEditTime: 2020-07-22 14:02:12
*/ 

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
