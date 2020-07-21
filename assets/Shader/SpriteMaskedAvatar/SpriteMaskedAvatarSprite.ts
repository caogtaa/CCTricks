/****************************************************************************
 Author: GT <caogtaa@gmail.com>
 https://caogtaa.github.io
****************************************************************************/

import SpriteMaskedAvatarAssembler from "./SpriteMaskedAvatarAssembler";

const { ccclass, property } = cc._decorator;

@ccclass
export default class SpriteMaskedAvatarSprite extends cc.Sprite {
    @property(cc.SpriteFrame)
    set mask(value: cc.SpriteFrame) {
        this._mask = value;
        this.setVertsDirty();
    }
    get mask() {
        return this._mask;
    }

    @property(cc.SpriteFrame)
    protected _mask: cc.SpriteFrame = null;

    _resetAssembler() {
        this.setVertsDirty();
        let assembler = this._assembler = new SpriteMaskedAvatarAssembler();
        assembler.init(this);

        let mask = this._mask;
        let mat = this.getMaterial(0);
        if (mat && mask)
            mat.setProperty("mask", mask.getTexture());
    }

    // 注意事项：业务上保证
    // 1. mask spriteFrame在使用前已经加载完毕，此处不会监听texture loaded
    // 2. mask 预先合图，此处不会监听动态合图事件
    _validateRender() {
        //@ts-ignore
        super._validateRender();

        let mask = this._mask;
        if (mask && mask.textureLoaded()) {
            return;
        }

        this.disableRender();
    }
}
