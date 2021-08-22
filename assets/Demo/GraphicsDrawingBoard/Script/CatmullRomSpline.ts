

const NbSubSegmentPerSegment: number = 10;
const Epsilon: number = 0.1;        // 1/NBSubSegmentPerSegment
const MinimumKnotNb: number = 4;

// 猜测0号点是CatmullRom算法辅助点，1号点是真正线段开始，2号点是第一个线段的结束
// 假如存在subsegment(拐点信息)，应该存入这个线段的末尾
const FirstSegmentKnotIndex: number = 2;

export class SubKnot {
    distanceFromStart: number;      // 距离路径开始的距离
    position: cc.Vec2;              // ？？
    tangent: cc.Vec2;               // 切线单位向量
}

export class Knot {
	public distanceFromStart: number = -1.0;
    public subKnots: SubKnot[] = null;
    public position: cc.Vec2 = cc.Vec2.ZERO;

    constructor(position: cc.Vec2) {
        this.subKnots = new Array<SubKnot>(NbSubSegmentPerSegment+1);
        this.position.set(position);
    }

    public Invalidate() {
        this.distanceFromStart = -1.0;
    }
}

export class Marker {
    segmentIndex: number;
    subKnotAIndex: number;
    subKnotBIndex: number;
    lerpRatio: number;
}

export class CatmullRomSpline {
    public knots: Knot[] = [];

    // Catmull-Rom算法的有效控制点数是总点数-2，有效线段数是有效控制点数-1。所以这里-3
    public get NbSegments(): number {
        return Math.max(0, this.knots.length - 3);
    }

    public FindPositionFromDistance(distance: number): cc.Vec2 {
        let tangent = cc.Vec2.ZERO;
        let result = new Marker;
        let foundSegment: boolean = this.PlaceMarker(result, distance);
        if (foundSegment) {
            tangent = this.GetPosition(result);
        }

        return tangent;
    }

    public FindTangentFromDistance(distance: number): cc.Vec2 {
        let tangent = cc.Vec2.ZERO;
        let result = new Marker;
        let foundSegment = this.PlaceMarker(result, distance);
        if (foundSegment) {
            tangent = this.GetTangent(result);
        }

        return tangent;
    }


    public static ComputeBinormal(tangent: cc.Vec2, dummy: cc.Vec2): cc.Vec2 {
        return cc.v2(tangent.y, -tangent.x);
    }

    public Length(): number {
        if (this.NbSegments === 0)
            return 0;
        return Math.max(0, this.GetSegmentDistanceFromStart(this.NbSegments-1));
    }

    public Clear(): void {
        this.knots.length = 0;
    }

    public MoveMarker(marker: Marker, distance: number): void {        // TODO: distance是Unity Units，需要转换
        this.PlaceMarker(marker, distance, marker);
    }

    public GetPosition(marker: Marker): cc.Vec2 {
        let pos = cc.Vec2.ZERO;
        if (this.NbSegments === 0)
            return pos;

        let subKnots = this.GetSegmentSubKnots(marker.segmentIndex);
        pos.x = cc.misc.lerp(
            subKnots[marker.subKnotAIndex].position.x,
            subKnots[marker.subKnotBIndex].position.x,
            marker.lerpRatio);
        pos.y = cc.misc.lerp(
            subKnots[marker.subKnotAIndex].position.y,
            subKnots[marker.subKnotBIndex].position.y,
            marker.lerpRatio);

        return pos;
    }

    public GetTangent(marker: Marker) {
        let tangent = cc.Vec2.ZERO;
        if (this.NbSegments === 0)
            return tangent;
        
        let subKnots = this.GetSegmentSubKnots(marker.segmentIndex);
        tangent.x = cc.misc.lerp(
            subKnots[marker.subKnotAIndex].tangent.x,
            subKnots[marker.subKnotBIndex].tangent.x,
            marker.lerpRatio);
        tangent.y = cc.misc.lerp(
            subKnots[marker.subKnotAIndex].tangent.y,
            subKnots[marker.subKnotBIndex].tangent.y,
            marker.lerpRatio);
        return tangent;
    }

    protected GetSegmentSubKnots(i: number): SubKnot[] {
        return this.knots[FirstSegmentKnotIndex+i].subKnots;
    }

    protected GetSegmentDistanceFromStart(i: number): number {
        return this.knots[FirstSegmentKnotIndex+i].distanceFromStart;
    }

    // 计算线段和分线段的距离
    // 注意线段的index和顶点的index是错位的
    // segmentIndex=0的线段结束点对应vertexIndex=2
    public Parametrize(fromSegmentIndex: number, toSegmentIndex: number) {
        if (this.knots.length < MinimumKnotNb)
            return;

        let nbSegments: number = Math.min(toSegmentIndex+1, this.NbSegments);
        fromSegmentIndex = Math.max(0, fromSegmentIndex);
        let totalDistance: number = 0;

        if (fromSegmentIndex > 0) {
            // 这条线段之前的线段长度总和
            totalDistance = this.GetSegmentDistanceFromStart(fromSegmentIndex-1);
        }

        let knots = this.knots;
        for (let i=fromSegmentIndex; i<nbSegments; ++i) {
            let subKnots = this.GetSegmentSubKnots(i);
            
            // subknot固定11个，对应10个线段（挺浪费的，蛮多顶点都是重叠的）
            for (let j=0; j<subKnots.length; j++) {
                let sk = new SubKnot;
                sk.distanceFromStart = totalDistance += this.ComputeLengthOfSegment(i, (j-1)*Epsilon, j*Epsilon);
                sk.position = this.GetPositionOnSegment(i, j*Epsilon);
                sk.tangent = this.GetTangentOnSegment(i, j*Epsilon);

                subKnots[j] = sk;
            }
            
            knots[FirstSegmentKnotIndex+i].distanceFromStart = totalDistance;
        }
    }

