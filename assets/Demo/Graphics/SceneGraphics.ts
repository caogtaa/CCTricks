// Copyright 2021 Cao Gaoting<caogtaa@gmail.com>
// https://caogtaa.github.io
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

/*
 * Date: 2021-08-11 17:58:44
 * LastEditors: GT<caogtaa@gmail.com>
 * LastEditTime: 2021-08-12 21:35:31
*/ 


import SimpleDraggable from "../../Scripts/Misc/SimpleDraggable";
import GraphicsShowMesh from "./GraphicsShowMesh";
import { SmoothTrail } from "./Script/SmoothTrail";

const {ccclass, property} = cc._decorator;

@ccclass
export default class SceneGraphics extends cc.Component {
    @property(cc.Node)
    dragArea: cc.Node = null;

    @property(cc.Node)
    displayArea: cc.Node = null;

    @property(cc.Node)
    light: cc.Node = null;

    @property(cc.Graphics)
    ctx: cc.Graphics = null;

    @property([cc.Material])
    materials: cc.Material[] = [];

    // LIFE-CYCLE CALLBACKS:

    protected _viewCenter: cc.Vec2 = cc.v2(0, 0);   // 视图中心相对与纹理的位置，单位: 设计分辨率像素
    protected _viewScale: number = 1.0;             // 视图缩放

    onLoad () {
        this.displayArea = this.ctx.node;
        let dragArea = this.dragArea;
        dragArea.on(cc.Node.EventType.TOUCH_START, this.OnDisplayTouchStart, this);
        dragArea.on(cc.Node.EventType.TOUCH_MOVE, this.OnDisplayTouchMove, this);
        dragArea.on(cc.Node.EventType.TOUCH_END, this.OnDisplayTouchEnd, this);
        dragArea.on(cc.Node.EventType.TOUCH_CANCEL, this.OnDisplayTouchEnd, this);

        dragArea.on(cc.Node.EventType.MOUSE_WHEEL, this.OnDisplayMouseWheel, this);

        let that = this;
        this.light.getComponent(SimpleDraggable).Setup((pos: cc.Vec2) => {
            let mat = that.ctx.getMaterial(0);
            if (mat.getProperty("lightPos", 0) !== undefined) {
                mat.setProperty("lightPos", [pos.x, pos.y]);
            }
        });
    }

    start () {
        if (this.displayArea) {
            this._viewCenter.set(this.displayArea.position);
            this._viewScale = 1.0;
            this.UpdateDisplayMatProperties();
        }

        this.FlushEffect(this._effectIndex);
        this.FlushGraph(this._graphIndex);
    }

    update() {
    }
    
    protected _graphIndex: number = 0;
    public NextGraph() {
        this._graphIndex = (this._graphIndex + 1) % 3;
        this.FlushGraph(this._graphIndex);
    }

    protected FlushGraph(index: number) {
        let ctx = this.ctx;
        ctx.clear();
        ctx.strokeColor = cc.Color.WHITE;
        ctx.fillColor = cc.Color.WHITE;
        ctx.lineWidth = 40;
        if (index === 0) {           
            // ctx.moveTo(0, 0);
            // ctx.lineTo(0, 100);
            // ctx.lineTo(100, 0);
            // ctx.stroke();
            ctx.moveTo(-212, -139);
            ctx.bezierCurveTo(-213, 111, 38, 236, 246, 75);
            ctx.stroke();
        } else if (index === 1) {
            ctx.moveTo(-100, -100);
            ctx.lineTo(-100, 100);
            ctx.lineTo(100, 100);
            ctx.close();
            ctx.stroke();
        } else {
            let letterPath = new Map<string, cc.Vec2[]>([
                ["C", [
                    cc.v2(0.5, 0.7), cc.v2(-0.7, 0.8), cc.v2(-0.8, -0.9), cc.v2(0.3, -0.7)
                ]],
                ["O", [
                    cc.v2(0.1, 0.7), cc.v2(-0.7, 0.6), cc.v2(-0.7, -0.8), cc.v2(-0.1, -0.7), 
                    cc.v2(0.6, -0.6), cc.v2(0.8, 0.8)
                ]],
                ["S", [
                    cc.v2(0.4, 0.7), cc.v2(-0.5, 0.7), cc.v2(-0.6, 0.1), cc.v2(0.0, 0.0), 
                    cc.v2(0.6, 0.0), cc.v2(0.5, -0.8), cc.v2(-0.4, -0.7)
                ]]
            ]);

            let word = "COCOS";
            let scale = 100;
            let offsetx = -300;
            
            for (let k = 0; k < word.length; ++k) {
                let letter = word[k];
                let path = letterPath.get(letter);

                for (let i = 0, n = path.length; i < n; ) {
                    let p = path[i];
                    if (i === 0) {
                        ctx.moveTo(offsetx + p.x * scale, p.y * scale);
                        ++ i;
                    } else {
                        let p1 = path[i], p2 = path[(i+1) % n], p3 = path[(i+2) % n];
                        i += 3;
                        ctx.bezierCurveTo(
                            offsetx + p1.x * scale, p1.y * scale,
                            offsetx + p2.x * scale, p2.y * scale,
                            offsetx + p3.x * scale, p3.y * scale);
                    }
                }

                offsetx += 150;
            }

            ctx.stroke();
        }

        this.FlushMatProperties(ctx);
    }

    protected _effectIndex: number = 0;
    public NextEffect() {
        let index = this._effectIndex = (this._effectIndex + 1) % this.materials.length;
        this.FlushEffect(index);
    }

    // 当前使用的Graphics组件
    protected _curGraphicsCls: any = cc.Graphics;

    // 记录需要定制assembler的Graphics
    protected _specialGraphicsCls = new Map<string, any>([
        ["GraphicsShowMesh", GraphicsShowMesh]
    ]);

    protected FlushEffect(index: number) {
        let mat = this.materials[index];
        let cls = this._specialGraphicsCls.get(mat.name);
        if (cls == void 0) {
            cls = SmoothTrail;
        }

        // 如果需要的Graphics组件变化了，切换一下组件，并且重新刷一次路径
        if (cls !== this._curGraphicsCls) {
            let ctxNode = this.ctx.node;
            ctxNode.removeComponent(this._curGraphicsCls);
            this.ctx = ctxNode.addComponent(cls);
            this.FlushGraph(this._graphIndex);
            this._curGraphicsCls = cls;
        }

        this.ctx.setMaterial(0, mat);
        this.FlushMatProperties(this.ctx);
    }

    protected FlushMatProperties(ctx: cc.Graphics) {
        let mat = ctx.getMaterial(0);
        if (mat.getProperty("lineWidth", 0) !== undefined) {
            mat.setProperty("lineWidth", ctx.lineWidth);
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
        let preScale = this._viewScale;
        if (scale > 1) {
            this._viewScale = Math.min(this._viewScale * scale, 1e3);
        } else {
            this._viewScale = Math.max(this._viewScale * scale, 1e-3);
        }

        // get actual scale
        scale = this._viewScale / preScale;
        // keep center as center
        this._viewCenter.mulSelf(scale);

        this.UpdateDisplayMatProperties();
    }

    protected UpdateDisplayMatProperties() {
        let displayArea = this.displayArea;
        displayArea.position = this._viewCenter;
        displayArea.scale = this._viewScale;
        
        let mat = displayArea.getComponent(cc.RenderComponent).getMaterial(0);
        if (mat.getProperty("sz", 0) !== undefined) {
            mat.setProperty("sz", [displayArea.width * this._viewScale, displayArea.height * this._viewScale]);
        }
    }
}
