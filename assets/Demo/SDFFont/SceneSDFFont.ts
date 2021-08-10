// Copyright 2021 Cao Gaoting<caogtaa@gmail.com>
// https://caogtaa.github.io
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

/*
 * Date: 2021-08-11 00:29:14
 * LastEditors: GT<caogtaa@gmail.com>
 * LastEditTime: 2021-08-11 00:29:36
*/ 
const {ccclass, property} = cc._decorator;

@ccclass
export default class SceneSDFFont extends cc.Component {

    @property(cc.Label)
    targetLabel: cc.Label = null;

    // LIFE-CYCLE CALLBACKS:

    // onLoad () {}

    start () {
        this.targetLabel.string = "12345";
    }

    // update (dt) {}
}