    public PlaceMarker(result: Marker, distance: number, from: Marker = null): boolean {
		let nbSegments = this.NbSegments;
		if (nbSegments === 0)
            return false;

		if (distance <= 0) {
			result.segmentIndex = 0;
			result.subKnotAIndex = 0;
			result.subKnotBIndex = 1;
			result.lerpRatio = 0;
			return true;
		} else if (distance >= this.Length()) {
			let subKnots = this.GetSegmentSubKnots(nbSegments-1);
			result.segmentIndex = nbSegments-1;
			result.subKnotAIndex = subKnots.length-2;
			result.subKnotBIndex = subKnots.length-1;
			result.lerpRatio = 1;
			return true;
		}

		let fromSegmentIndex = 0;
		let fromSubKnotIndex = 1;
		if (from != null) {
			fromSegmentIndex = from.segmentIndex;
		}

		for (let i=fromSegmentIndex; i<nbSegments; ++i) {
			if (distance > this.GetSegmentDistanceFromStart(i))
                continue;

			let subKnots = this.GetSegmentSubKnots(i);
			
			for (let j=fromSubKnotIndex; j<subKnots.length; j++) {
				let sk: SubKnot = subKnots[j];

				if (distance > sk.distanceFromStart)
                    continue;

				result.segmentIndex = i;
				result.subKnotAIndex = j-1;
				result.subKnotBIndex = j;
				result.lerpRatio = 1 - ((sk.distanceFromStart - distance) / 
					(sk.distanceFromStart - subKnots[j-1].distanceFromStart));

				break;
			}

			break;
		}

		return true;
    }

    protected ComputeLength(): number {
	    if(this.knots.length < 4)
            return 0;
     
        let length: number = 0;
  
        let nbSegments = this.NbSegments;
		for (let i=0; i<nbSegments; ++i) {
			length += this.ComputeLengthOfSegment(i, 0, 1);
		}

        return length;
    }

	// 计算线段[from, to]区间的长度
    // 这里看似在分段累加，实际上有时候from和to刚好相差一个Epsilon。这里叫Epsilon也不合适，应该叫Delta
    protected ComputeLengthOfSegment(segmentIndex: number, from: number, to: number): number {
		let length: number = 0;
		from = cc.misc.clamp01(from);
		to = cc.misc.clamp01(to);

        let lastPoint = this.GetPositionOnSegment(segmentIndex, from);

        for (let j=from+Epsilon; j<to+Epsilon/2; j+=Epsilon) {
            let point = this.GetPositionOnSegment(segmentIndex, j);
            length += cc.Vec2.distance(point, lastPoint);
			lastPoint = point;
        }

        return length;
    }
	
	protected GetPositionOnSegment(segmentIndex: number, t: number): cc.Vec2 {
        // 真正代表segmentIndex线段的点是segmentIndex+2，所以要注意FirstSegmentKnotIndex = 2实际是hardcode的，不能修改
		let knots = this.knots;
		return CatmullRomSpline.FindSplinePoint(knots[segmentIndex].position, knots[segmentIndex+1].position, 
            knots[segmentIndex+2].position, knots[segmentIndex+3].position, t);
	}

	protected GetTangentOnSegment(segmentIndex: number, t: number): cc.Vec2
	{
        // 真正代表segmentIndex线段的点是segmentIndex+2，所以要注意FirstSegmentKnotIndex = 2实际是hardcode的，不能修改
		let knots = this.knots;
		let result = CatmullRomSpline.FindSplineTangent(knots[segmentIndex].position, knots[segmentIndex+1].position, 
            knots[segmentIndex+2].position, knots[segmentIndex+3].position, t);
		result.normalizeSelf();
		return result;
	}
	
    // 曲线在t点采样
	protected static FindSplinePoint(p0: cc.Vec2, p1: cc.Vec2, p2: cc.Vec2, p3: cc.Vec2, t: number): cc.Vec2 {
		let ret = cc.Vec2.ZERO;

		let t2 = t * t;
		let t3 = t2 * t;

		ret.x = 0.5 * ((2.0 * p1.x) +
			(-p0.x + p2.x) * t +
			(2.0 * p0.x - 5.0 * p1.x + 4 * p2.x - p3.x) * t2 +
			(-p0.x + 3.0 * p1.x - 3.0 * p2.x + p3.x) * t3);

		ret.y = 0.5 * ((2.0 * p1.y) +
			(-p0.y + p2.y) * t +
			(2.0 * p0.y - 5.0 * p1.y + 4 * p2.y - p3.y) * t2 +
			(-p0.y + 3.0 * p1.y - 3.0 * p2.y + p3.y) * t3);

		return ret;
	}

    // 获得曲线在t处的切线向量（非归一化）
    // 返回后再外部归一化
	protected static FindSplineTangent(p0: cc.Vec2, p1: cc.Vec2, p2: cc.Vec2, p3: cc.Vec2, t: number): cc.Vec2 {
		let ret = cc.Vec2.ZERO;

		let t2 = t * t;

		ret.x = 0.5 * (-p0.x + p2.x) + 
			(2.0 * p0.x - 5.0 * p1.x + 4 * p2.x - p3.x) * t + 
			(-p0.x + 3.0 * p1.x - 3.0 * p2.x + p3.x) * t2 * 1.5;

		ret.y = 0.5 * (-p0.y + p2.y) + 
			(2.0 * p0.y - 5.0 * p1.y + 4 * p2.y - p3.y) * t + 
			(-p0.y + 3.0 * p1.y - 3.0 * p2.y + p3.y) * t2 * 1.5;

		return ret;
	}
}