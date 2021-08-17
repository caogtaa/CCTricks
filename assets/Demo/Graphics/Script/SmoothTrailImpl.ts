
//@ts-ignore
const Helper = cc.Graphics.Helper;
//@ts-ignore
const PointFlags = cc.Graphics.Types.PointFlags;

class Path {
    closed: boolean;
    nbevel: number;
    complex: boolean;
    points: cc.Graphics.Point[] = [];

    constructor() {
        this.reset();
    }

    reset () {
        this.closed = false;
        this.nbevel = 0;
        this.complex = true;

        if (this.points) {
            this.points.length = 0;
        }
        else {
            this.points = [];
        }
    }
}

export class SmoothTrailImpl {
    // inner properties
    _tessTol: number = 0.25;
    _distTol: number = 0.01;
    _updatePathOffset: boolean = false;
    
    // _paths = null;
    _pathLength: number = 0;           // path数量
    _pathOffset: number = 0;           // pathOffset之后的路径没有更新过Mesh。调用stroke()/fill()更新Mesh
    
    // _points = null;
    _pointsOffset: number = 0;         // points数量
    
    _commandx: number = 0;
    _commandy: number = 0;

    _paths: Path[] = [];
    _points: cc.Graphics.Point[] = [];

    _curPath: Path = null;

    moveTo (x, y) {
        if (this._updatePathOffset) {
            this._pathOffset = this._pathLength;
            this._updatePathOffset = false;
        }
    
        this._addPath();
        this._addPoint(x, y, PointFlags.PT_CORNER);
    
        this._commandx = x;
        this._commandy = y;
    }

    lineTo (x, y) {
        this._addPoint(x, y, PointFlags.PT_CORNER);
        
        this._commandx = x;
        this._commandy = y;
    }

    bezierCurveTo (c1x, c1y, c2x, c2y, x, y) {
        var path = this._curPath;
        var last = path.points[path.points.length - 1];
    
        if (last.x === c1x && last.y === c1y && c2x === x && c2y === y) {
            this.lineTo(x, y);
            return;
        }
    
        Helper.tesselateBezier(this, last.x, last.y, c1x, c1y, c2x, c2y, x, y, 0, PointFlags.PT_CORNER);
    
        this._commandx = x;
        this._commandy = y;
    }

    quadraticCurveTo (cx, cy, x, y) {
        var x0 = this._commandx;
        var y0 = this._commandy;
        this.bezierCurveTo(x0 + 2.0 / 3.0 * (cx - x0), y0 + 2.0 / 3.0 * (cy - y0), x + 2.0 / 3.0 * (cx - x), y + 2.0 / 3.0 * (cy - y), x, y);
    }

    arc (cx, cy, r, startAngle, endAngle, counterclockwise) {
        Helper.arc(this, cx, cy, r, startAngle, endAngle, counterclockwise);
    }

    ellipse (cx, cy, rx, ry) {
        Helper.ellipse(this, cx, cy, rx, ry);
        this._curPath.complex = false;
    }

    circle (cx, cy, r) {
        Helper.ellipse(this, cx, cy, r, r);
        this._curPath.complex = false;
    }

    rect (x, y, w, h) {
        this.moveTo(x, y);
        this.lineTo(x, y + h);
        this.lineTo(x + w, y + h);
        this.lineTo(x + w, y);
        this.close();
        this._curPath.complex = false;
    }

    roundRect (x, y, w, h, r) {
        Helper.roundRect(this, x, y, w, h, r);
        this._curPath.complex = false;
    }

    clear (clean) {
        this._pathLength = 0;
        this._pathOffset = 0;
        this._pointsOffset = 0;
      
        this._curPath = null;

        if (clean) {
            this._paths.length = 0;
            this._points.length = 0;
        }
    }

    close () {
        this._curPath.closed = true;
    }

    _addPath () {
        var offset = this._pathLength;
        var path = this._paths[offset];
    
        if (!path) {
            path = new Path();
    
            this._paths.push(path);
        } else {
            path.reset();
        }
    
        this._pathLength++;
        this._curPath = path;
    
        return path;
    }
    
    _addPoint (x, y, flags) {
        let path = this._curPath;
        if (!path) return;
    
        let points = this._points;
        let pathPoints = path.points;
    
        let offset = this._pointsOffset++;
        let pt = points[offset];
    
        if (!pt) {
            //@ts-ignore
            pt = new cc.Graphics.Point(x, y);
            points.push(pt);
        } else {
            pt.x = x;
            pt.y = y;
        }
    
        pt.flags = flags;
        pathPoints.push(pt);
    }

}
