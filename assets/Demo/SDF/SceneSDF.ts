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
import { EDT } from "./EDT";

const { ccclass, menu, property } = cc._decorator;


@ccclass
export class TestSDF extends cc.Component {
    @property([cc.Node])
    renderNodes: cc.Node[] = [];

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

    @property(cc.Label)
    lblHint: cc.Label = null;

    protected _hints = new Map<string, string>([
        ["SpriteRaw", "原始SDF纹理"],
        ["SDFGradient", "距离映射到灰度"],
        ["SDFMorph", "形变"],
        ["SDFBloom", "霓虹灯"],
        ["SDFOutline0", "描边"],
        ["SDFSelect", "框选动画"],
        ["SDFOutline2", "外发光"],
        ["SDFRawTest", ""],
        ["SDFGlow", "外发光2"],
        ["SDFSquiggle", "手绘线描"],
        ["SDFColorPallete", "颜色渐变"],
        ["SDFContour", "等高线"],
        ["SDFDropShadow", "投影"],
        ["SDFFake3D", "伪3D"],
    ]);
    protected _edt: EDT;
    protected _edtaa3: EDTAA3;
    protected _viewCenter: cc.Vec2 = cc.v2(0, 0);   // 视图中心相对与纹理的位置，单位: 设计分辨率像素
    protected _viewScale: number = 1.0;             // 视图缩放
    protected _textureSize = cc.size(1024, 1024);   // 目前先固定纹理大小，后续如果支持其他途径加载纹理，需要调整大小
    protected _maxDist: number = 17;

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
        this._edt = new EDT;
        this._edtaa3 = new EDTAA3;
        this._imageIndex = -1;
        this.NextImage();
        this.UpdateHint(0);

