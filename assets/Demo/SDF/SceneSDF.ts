// Copyright 2020 Cao Gaoting<caogtaa@gmail.com>
// https://caogtaa.github.io
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

/*
 * Date: 2021-04-12 19:12:44
 * LastEditors: GT<caogtaa@gmail.com>
 * LastEditTime: 2021-04-12 19:15:20
*/ 

import { EDTAA3 } from "./EDTAA3";
import { SDF } from "./SDF";

const { ccclass, menu, property } = cc._decorator;


@ccclass
export class TestSDF extends cc.Component {
    @property(cc.Node)
    renderNode: cc.Node = null;

    @property(cc.Node)
    objNode: cc.Node = null;

    @property(cc.Node)
    btnSwitchImage: cc.Node = null;

    @property(cc.Node)
    btnSwitchEffect: cc.Node = null;

    @property([cc.SpriteFrame])
    images: cc.SpriteFrame[] = [];

    @property([cc.Material])
    materials: cc.Material[] = [];

    @property(cc.Node)
    dragArea: cc.Node = null;

    @property(cc.Sprite)
    dolphin: cc.Sprite = null;

    protected _sdf: SDF;
    protected _viewCenter: cc.Vec2 = cc.v2(0, 0);   // 视图中心相对与纹理的位置，单位: 设计分辨率像素
    protected _viewScale: number = 1.0;             // 视图缩放
    protected _textureSize = cc.size(1024, 1024);   // 目前先固定纹理大小，后续如果支持其他途径加载纹理，需要调整大小

    onLoad() {
        this.btnSwitchImage?.on("click", this.NextImage, this);
        this.btnSwitchEffect?.on("click", this.NextEffect, this);

        let dragArea = this.dragArea;
        dragArea.on(cc.Node.EventType.TOUCH_START, this.OnDisplayTouchStart, this);
        dragArea.on(cc.Node.EventType.TOUCH_MOVE, this.OnDisplayTouchMove, this);
        dragArea.on(cc.Node.EventType.TOUCH_END, this.OnDisplayTouchEnd, this);
        dragArea.on(cc.Node.EventType.TOUCH_CANCEL, this.OnDisplayTouchEnd, this);

        dragArea.on(cc.Node.EventType.MOUSE_WHEEL, this.OnDisplayMouseWheel, this);
    }

    start() {
        this._sdf = new SDF;
        this._imageIndex = -1;
        this.NextImage();

        this._viewCenter.set(this.dolphin.node.position);
        this._viewScale = 1.0;
        this._textureSize.width = this.dolphin.node.width;
        this._textureSize.height = this.dolphin.node.height;
        this.UpdateDisplayMatProperties();
    }

    protected _imageIndex: number = 0;
    protected NextImage() {
        // let index = gt.misc.RandomRangeInt(0, this.images.length);
        let index = this._imageIndex = (this._imageIndex + 1) % this.images.length;
        let sf = this.images[index];
        let sz = sf.getOriginalSize();

        this.objNode.getComponent(cc.Sprite).spriteFrame = sf;
        this.renderNode.width = this.objNode.width = sz.width;
        this.renderNode.height = this.objNode.height = sz.height;

        // let sdfRadius = 60;
        let sdfRadius = Math.max(60, sz.height / 3);
        let cutoff = 0.5;
        let texture = this._sdf.RenderToMemory(this.objNode, null, this.renderNode, sdfRadius * (1-cutoff));
        // let result = this._sdf.RenderSDF(texture, sdfRadius, cutoff);
        let edtaa = new EDTAA3;
        let result = edtaa.RenderSDF(texture, sz.width, sz.height);

        let sprite = this.renderNode.getComponent(cc.Sprite);
        sprite.spriteFrame = new cc.SpriteFrame(result.texture);
        this.FlushMatProperties(sprite, sdfRadius, cc.size(texture.width, texture.height));
    }

    protected FlushMatProperties(sprite: cc.Sprite, sdfRadius: number, sz: cc.Size) {
        // 只有Morphy效果需要设置
        if (this._effectIndex !== 2)
            return;

        let mat = sprite.getMaterial(0);
        mat.setProperty("yRatio", sz.height / sz.width);
        mat.setProperty("sdfRatio", sdfRadius * 2.0 / sz.width);       // 'SDF区间/x'
        mat.setProperty("outlineHalfWidth", 3.0 / sdfRadius);
    }

