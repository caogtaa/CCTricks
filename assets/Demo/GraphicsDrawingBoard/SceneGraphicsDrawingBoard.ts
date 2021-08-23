/*
 * Author: GT<caogtaa@gmail.com>
 * Date: 2021-01-15 00:22:39
 * LastEditors: GT<caogtaa@gmail.com>
 * LastEditTime: 2021-05-30 11:27:41
*/

import { SmoothTrail } from "../Graphics/Script/SmoothTrail";
import { SplineTrailRenderer } from "./Script/SplineTrailRenderer";


const {ccclass, property} = cc._decorator;

type BezierParam = {
    A: cc.Vec2,
    B: cc.Vec2,
    C: cc.Vec2,
    D: cc.Vec2,
    CP1: cc.Vec2,
    CP2: cc.Vec2
};

@ccclass
export default class SceneGraphicsDrawingBoard extends cc.Component {
    @property(cc.Node)
    board: cc.Node = null;

    @property(SmoothTrail)
    ctx: SmoothTrail = null;

    @property(SplineTrailRenderer)
    trailRenderer: SplineTrailRenderer = null;

    @property(cc.EditBox)
    edtK: cc.EditBox = null;

    protected _autoRender: boolean = true;
    protected _isDragging: boolean = false;
    protected _points: cc.Vec2[] = [];
    protected _debug: boolean = false;
    protected _lineWidth: number = 0.05;        // ratio of screen width
    protected _bezierParams: BezierParam[] = [];
    protected _debugK: number = 0;

    onLoad() {
        let sprite = this.board.getComponent(cc.Sprite);
        sprite.sizeMode = cc.Sprite.SizeMode.CUSTOM;

        // 设置混合模式为max，主要为了避免线段衔接处颜色叠加导致变厚
        // var ext = gl.getExtension('EXT_blend_minmax');
        // let mat = this.singlePass.node.getComponent(cc.Sprite).getMaterial(0);
        // mat?.setBlend(
        //     true,
        //     ext.MAX_EXT,
        //     gfx.BLEND_SRC_ALPHA,
        //     gfx.BLEND_ONE_MINUS_SRC_ALPHA,
        //     ext.MAX_EXT,
        //     gfx.BLEND_SRC_ALPHA,
        //     gfx.BLEND_ONE_MINUS_SRC_ALPHA,
        //     0xffffffff,
        //     0);

        this.board.on(cc.Node.EventType.TOUCH_START, this.OnBoardTouchStart, this);
        this.board.on(cc.Node.EventType.TOUCH_MOVE, this.OnBoardTouchMove, this);
        this.board.on(cc.Node.EventType.TOUCH_END, this.OnBoardTouchEnd, this);
        this.board.on(cc.Node.EventType.TOUCH_CANCEL, this.OnBoardTouchEnd, this);
    }

    start () {
        // 2.4.6中导致尖角的case
        // 用于验证是否已经fix
        // let A = cc.v2(-174.606196, 148.231612);
        // let CP1 = cc.v2(-168.5968, 135.378);
        // let CP2 = cc.v2(-153.57333, 107.50);
        // let D = cc.v2(-156.578, 114.1784);
        
        // let ctx = this.ctx;
        // ctx.moveTo(A.x, A.y);
        // ctx.bezierCurveTo(CP1.x, CP1.y, CP2.x, CP2.y, D.x, D.y);
        // ctx.stroke();

        let ctx = this.ctx;
        if (ctx.node.active) {
            ctx.StartPath(cc.v2(0, 0));
            ctx.AddPathPoint(cc.v2(0, 100));
            ctx.AddPathPoint(cc.v2(1, 0));
            ctx.AddPathPoint(cc.v2(100, 0));
            ctx.EndPath();
        }

        let trailRenderer = this.trailRenderer;
        if (trailRenderer.node.active) {
            trailRenderer.StartPath(trailRenderer.FromLocalPos(cc.v2(0, 0)));
            trailRenderer.AddPoint(trailRenderer.FromLocalPos(cc.v2(0, 100)));
            trailRenderer.AddPoint(trailRenderer.FromLocalPos(cc.v2(100, 0)));
        }
    }