        if (this.dolphin) {
            this._viewCenter.set(this.dolphin.node.position);
            this._viewScale = 1.0;
            this._textureSize.width = this.dolphin.node.width;
            this._textureSize.height = this.dolphin.node.height;
            this.UpdateDisplayMatProperties();
        }
    }

    protected _imageIndex: number = 0;
    protected NextImage() {
        // let index = gt.misc.RandomRangeInt(0, this.images.length);
        let index = this._imageIndex = (this._imageIndex + 1) % this.images.length;
        let sf = this.images[index];
        let sz = sf.getOriginalSize();

        this.objNode.getComponent(cc.Sprite).spriteFrame = sf;
        for (let i = 0; i < 2; ++i) {
            let renderNode = this.renderNodes[i];
            let maxDist = this._maxDist;
            renderNode.width = this.objNode.width = sz.width;
            renderNode.height = this.objNode.height = sz.height;
            let texture = this.RenderToMemory(this.objNode, null, renderNode, maxDist);

            let result: { texture: cc.RenderTexture, alpha: Uint8ClampedArray } = null;
            if (i === 0) {
                result = this._edt.RenderSDF(texture, maxDist);
            } else {
                result = this._edtaa3.RenderSDF(texture, maxDist);
            }

            let sprite = renderNode.getComponent(cc.Sprite);
            sprite.spriteFrame = new cc.SpriteFrame(result.texture);
            this.FlushMatProperties(sprite, maxDist, cc.size(texture.width, texture.height), i === 1 && maxDist > 8);
        }
    }

    // todo: remove sdf Radius
    protected FlushMatProperties(sprite: cc.Sprite, sdfRadius: number, sz: cc.Size, useDualChannel: boolean) {
        let mat = sprite.getMaterial(0);
        // if (mat.name.startsWith("SDFOutline0") || mat.name.startsWith("SDFRawTestDual8")) {
        if (true) {
            let tw = sprite.node.width;
            let th = sprite.node.height;
            mat.setProperty("texSize", [tw, th]);
            mat.setProperty("texStep", [1./tw, 1./th]);
            mat.setProperty("maxDist", this._maxDist);
            mat.define("SDF_HI_RES", useDualChannel);
            mat.define("SDF_DUAL_CHANNEL", useDualChannel);
        }

        // 只有Morphy效果需要设置
        if (this._effectIndex !== 2)
            return;

        mat.setProperty("yRatio", sz.height / sz.width);
        mat.setProperty("sdfRatio", sdfRadius * 2.0 / sz.width);       // 'SDF区间/x'
        mat.setProperty("outlineHalfWidth", 3.0 / sdfRadius);
    }

    protected _effectIndex: number = 0;
    protected NextEffect() {
        let index = this._effectIndex = (this._effectIndex + 1) % this.materials.length;
        this.UpdateHint(index);
        let mat = this.materials[index];

        for (let i = 0; i < 2; ++i) {
            let renderNode = this.renderNodes[i];
            let sprite = renderNode.getComponent(cc.Sprite);
            sprite.setMaterial(0, mat);

            let sf = sprite.spriteFrame;
            let sz = sf.getOriginalSize();
            let sdfRadius = Math.max(60, sz.height / 3);
            let maxDist = this._maxDist;
            this.FlushMatProperties(sprite, sdfRadius, sz, i === 1 && maxDist > 8);
        }
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
        if (!this.dolphin)
            return;

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
        mat.setProperty("texStep", [1./tw, 1./th]);

        // mat.setProperty("left", left);
        // mat.setProperty("right", right);
        // mat.setProperty("bottom", bottom);
        // mat.setProperty("top", top);
        // shader内Remap()简化为MAD
        // mat.setProperty("p", [right-left, top-bottom]);
        // mat.setProperty("q", [left, bottom]);
    }

    public OnEdgeSliderChanged(comp: cc.Slider) {
        if (!this.dolphin)
            return;

        let edge = comp.progress - 0.5;

        let mat = this.dolphin.getMaterial(0);
        if (!mat)
            return;

        mat.setProperty("edge", edge);
    }


    /**
     * 将root节点渲染到target节点上，target节点如果没有sprite组件会自动创建一个并关联内存纹理
     * @param root 
     * @param others 
     * @param target 
     * @param extend 内存纹理相比较原图的扩边大小，上下左右分别多出extend宽度的像素
     * @returns 
     */
     public RenderToMemory(root: cc.Node, others: cc.Node[], target: cc.Node, extend: number = 0): cc.RenderTexture {
        // 使截屏处于被截屏对象中心（两者有同样的父节点）
        let node = new cc.Node;
        node.parent = root;
        node.x = (0.5 - root.anchorX) * root.width;
        node.y = (0.5 - root.anchorY) * root.height;

        let camera = node.addComponent(cc.Camera);
        camera.backgroundColor = new cc.Color(255, 255, 255, 0);        // 透明区域仍然保持透明，半透明区域和白色混合
        camera.clearFlags = cc.Camera.ClearFlags.DEPTH | cc.Camera.ClearFlags.STENCIL | cc.Camera.ClearFlags.COLOR;

        // 设置你想要的截图内容的 cullingMask
        camera.cullingMask = 0xffffffff;

        let success: boolean = false;
        try {
            let scaleX = 1.0;   //this.fitArea.scaleX;
            let scaleY = 1.0;   //this.fitArea.scaleY;
            //@ts-ignore
            let gl = cc.game._renderContext;

            let targetWidth = Math.floor(root.width * scaleX + extend * 2);      // texture's width/height must be integer
            let targetHeight = Math.floor(root.height * scaleY + extend * 2);

            // 内存纹理创建后缓存在目标节点上
            // 如果尺寸和上次不一样也重新创建
            let texture: cc.RenderTexture = target["__gt_texture"];
            if (!texture || texture.width != targetWidth || texture.height != target.height) {
                texture = target["__gt_texture"] = new cc.RenderTexture();

                texture.initWithSize(targetWidth, targetHeight, gl.STENCIL_INDEX8);
                texture.packable = false;
            }
        
            camera.alignWithScreen = false;
            // camera.orthoSize = root.height / 2;
            camera.orthoSize = targetHeight / 2;
            camera.targetTexture = texture;

            // 渲染一次摄像机，即更新一次内容到 RenderTexture 中
            camera.render(root);
            if (others) {
                for (let o of others) {
                    camera.render(o);
                }
            }

            let screenShot = target;
            screenShot.active = true;
            screenShot.opacity = 255;

            // screenShot.parent = root.parent;
            // screenShot.position = root.position;
            screenShot.width = targetWidth;     // root.width;
            screenShot.height = targetHeight;   // root.height;
            screenShot.angle = root.angle;

            // fitArea有可能被缩放，截图的实际尺寸是缩放后的
            screenShot.scaleX = 1.0 / scaleX;
            screenShot.scaleY = -1.0 / scaleY;

            let sprite = screenShot.getComponent(cc.Sprite);
            if (!sprite) {
                sprite = screenShot.addComponent(cc.Sprite);
                // sprite.srcBlendFactor = cc.macro.BlendFactor.ONE;
            }

            if (!sprite.spriteFrame) {
                sprite.sizeMode = cc.Sprite.SizeMode.CUSTOM;
                sprite.spriteFrame = new cc.SpriteFrame(texture);
            }
            
            success = true;
        } finally {
            camera.targetTexture = null;
            node.removeFromParent();
            if (!success) {
                target.active = false;
            }
        }

        return target["__gt_texture"];
    }

    protected UpdateHint(materialIndex: number) {
        let mat = this.materials[materialIndex];
        let hint = this._hints.get(mat.name) || "";
        if (hint)
            this.lblHint.string = `当前效果:\n ${hint}`;
        else
            this.lblHint.string = "";
    }
}

