

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

	// public List<Knot> knots = new List<Knot>();
	
	// public const int NbSubSegmentPerSegment = 10;

	// private const int MinimumKnotNb = 4;

    // // 猜测0号点是CatmullRom算法辅助点，1号点是真正线段开始，2号点是第一个线段的结束
    // // 假如存在subsegment(拐点信息)，应该存入这个线段的末尾
	// private const int FirstSegmentKnotIndex = 2;
	
    // // Catmull-Rom算法的有效控制点数是总点数-2，有效线段数是有效控制点数-1。所以这里-3
	// public int NbSegments { get { return System.Math.Max(0, knots.Count - 3); } }

    public FindPositionFromDistance(distance: number): cc.Vec2 {
        let tangent = cc.Vec2.ZERO;
        let result = new Marker;
        let foundSegment: boolean = this.PlaceMarker(result, distance);
        if (foundSegment) {
            tangent = this.GetPosition(result);
        }

        return tangent;
    }

	// public Vector3 FindPositionFromDistance(float distance)
    // {
    //     Vector3 tangent = Vector3.zero;
        
    //     Marker result = new Marker();
    //     bool foundSegment = PlaceMarker(result, distance);

    //     if(foundSegment)
    //     {
	// 		tangent = GetPosition(result);
    //     }
		
    //     return tangent;
    // }

    public FindTangentFromDistance(distance: number): cc.Vec2 {
        let tangent = cc.Vec2.ZERO;
        let result = new Marker;
        let foundSegment = this.PlaceMarker(result, distance);
        if (foundSegment) {
            tangent = this.GetTangent(result);
        }

        return tangent;
    }

	// public Vector3 FindTangentFromDistance(float distance)
    // {
    //     Vector3 tangent = Vector3.zero;
        
    //     Marker result = new Marker();
    //     bool foundSegment = PlaceMarker(result, distance);

    //     if(foundSegment)
    //     {
	// 		tangent = GetTangent(result);
    //     }
		
    //     return tangent;
    // }

    public static ComputeBinormal(tangent: cc.Vec2, dummy: cc.Vec2): cc.Vec2 {
        return cc.v2(tangent.y, -tangent.x);
    }

	// public static Vector3 ComputeBinormal(Vector3 tangent, Vector3 normal)
	// {
	// 	return Vector3.Cross(tangent, normal).normalized;
	// }

    public Length(): number {
        if (this.NbSegments === 0)
            return 0;
        return Math.max(0, this.GetSegmentDistanceFromStart(this.NbSegments-1));
    }

	// public float Length()
	// {
	// 	if(NbSegments == 0) return 0f;

	// 	//Parametrize();

	// 	return System.Math.Max(0, GetSegmentDistanceFromStart(NbSegments-1));
	// }

    public Clear(): void {
        this.knots.length = 0;
    }

	// public void Clear()
	// {
	// 	knots.Clear();
	// }

    public MoveMarker(marker: Marker, distance: number): void {        // TODO: distance是Unity Units，需要转换
        this.PlaceMarker(marker, distance, marker);
    }

	// public void MoveMarker(Marker marker, float distance) //in Unity units
	// {
	// 	PlaceMarker(marker, distance, marker);
	// }

    public GetPosition(marker: Marker): cc.Vec2 {
        let pos = cc.Vec2.ZERO;
        if (this.NbSegments === 0)
            return pos;

        let subKnots = this.GetSegmentSubKnots(marker.segmentIndex);
        pos.x = cc.lerp(
            subKnots[marker.subKnotAIndex].position.x,
            subKnots[marker.subKnotBIndex].position.x,
            marker.lerpRatio);
        pos.y = cc.lerp(
            subKnots[marker.subKnotAIndex].position.y,
            subKnots[marker.subKnotBIndex].position.y,
            marker.lerpRatio);

        return pos;
    }

	// public Vector3 GetPosition(Marker marker)
    // {
    //     Vector3 pos = Vector3.zero;

	// 	if(NbSegments == 0) return pos;

	// 	SubKnot[] subKnots = GetSegmentSubKnots(marker.segmentIndex);
        
	// 	pos = Vector3.Lerp(subKnots[marker.subKnotAIndex].position, 
	// 		subKnots[marker.subKnotBIndex].position, marker.lerpRatio);
		
    //     return pos;
    // }

    public GetTangent(marker: Marker) {
        let tangent = cc.Vec2.ZERO;
        if (this.NbSegments === 0)
            return tangent;
        
        let subKnots = this.GetSegmentSubKnots(marker.segmentIndex);
        tangent.x = cc.lerp(
            subKnots[marker.subKnotAIndex].tangent.x,
            subKnots[marker.subKnotBIndex].tangent.x,
            marker.lerpRatio);
        tangent.y = cc.lerp(
            subKnots[marker.subKnotAIndex].tangent.y,
            subKnots[marker.subKnotBIndex].tangent.y,
            marker.lerpRatio);
        return tangent;
    }

	// public Vector3 GetTangent(Marker marker)
    // {
	// 	Vector3 tangent = Vector3.zero;

	// 	if(NbSegments == 0) return tangent;

	// 	SubKnot[] subKnots = GetSegmentSubKnots(marker.segmentIndex);
        
	// 	tangent = Vector3.Lerp(subKnots[marker.subKnotAIndex].tangent, 
	// 		subKnots[marker.subKnotBIndex].tangent, marker.lerpRatio);
		
    //     return tangent;
    // }
    

	// private float Epsilon { get { return 1f / NbSubSegmentPerSegment; } }

    protected GetSegmentSubKnots(i: number): SubKnot[] {
        return this.knots[FirstSegmentKnotIndex+i].subKnots;
    }

	// private SubKnot[] GetSegmentSubKnots(int i) 
	// {
	// 	return knots[FirstSegmentKnotIndex+i].subKnots;
	// }

    protected GetSegmentDistanceFromStart(i: number): number {
        return this.knots[FirstSegmentKnotIndex+i].distanceFromStart;
    }

	// public float GetSegmentDistanceFromStart(int i) 
	// {
	// 	return knots[FirstSegmentKnotIndex+i].distanceFromStart;
	// }

	// private bool IsSegmentValid(int i)
	// {
	// 	return knots[i].distanceFromStart != -1f && knots[i+1].distanceFromStart != -1f &&
	// 		knots[i+2].distanceFromStart != -1f && knots[i+3].distanceFromStart != -1f;
	// }

	// private bool OutOfBoundSegmentIndex(int i)
	// {
	// 	return i < 0 || i >= NbSegments;
	// }

	// public void Parametrize()
	// {
	// 	Parametrize(0, NbSegments-1);
	// }

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

	// public void Parametrize(int fromSegmentIndex, int toSegmentIndex)
	// {
	// 	if(knots.Count < MinimumKnotNb) return;
		
	// 	int nbSegments = System.Math.Min(toSegmentIndex+1, NbSegments);
	// 	fromSegmentIndex = System.Math.Max(0, fromSegmentIndex);
	// 	float totalDistance = 0;

	// 	if(fromSegmentIndex > 0)
	// 	{
    //         // 这条线段之前的线段长度总和
	// 		totalDistance = GetSegmentDistanceFromStart(fromSegmentIndex-1);
	// 	}

	// 	for(int i=fromSegmentIndex; i<nbSegments; i++)
	// 	{
	// 		/*if(IsSegmentValid(i) && !force)
	// 		{
	// 			totalDistance = GetSegmentDistanceFromStart(i);
	// 			continue;
	// 		}*/
			
	// 		SubKnot[] subKnots = GetSegmentSubKnots(i);
			
    //         // subknot固定11个，对应10个线段（挺浪费的，蛮多顶点都是重叠的）
	// 		for(int j=0; j<subKnots.Length; j++)
	// 		{
	// 			SubKnot sk = new SubKnot();
				
	// 			sk.distanceFromStart = totalDistance += ComputeLengthOfSegment(i, (j-1)*Epsilon, j*Epsilon);
	// 			sk.position = GetPositionOnSegment(i, j*Epsilon);
	// 			sk.tangent = GetTangentOnSegment(i, j*Epsilon);

	// 			subKnots[j] = sk;
	// 		}
			
	// 		knots[FirstSegmentKnotIndex+i].distanceFromStart = totalDistance;
	// 	}
	// }

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

	// public bool PlaceMarker(Marker result, float distance, Marker from = null)
    // {
	// 	//result = new Marker();
	// 	SubKnot[] subKnots;
	// 	int nbSegments = NbSegments;

	// 	if(nbSegments == 0) return false;

	// 	//Parametrize();

	// 	if(distance <= 0)
	// 	{
	// 		result.segmentIndex = 0;
	// 		result.subKnotAIndex = 0;
	// 		result.subKnotBIndex = 1;
	// 		result.lerpRatio = 0f;
	// 		return true;
	// 	}
	// 	else if(distance >= Length())
	// 	{
	// 		subKnots = GetSegmentSubKnots(nbSegments-1);
	// 		result.segmentIndex = nbSegments-1;
	// 		result.subKnotAIndex = subKnots.Length-2;
	// 		result.subKnotBIndex = subKnots.Length-1;
	// 		result.lerpRatio = 1f;
	// 		return true;
	// 	}

	// 	int fromSegmentIndex = 0;
	// 	int fromSubKnotIndex = 1;
	// 	if(from != null)
	// 	{
	// 		fromSegmentIndex = from.segmentIndex;
	// 		//fromSubKnotIndex = from.subKnotAIndex;
	// 	}

	// 	for(int i=fromSegmentIndex; i<nbSegments; i++)
	// 	{
	// 		if(distance > GetSegmentDistanceFromStart(i)) continue;

	// 		subKnots = GetSegmentSubKnots(i);
			
	// 		for(int j=fromSubKnotIndex; j<subKnots.Length; j++)
	// 		{
	// 			SubKnot sk = subKnots[j];

	// 			if(distance > sk.distanceFromStart) continue;

	// 			result.segmentIndex = i;
	// 			result.subKnotAIndex = j-1;
	// 			result.subKnotBIndex = j;
	// 			result.lerpRatio = 1f - ((sk.distanceFromStart - distance) / 
	// 				(sk.distanceFromStart - subKnots[j-1].distanceFromStart));

	// 			break;
	// 		}

	// 		break;
	// 	}

	// 	return true;
	// }

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
	
	// private float ComputeLength()
    // {
	//     if(knots.Count < 4) return 0;
     
    //     float length = 0;
  
    //     int nbSegments = NbSegments;
	// 	for(int i=0; i<nbSegments; i++)
	// 	{
	// 		length += ComputeLengthOfSegment(i, 0f, 1f);
	// 	}

    //     return length;
    // }

	// 计算线段[from, to]区间的长度
    // 这里看似在分段累加，实际上有时候from和to刚好相差一个Epsilon。这里叫Epsilon也不合适，应该叫Delta
    protected ComputeLengthOfSegment(segmentIndex: number, from: number, to: number): number {
		let length: number = 0;
		from = cc.clamp01(from);
		to = cc.clamp01(to);

        let lastPoint = this.GetPositionOnSegment(segmentIndex, from);

        for (let j=from+Epsilon; j<to+Epsilon/2; j+=Epsilon) {
            let point = this.GetPositionOnSegment(segmentIndex, j);
            length += cc.Vec2.distance(point, lastPoint);
			lastPoint = point;
        }

        return length;
    }

	// private float ComputeLengthOfSegment(int segmentIndex, float from, float to)
    // {
	// 	float length = 0;
	// 	from = Mathf.Clamp01(from);
	// 	to = Mathf.Clamp01(to);

    //     Vector3 lastPoint = GetPositionOnSegment(segmentIndex, from);

    //     for(float j=from+Epsilon; j<to+Epsilon/2f; j+=Epsilon)
    //     {
    //         Vector3 point = GetPositionOnSegment(segmentIndex, j);
	// 		length += Vector3.Distance(point, lastPoint);
	// 		lastPoint = point;
    //     }

    //     return length;
    // }

	// public void DebugDrawEquallySpacedDots()
	// {
	// 	Gizmos.color = Color.red;
	// 	int nbPoints = NbSubSegmentPerSegment*NbSegments;
	// 	float length = Length();

	// 	Marker marker = new Marker();
	// 	PlaceMarker(marker, 0f); 

	// 	for(int i=0; i<=nbPoints; i++)
	// 	{
	// 		MoveMarker(marker, i*(length/nbPoints));

	// 		Vector3 position = GetPosition(marker);
	// 		//Vector3 tangent = GetTangent(marker);

	// 		//Vector3 position = FindPositionFromDistance(i*(length/nbPoints));
	// 		//Vector3 tangent = FindTangentFromDistance(i*(length/nbPoints));

	// 		//Vector3 binormal = ComputeBinormal(tangent, new Vector3(0, 0, 1));

	// 		Gizmos.DrawWireSphere(position, 0.025f);
	// 		//Debug.DrawRay(position, binormal * 0.2f, Color.green);
	// 	}
	// }

	// public void DebugDrawSubKnots()
	// {
	// 	Gizmos.color = Color.yellow;
	// 	int nbSegments = NbSegments;

	// 	for(int i=0; i<nbSegments; i++)
	// 	{
	// 		SubKnot[] subKnots = GetSegmentSubKnots(i);

	// 		for(int j=0; j<subKnots.Length; j++)
	// 		{
	// 			Gizmos.DrawWireSphere(subKnots[j].position, 0.025f);
	// 			//Gizmos.DrawWireSphere(new Vector3(segments[i].subSegments[j].length, 0, 0), 0.025f);
	// 		}
	// 	}
	// }

	// public void DebugDrawSpline()
    // {
    //     if(knots.Count >= 4)
    //     {
    //         Gizmos.color = Color.green;
    //         Gizmos.DrawWireSphere(knots[0].position, 0.2f);
    //         Gizmos.color = Color.red;
    //         Gizmos.DrawWireSphere(knots[knots.Count-1].position, 0.2f);
    //         Gizmos.color = Color.blue;
    //         Gizmos.DrawWireSphere(knots[knots.Count-2].position, 0.2f);

	// 		int nbSegments = NbSegments;
    //         for(int i=0; i<nbSegments; i++)
    //         {
    //             Vector3 lastPoint = GetPositionOnSegment(i, 0f);

	// 			Gizmos.DrawWireSphere(lastPoint, 0.2f);

    //             for(float j=Epsilon; j<1f+Epsilon/2f; j+=Epsilon)
    //             {
    //                 Vector3 point = GetPositionOnSegment(i, j);
	// 				Debug.DrawLine(lastPoint, point, Color.white); 
	// 				lastPoint = point;
    //             }
    //         }
    //     }
    // }
	
	protected GetPositionOnSegment(segmentIndex: number, t: number): cc.Vec2 {
        // 真正代表segmentIndex线段的点是segmentIndex+2，所以要注意FirstSegmentKnotIndex = 2实际是hardcode的，不能修改
		let knots = this.knots;
		return CatmullRomSpline.FindSplinePoint(knots[segmentIndex].position, knots[segmentIndex+1].position, 
            knots[segmentIndex+2].position, knots[segmentIndex+3].position, t);
	}


	// private Vector3 GetPositionOnSegment(int segmentIndex, float t)
	// {
    //     // 真正代表segmentIndex线段的点是segmentIndex+2，所以要注意FirstSegmentKnotIndex = 2实际是hardcode的，不能修改
	// 	return FindSplinePoint(knots[segmentIndex].position, knots[segmentIndex+1].position, 
    //         knots[segmentIndex+2].position, knots[segmentIndex+3].position, t);
	// }

	protected GetTangentOnSegment(segmentIndex: number, t: number): cc.Vec2
	{
        // 真正代表segmentIndex线段的点是segmentIndex+2，所以要注意FirstSegmentKnotIndex = 2实际是hardcode的，不能修改
		let knots = this.knots;
		let result = CatmullRomSpline.FindSplineTangent(knots[segmentIndex].position, knots[segmentIndex+1].position, 
            knots[segmentIndex+2].position, knots[segmentIndex+3].position, t);
		result.normalizeSelf();
		return result;
	}
	
	// private Vector3 GetTangentOnSegment(int segmentIndex, float t)
	// {
    //     // 真正代表segmentIndex线段的点是segmentIndex+2，所以要注意FirstSegmentKnotIndex = 2实际是hardcode的，不能修改
	// 	return FindSplineTangent(knots[segmentIndex].position, knots[segmentIndex+1].position, 
    //         knots[segmentIndex+2].position, knots[segmentIndex+3].position, t).normalized;
	// }
	
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