    // protected SetBlendEqToMax(mat: cc.Material) {
    //     if (this._debug)
    //         return;

    //     //@ts-ignore
    //     let gl = cc.game._renderContext;
    //     //@ts-ignore
    //     let gfx = cc.gfx;
    //     var ext = gl.getExtension('EXT_blend_minmax');
    //     mat?.setBlend(
    //         true,
    //         ext.MAX_EXT,
    //         gfx.BLEND_SRC_ALPHA,
    //         gfx.BLEND_ONE_MINUS_SRC_ALPHA,
    //         ext.MAX_EXT,
    //         gfx.BLEND_SRC_ALPHA,
    //         gfx.BLEND_ONE_MINUS_SRC_ALPHA,
    //         0xffffffff,
    //         0);
    // }

    protected _tmpV2 = cc.v2(0, 0);
    update() {
        // move everything to SmoothTrail
        return;
        let points = this._points;
        if (points.length < 3)
            return;

        let A = points[0];
        let B = points[1];
        let C = points[2];
        
        let isValid: boolean = true;
        let useBezier: boolean = true;
        let halfBezier: boolean = false;

        // ABC共线的情况用直线处理
        if (Math.abs((B.x-A.x) * (C.y-A.y) - (B.y-A.y) * (C.x-A.x)) <= 1e-5) {
            useBezier = false;
        }

        // 画直线时候点重叠，则不画
        if (!useBezier && A.equals(B)) {
            isValid = false;
        }

        // if (useBezier) {
        //     // 距离太短的也不要用bezier
        //     let tmpV2 = this._tmpV2;
        //     A.sub(B, tmpV2);
        //     let dist2 = tmpV2.dot(tmpV2);
        //     if (dist2 <= 16) {
        //         useBezier = false;
        //     }
        // }

        if (!useBezier) {
            // sprite.setMaterial(0, this.matCapsule);
            // let mat = sprite.getComponent(cc.Sprite).getMaterial(0);
            // this.SetBlendEqToMax(mat);
            // mat.setProperty("width", this._lineWidth);
            // mat.setProperty("PP", [A.x, A.y, B.x, B.y]);

            if (this.ctx.node.active) {
                this.ctx.moveTo(A.x, A.y);
                this.ctx.lineTo(B.x, B.y);
                this.ctx.stroke();
            }
        } else {
            if (points.length <= 3) {
                // 只绘制cubic bezier，需要4个点
                return;
            }

            // sprite.setMaterial(0, this.matBezier);
            // let mat = sprite.getComponent(cc.Sprite).getMaterial(0);
            // this.SetBlendEqToMax(mat);

            // if (halfBezier) {
            //     // 切分bezier曲线，只绘制AB段
            //     // vec2 TC = PB;
            //     // vec2 TB = (PA - PC) * 0.25 + PB;
            //     // PB = TB;
            //     // PC = TC;
            //     let TB = A.sub(C);
            //     TB.mulSelf(0.25).addSelf(B);

            //     C = B;
            //     B = TB;
            // } else {
            //     // B从途经点变为控制点
            //     // B = (4.0 * B - A - C) / 2.0
            //     B = B.mul(4);
            //     B.subSelf(A).subSelf(C).divSelf(2);
            // }

            // mat.setProperty("width", this._lineWidth);
            // mat.setProperty("PA", [A.x, A.y]);
            // mat.setProperty("PB", [B.x, B.y]);
            // mat.setProperty("PC", [C.x, C.y]);

            // 待计算的控制点
            let CP1 = cc.v2(0, 0);
            let CP2 = cc.v2(0, 0);
            if (this.ctx.node.active) {
                // todo: 先不管overdraw的问题，直接绘制整条bezier
                let D = points[3];
                this.ctx.moveTo(A.x, A.y);
                this.CalculateControlPoints(A, B, C, D, CP1, CP2);
                this.ctx.bezierCurveTo(CP1.x, CP1.y, CP2.x, CP2.y, D.x, D.y);
                this._bezierParams.push({
                    A: A,
                    B: B,
                    C: C,
                    D: D,
                    CP1: CP1,
                    CP2: CP2
                });
                // if (CP1.sub(A).dot(CP1.sub(A)) > 40 ||
                //     CP2.sub(D).dot(CP2.sub(D)) > 40) {
                //     console.log(`
                //         A: (0, 0),
                //         B: (${B.sub(A).x}, ${B.sub(A).y}),
                //         C: (${C.sub(A).x}, ${C.sub(A).y}),
                //         D: (${D.sub(A).x}, ${D.sub(A).y}),
                //         CP1: (${CP1.sub(A).x}, ${CP1.sub(A).y}),
                //         CP2: (${CP2.sub(A).x}, ${CP2.sub(A).y}`);
                // }
                // this.ctx.bezierCurveTo(B.x, B.y, C.x, C.y, D.x, D.y);
                // this.ctx.quadraticCurveTo(B.x, B.y, C.x, C.y);
                this.ctx.stroke();
            }
        }

        if (this._debug)
            console.log(`${A}, ${B}, ${C}, color=${this._colorIndex}, useBezier=${useBezier}`);

        if (isValid) {
            // if (this._debug)
            //     sprite.node.color = this._colors[this._colorIndex];
            this._colorIndex = (this._colorIndex + 1) % this._colors.length;
            // this.RenderToNode(sprite.node, this.board);
        }

        this._points.shift();
        // this._points.shift();
    }

