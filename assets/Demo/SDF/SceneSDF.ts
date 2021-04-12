// Copyright 2020 Cao Gaoting<caogtaa@gmail.com>
// https://caogtaa.github.io
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

/*
 * Date: 2021-04-12 19:12:44
 * LastEditors: GT<caogtaa@gmail.com>
 * LastEditTime: 2021-04-12 19:15:20
*/ 

import { SDF } from "./SDF";

const { ccclass, menu, property } = cc._decorator;


@ccclass
export class TestSDF extends cc.Component {
    @property(cc.Node)
    renderNode: cc.Node = null;

    @property(cc.Node)
    objNode: cc.Node = null;

    @property(cc.Node)
    btnSwitch: cc.Node = null;

    @property([cc.SpriteFrame])
    images: cc.SpriteFrame[] = [];

    protected _sdf: SDF;

    onLoad() {
        this.btnSwitch.on("click", this.UpdateImage, this);
    }

    start() {
        this._sdf = new SDF;

        let sprite = this.renderNode.getComponent(cc.Sprite);
        let sf = sprite.spriteFrame;
        if (sf) {
            let sz = sf.getOriginalSize();
            let sdfRadius = Math.max(60, sz.height / 3);
            this.FlushMatProperties(sprite, sdfRadius, sz);
        }
    }

    protected _imageIndex: number = 0;
    protected UpdateImage() {
        // let index = gt.misc.RandomRangeInt(0, this.images.length);
        let index = this._imageIndex;
        this._imageIndex = (this._imageIndex + 1) % this.images.length;
        let sf = this.images[index];
        let sz = sf.getOriginalSize();

        this.objNode.getComponent(cc.Sprite).spriteFrame = sf;
        this.renderNode.width = this.objNode.width = sz.width;
        this.renderNode.height = this.objNode.height = sz.height;

        // let sdfRadius = 60;
        let sdfRadius = Math.max(60, sz.height / 3);
        let cutoff = 0.5;
        let texture = this._sdf.RenderToMemory(this.objNode, null, this.renderNode, sdfRadius * (1-cutoff));
        let result = this._sdf.RenderSDF(texture, sdfRadius, cutoff);

        let sprite = this.renderNode.getComponent(cc.Sprite);
        sprite.spriteFrame = new cc.SpriteFrame(result.texture);
        this.FlushMatProperties(sprite, sdfRadius, cc.size(texture.width, texture.height));
    }

    protected FlushMatProperties(sprite: cc.Sprite, sdfRadius: number, sz: cc.Size) {
        let mat = sprite.getMaterial(0);
        mat.setProperty("yRatio", sz.height / sz.width);
        mat.setProperty("sdfRatio", sdfRadius * 2.0 / sz.width);       // 'SDF区间/x'
        mat.setProperty("outlineHalfWidth", 3.0 / sdfRadius);
    }

    public OnTimeChanged(e: any) {
        let progress = e.progress;
        let sprite = this.renderNode.getComponent(cc.Sprite);
        let mat = sprite.getMaterial(0);
        mat.setProperty("time", progress * 3.141592653589793 * 2.);
    }
}

