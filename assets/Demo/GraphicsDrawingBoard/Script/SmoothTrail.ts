
const { ccclass, property } = cc._decorator;
import { SmoothTrailAssembler } from "./SmoothTrailAssembler";
import { SmoothTrailImpl } from "./SmoothTrailImpl";

//@ts-ignore
const PointFlags = cc.Graphics.Types.PointFlags;

// //@ts-ignore
// const Helper = cc.Graphics.Helper;
// //@ts-ignore
// const PointFlags = cc.Graphics.Types.PointFlags;
// //@ts-ignore
// //const Point = cc.Graphics.Point;
// const Point;        // init this in onLoad()
//cc.Graphics._Impl = SmoothTrailImpl;

@ccclass
export class SmoothTrail extends cc.Graphics {
    public pnts: cc.Vec2[] = [];
    
    protected _renderHead: number = 0;
    protected _trailImpl: SmoothTrailImpl;
    protected _debug: boolean = false;

    onLoad() {
        //@ts-ignore;
        // Point = cc.Graphics.Point;

        // replace impl with custom version
        //@ts-ignore
        this._trailImpl = this._impl = new SmoothTrailImpl(this);
    }

    public StartPath(p: cc.Vec2): void {
        this.clear();       // TODO: for debug
        this.pnts.length = 0;
        this.pnts.push(p);
        this._renderHead = 0;
        if (this._debug) {
            this.moveTo(p.x, p.y);
        } else {
            let x = p.x, y = p.y;
            let impl = this._trailImpl;
            impl._addPath();
            impl._addPoint(x, y, PointFlags.PT_CORNER);
        
            impl._commandx = x;
            impl._commandy = y;
        }
    }

    public AddPathPoint(p: cc.Vec2): void {
        let delta = p.sub(this.pnts[this.pnts.length-1]);
        // if (Math.abs(delta.x) <= 3 && Math.abs(delta.y) <= 3) {
        //     // way point is too short
        //     return;
        // }
        let dist2 = delta.dot(delta);
        if (dist2 <= 9) {
            // way point is too short
            return;
        }

        this.pnts.push(p);
        
        if (this._debug)
            this.lineTo(p.x, p.y);
        else {
            let x = p.x, y = p.y;
            let impl = this._trailImpl;
            impl._addPoint(x, y, PointFlags.PT_CORNER);
            impl._commandx = x;
            impl._commandy = y;

            this.RenderNext();
        }
    }

    public EndPath(): void {
        // TODO: 绘制补齐最后一个线段（加cap end）
        if (this._debug) {
            this.stroke();
        } else {
            // 渲染剩余的路径
            this.RenderNext();
            let as = this._assembler as SmoothTrailAssembler;
            as.CapEnd(this, this._renderHead);
            this._renderHead = this.pnts.length;
        }

    }

    public RenderNext() {
        // 有剩余2个未处理的点则继续绘制
        if (!this._assembler) {
            this._resetAssembler();
        }

        if (this._renderHead >= this.pnts.length-2) {
            return;
        }

        let as = this._assembler as SmoothTrailAssembler;
        while (this._renderHead < this.pnts.length-2) {
            if (this._renderHead === 0) {
                as.CapStart(this, 0);
            }

            as._flattenPathsV2(this._trailImpl, this._renderHead, this.pnts.length-2);
            if (!as.HasSmoothCorner(this, this._renderHead)) {
                // as.RollBack(this, this._renderHead + 1);
                // TODO: 如果移除this._renderHead+1，则前面的Mesh需要重新计算，因为右侧向量发生变化
                // 移除renderHead + 2就是移除最后一个点
                let removeIndex = this._renderHead + 2;
                this._trailImpl.erase(removeIndex);
                this.pnts.splice(removeIndex, 1);
                continue;
            }

            // TODO: 曲线细分，目前是直线就不用细分了
            as.strokeV2(this, this._renderHead, this.pnts.length-2);
            this._renderHead = this.pnts.length-2;
            // while (this._renderHead < this.pnts.length-1) {
            //     let index = this._renderHead;
            //     // TODO: 绘制index到index+1的拐点

            //     as.strokeV2(this, this._renderHead++);
            // }
        }
    }
}