    // P0, P3是曲线的端点
    // B1, B2是途经点，t值对应1/3, 2/3（假设每帧采样一次，所有点的t都等距）
    protected CalculateControlPoints(P0: cc.Vec2, B1: cc.Vec2, B2: cc.Vec2, P3: cc.Vec2, CP1: cc.Vec2, CP2: cc.Vec2) {
        let t = 1/3;
        let C0 = P0.mul(Math.pow(1-t, 3));
        let C1 = 3 * Math.pow(1-t, 2) * t;
        let C2 = 3 * (1-t) * t * t;
        let C3 = P3.mul(t * t * t);

        t = 2/3;
        let D0 = P0.mul(Math.pow(1-t, 3));
        let D1 = 3 * Math.pow(1-t, 2) * t;
        let D2 = 3 * (1-t) * t * t;
        let D3 = P3.mul(t * t * t);

        let Z1 = B1.sub(C0).sub(C3);
        let Z2 = B2.sub(D0).sub(D3);

        CP2.set(Z2.mul(C1).sub(Z1.mul(D1)).div(C1 * D2 - C2 * D1));
        CP1.set(Z2.mul(C1).sub(CP2.mul(C1 * D2)).div(C1 * D1));
    }

    public Clear() {
        if (this.ctx.node.active)
            this.ctx.clear();

        this._bezierParams.length = 0;
    }

    public KthBezierEditEnd(e: cc.EditBox) {
        let k = parseInt(e.string);
        this.SetK(k);
    }

    protected SetK(k: number, updateCtrl: boolean = false) {
        if (k < 0 || k >= this._bezierParams.length) {
            console.error("k out of range");
            return;
        }

        if (updateCtrl) {
            this.edtK.string = `${k}`;
        }

        this._debugK = k;
        let param = this._bezierParams[k];
        let ctx = this.ctx;
        ctx.clear()
        ctx.moveTo(param.A.x, param.A.y);
        ctx.bezierCurveTo(
            param.CP1.x, param.CP1.y,
            param.CP2.x, param.CP2.y,
            param.D.x, param.D.y);
        ctx.stroke();
    }

