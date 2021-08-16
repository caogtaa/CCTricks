
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
    onLoad() {
        //@ts-ignore;
        // Point = cc.Graphics.Point;

        // replace impl with custom version
        //@ts-ignore
        //this._impl = new SmoothTrailImpl(this);
    }

    public StartPath(p: cc.Vec2): void {

    }

    public AddPathPoint(p: cc.Vec2): void {

    }

    public EndPath(): void {

    }
}
