// Copyright 2020 Cao Gaoting<caogtaa@gmail.com>
// https://caogtaa.github.io
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

/*
 * Date: 2020-07-13 02:44:17
 * LastEditors: GT<caogtaa@gmail.com>
 * LastEditTime: 2020-07-22 14:01:40
*/ 

const { ccclass, property } = cc._decorator;

@ccclass
export default class SceneLayeredBatchingScrollView extends cc.Component {
    @property(cc.Node)
    item: cc.Node = null;

    @property(cc.Node)
    content: cc.Node = null;

    onLoad() {
        for (let i = 0; i < 100; ++i) {
            let newItem = cc.instantiate(this.item);
            newItem.parent = this.content;
        }
    }
}
