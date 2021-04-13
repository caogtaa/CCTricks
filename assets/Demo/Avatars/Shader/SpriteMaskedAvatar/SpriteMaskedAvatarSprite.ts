// Copyright 2020 Cao Gaoting<caogtaa@gmail.com>
// https://caogtaa.github.io
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

/*
 * Date: 2020-07-22 01:42:00
 * LastEditors: GT<caogtaa@gmail.com>
 * LastEditTime: 2020-07-22 14:04:11
*/ 

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

    @property(cc.Boolean)
    set enableMask(value: boolean) {
        this._enableMask = value;
        let mat = this.getMaterial(0);
        if (mat)
            mat.setProperty("enableMask", value ? 1.0 : 0.0);
    }
    get enableMask() {
        return this._enableMask;
    }

    @property(cc.Boolean)
    protected _enableMask = true;

    _resetAssembler() {
        this.setVertsDirty();
        let assembler = this._assembler = new SpriteMaskedAvatarAssembler();
        assembler.init(this);

        let mask = this._mask;
        let mat = this.getMaterial(0);
        if (mat && mask) {
            mat.setProperty("mask", mask.getTexture());
            mat.setProperty("enableMask", this._enableMask ? 1.0 : 0.0);
        }
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