    public ShowKthBezierPoints() {
        let k = this._debugK;
        if (k < 0 || k >= this._bezierParams.length) {
            console.error("k out of range");
            return;
        }

        let param = this._bezierParams[k]
        let A = param.A, B = param.B, C = param.C, D = param.D, CP1 = param.CP1, CP2 = param.CP2;
        // console.log(`
        //     A: (0, 0),
        //     B: (${B.sub(A).x}, ${B.sub(A).y}),
        //     C: (${C.sub(A).x}, ${C.sub(A).y}),
        //     D: (${D.sub(A).x}, ${D.sub(A).y}),
        //     CP1: (${CP1.sub(A).x}, ${CP1.sub(A).y}),
        //     CP2: (${CP2.sub(A).x}, ${CP2.sub(A).y}`);
        console.log(`
            A: (${A.x}, ${A.y}),
            B: (${B.x}, ${B.y}),
            C: (${C.x}, ${C.y}),
            D: (${D.x}, ${D.y}),
            CP1: (${CP1.x}, ${CP1.y}),
            CP2: (${CP2.x}, ${CP2.y}`);
    }

    public PrevK() {
        this.SetK(this._debugK - 1);
    }

    public NextK() {
        this.SetK(this._debugK + 1);
    }
    
    protected TouchPosToGraphicsPos(pos: cc.Vec2): cc.Vec2 {
        return this.ctx.node.convertToNodeSpaceAR(pos);
        // let node = this.ctx.node;
        // node.convertToNodeSpaceAR(pos, pos);

        // // map to [-0.5, 0.5]
        // pos.x /= node.width;
        // pos.y /= node.height;

        // // [-0.5, 0.5] map to [-1, 1]
        // pos.mulSelf(2.0);

        // // scale Y, same as in shader
        // pos.y *= node.height / node.width;
        // return pos;
    }

    protected OnBoardTouchStart(e: cc.Event.EventTouch) {
        let pos = this.TouchPosToGraphicsPos(e.getLocation());
        this._isDragging = true;
        this._points.length = 0;
        this._points.push(pos);
        if (this.ctx.node.active)
            this.ctx.StartPath(pos);

        let trailRenderer = this.trailRenderer;
        if (trailRenderer.node.active) {
            trailRenderer.StartPath(trailRenderer.FromLocalPos(pos));
            trailRenderer.AddPoint(trailRenderer.FromLocalPos(pos));
        }

        // if (this.ctx.node.active) {
        //     let localPos = this.node.convertToNodeSpaceAR(e.getLocation());
        //     this.ctx.moveTo(localPos.x, localPos.y);
        // }
    }

    protected _colorIndex: number = 0;
    protected _colors = [cc.Color.WHITE, cc.Color.RED, cc.Color.GREEN, cc.Color.BLUE, cc.Color.YELLOW, cc.Color.CYAN];

    protected OnBoardTouchMove(e: cc.Event.EventTouch) {
        if (!this._isDragging)
            return;

        let cur = this.TouchPosToGraphicsPos(e.getLocation());
        // console.log(`${cur.x}, ${cur.y}`);
        this._points.push(cur);
        if (this.ctx.node.active)
            this.ctx.AddPathPoint(cur);

        let trailRenderer = this.trailRenderer;
        if (trailRenderer.node.active) {
            trailRenderer.AddPoint(trailRenderer.FromLocalPos(cur));
        }

        // if (this.ctx.node.active) {
        //     let localPos = this.node.convertToNodeSpaceAR(e.getLocation());
        //     this.ctx.lineTo(localPos.x, localPos.y);
        //     this.ctx.stroke();
        // }
    }

    protected OnBoardTouchEnd() {
        this._isDragging = false;

        // simply clear points
        // todo: draw last segment
        this._points.length = 0;
        if (this.ctx.node.active)
            this.ctx.EndPath();

        if (this.trailRenderer.node.active) {
            console.log(`----- vcount: ${this.trailRenderer._vertices.length}`);
        }

        if (this._debug)
            console.log(`---------------------------- end ------------------------`)
    }
}
