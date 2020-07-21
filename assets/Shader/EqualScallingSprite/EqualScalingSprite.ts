/****************************************************************************
 Author: GT <caogtaa@gmail.com>
 https://caogtaa.github.io
****************************************************************************/

import EqualScalingAssembler from "./EqualScalingAssembler";

const {ccclass, property} = cc._decorator;

@ccclass
export default class EqualScalingSprite extends cc.Sprite {
    _resetAssembler() {
        this.setVertsDirty();
        let assembler = this._assembler = new EqualScalingAssembler();
        assembler.init(this);
    }
}
