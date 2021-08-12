// Copyright 2021 Cao Gaoting<caogtaa@gmail.com>
// https://caogtaa.github.io
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

import SimpleDraggable from "../../Scripts/Misc/SimpleDraggable";

/*
 * Date: 2021-08-11 00:29:14
 * LastEditors: GT<caogtaa@gmail.com>
 * LastEditTime: 2021-08-11 00:29:36
*/ 
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
        // this.targetLabel.string = "12345";
        if (this.displayArea) {
            this._viewCenter.set(this.displayArea.position);
            this._viewScale = 1.0;
            this.UpdateDisplayMatProperties();
        }

        this.InjectAssembler();

        this.NextGraph();
    }

    protected InjectAssembler() {
        let ctx = this.ctx;

        let assembler = ctx._assembler;
        //@ts-ignore
        let originFn = assembler._vset;

        //@ts-ignore
        let gfx = cc.gfx;
        let vfmtPosIndexSdf = new gfx.VertexFormat([
            { name: gfx.ATTR_POSITION, type: gfx.ATTR_TYPE_FLOAT32, num: 2 },
            { name: 'a_index', type: gfx.ATTR_TYPE_FLOAT32, num: 1 },
            { name: 'a_dist', type: gfx.ATTR_TYPE_FLOAT32, num: 1 },
        ]);
        
        vfmtPosIndexSdf.name = 'vfmtPosIndexSdf';
        assembler.getVfmt = () => {
            return vfmtPosIndexSdf;
        };

        //@ts-ignore
        assembler._vset = (x, y, distance = 0) => {
            //@ts-ignore
            let buffer = assembler._buffer;
            let meshbuffer = buffer.meshbuffer;
            //@ts-ignore
            let dataOffset = buffer.vertexStart * assembler.getVfmtFloatCount();
    
            let vData = meshbuffer._vData;
            let uintVData = meshbuffer._uintVData;
    
            vData[dataOffset] = x;
            vData[dataOffset+1] = y;
            //@ts-ignore
            // uintVData[dataOffset+2] = assembler._curColor;
            vData[dataOffset+2] = Math.floor(buffer.vertexStart);
            vData[dataOffset+3] = distance;
    
            buffer.vertexStart ++;
            meshbuffer._dirty = true;
        };
    }

    update() {
    }
    
    protected _graphIndex: number = -1;
    public NextGraph() {
        this._graphIndex = (this._graphIndex + 1) % 2;

        let ctx = this.ctx;
        ctx.clear();
        ctx.strokeColor = cc.Color.WHITE;
        ctx.fillColor = cc.Color.WHITE;
        ctx.lineWidth = 40;
        if (this._graphIndex === 0) {
            ctx.moveTo(-212, -139);
            ctx.bezierCurveTo(-213, 111, 38, 236, 246, 75);
            ctx.stroke();
        } else {
            ctx.moveTo(-100, -100);
            ctx.lineTo(-100, 100);
            ctx.lineTo(100, 100);
            ctx.close();
            ctx.stroke();
        }

        this.FlushMatProperties(this.ctx);
    }

    protected _effectIndex: number = 0;
    public NextEffect() {
        let index = this._effectIndex = (this._effectIndex + 1) % this.materials.length;
        let mat = this.materials[index];
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
