/****************************************************************************
 Author: GT <caogtaa@gmail.com>
 https://caogtaa.github.io
****************************************************************************/

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
