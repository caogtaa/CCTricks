// Copyright 2020 Cao Gaoting<caogtaa@gmail.com>
// https://caogtaa.github.io
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

/*
 * Date: 2020-08-19 21:18:54
 * LastEditors: GT<caogtaa@gmail.com>
 * LastEditTime: 2021-04-13 12:11:05
*/ 

import SpriteMaskedAvatarSprite from "./Shader/SpriteMaskedAvatar/SpriteMaskedAvatarSprite";

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
