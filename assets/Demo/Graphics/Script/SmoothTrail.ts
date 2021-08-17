
const { ccclass, property } = cc._decorator;
import { SmoothTrailAssembler } from "./SmoothTrailAssembler";
import { SmoothTrailImpl } from "./SmoothTrailImpl";

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
    protected _tailImpl: SmoothTrailImpl;

    onLoad() {
        //@ts-ignore;
        // Point = cc.Graphics.Point;

        // replace impl with custom version
        //@ts-ignore
        this._impl = new SmoothTrailImpl(this);
    }

    public StartPath(p: cc.Vec2): void {
        this.clear();       // TODO: for debug
        this.pnts.length = 0;
        // this.moveTo(p.x, p.y);
        this.pnts.push(p);

        // todo: add cap begin
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
        this.RenderNext();
        
        // this.lineTo(p.x, p.y);
    }

    public EndPath(): void {
        // TODO: 绘制补齐最后一个线段（加cap end）
        // this.stroke();
    }

    public RenderNext() {
        // 有剩余2个未处理的点则继续绘制
        if (!this._assembler) {
            this._resetAssembler();
        }

        let as = this._assembler as SmoothTrailAssembler;
        as.stroke(this);

        while (this._renderHead < this.pnts.length-1) {
            let index = this._renderHead;
            // TODO: 绘制index到index+1的拐点

            ++this._renderHead;
        }
    }
}
