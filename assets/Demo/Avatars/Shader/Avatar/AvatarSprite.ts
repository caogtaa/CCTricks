// Copyright 2020 Cao Gaoting<caogtaa@gmail.com>
// https://caogtaa.github.io
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

/*
 * Date: 2020-07-21 17:27:48
 * LastEditors: GT<caogtaa@gmail.com>
 * LastEditTime: 2020-07-22 14:14:18
*/ 


import AvatarAssembler from "./AvatarAssembler";

const {ccclass, property} = cc._decorator;

@ccclass
export default class AvatarSprite extends cc.Sprite {
    _resetAssembler() {
        this.setVertsDirty();
        let assembler = this._assembler = new AvatarAssembler();
        assembler.init(this);
    }
}