    protected _effectIndex: number = 0;
    protected NextEffect() {
        let index = this._effectIndex = (this._effectIndex + 1) % this.materials.length;
        let mat = this.materials[index];

        let sprite = this.renderNode.getComponent(cc.Sprite);
        sprite.setMaterial(0, mat);

        let sf = sprite.spriteFrame;
        let sz = sf.getOriginalSize();
        let sdfRadius = Math.max(60, sz.height / 3);
        this.FlushMatProperties(sprite, sdfRadius, sz);
    }

    public OnTimeChanged(e: any) {
        let progress = e.progress;
        let sprite = this.renderNode.getComponent(cc.Sprite);
        let mat = sprite.getMaterial(0);
        mat.setProperty("time", progress * 3.141592653589793 * 2.);
    }

    
    protected OnDisplayTouchStart(e: cc.Event.EventTouch) {
    }

    protected OnDisplayTouchMove(e: cc.Event.EventTouch) {
        let touches = e.getTouches();
        if (touches.length === 1) {
            // simple drag
            let touch = touches[0] as cc.Touch;
            let offset = touch.getDelta();
            // offset.mulSelf(this._viewScale);

            this._viewCenter.addSelf(offset);
            this.UpdateDisplayMatProperties();
        } else if (touches.length >= 2) {
            // simple zoom
            let t0 = touches[0] as cc.Touch;
            let t1 = touches[1] as cc.Touch;

            let p0 = t0.getLocation();
            let p1 = t1.getLocation();
            let newLength = p0.sub(p1).len();
            let oldLength = p0.sub(t0.getDelta()).sub(p1).add(t1.getDelta()).len();
            let scale = newLength / oldLength;
            this.DisplayScaleBy(scale);
        }
    }

    protected OnDisplayTouchEnd(e: cc.Event.EventTouch) {
        // do nothing
    }

    // 用鼠标滚轮进行缩放
    // 简单起见目前只支持视图中心固定的缩放
    protected OnDisplayMouseWheel(e: cc.Event.EventMouse) {
        let scrollY = e.getScrollY();
        if (!scrollY)
            return;

        if (scrollY > 0) {
            this.DisplayScaleBy(1.1);
        } else {
            this.DisplayScaleBy(0.9);
        }
    }

    protected DisplayScaleBy(scale: number) {
        if (scale > 0)
            this._viewScale = Math.min(this._viewScale * scale, 1e3);
        else
            this._viewScale = Math.max(this._viewScale * scale, 1e-3);

        this.UpdateDisplayMatProperties();
    }

    protected UpdateDisplayMatProperties() {
        let sprite = this.dolphin;
        sprite.node.position = this._viewCenter;
        sprite.node.scale = this._viewScale;
        let mat = sprite.getMaterial(0);
        if (!mat)
            return;

        // let viewOffset = this._viewOffset;
        let width = sprite.node.width;
        let height = sprite.node.height;

        let viewCenter = this._viewCenter;
        let viewScale = this._viewScale;
        let tw = this._textureSize.width;
        let th = this._textureSize.height;

        // let left = 0.5 - width / 1024 + viewCenter.x / 1024;

        let left = viewCenter.x / tw - width / (tw * 2 * viewScale);
        let right = viewCenter.x / tw + width / (tw * 2 * viewScale);
        let bottom = viewCenter.y / th - height / (th * 2 * viewScale);
        let top = viewCenter.y / th + height / (th * 2 * viewScale);

        tw = this._textureSize.width;// * this._viewScale;
        th = this._textureSize.height;// * this._viewScale;
        mat.setProperty("texSize", [tw, th]);
        mat.setProperty("stepUV", [1./tw, 1./th]);

        // mat.setProperty("left", left);
        // mat.setProperty("right", right);
        // mat.setProperty("bottom", bottom);
        // mat.setProperty("top", top);
        // shader内Remap()简化为MAD
        // mat.setProperty("p", [right-left, top-bottom]);
        // mat.setProperty("q", [left, bottom]);
    }

    public OnEdgeSliderChanged(comp: cc.Slider) {
        let edge = comp.progress - 0.5;

        let mat = this.dolphin.getMaterial(0);
        if (!mat)
            return;

        mat.setProperty("edge", edge);
    }
}

