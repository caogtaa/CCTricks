
const { ccclass, property } = cc._decorator;
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
        this.moveTo(p.x, p.y);
        this.pnts.push(p);
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
        this.lineTo(p.x, p.y);
    }

    public EndPath(): void {
        this.stroke();
    }
}
