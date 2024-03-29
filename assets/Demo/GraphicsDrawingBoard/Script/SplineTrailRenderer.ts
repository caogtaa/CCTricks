const { ccclass, property } = cc._decorator;
import { CacheArray, Resetable } from "./CacheArray";
import { CatmullRomSpline, Knot, Marker, SplineParameterization } from "./CatmullRomSpline"
import { SplineTrailRendererAssembler } from "./SplineTrailAssembler";

export class ResetableVec2 extends cc.Vec2 implements Resetable {
    public Reset() {
        this.x = this.y = 0;
    }
}

export enum CornerType {
	// Mesh在拐角处连续 / 断开。目前只有原点效果是用后者，原点效果用连续的话，原点会被拉伸
	Continuous = 0,
	Fragmented = 1,
}

export enum FadeType {
	None = 0,			// 不渐变
	MeshShrinking,		// 尾巴变细
	Alpha,				// 尾巴变透明
	Both,				// 变细+变透明
}

export enum PositionType {
	World = 0,			// 使用世界坐标
	Local = 1,			// 使用本地坐标，跟随cc.Node移动
}

@ccclass
export class SplineTrailRenderer extends cc.RenderComponent {
	@property({ type: cc.Enum(PositionType) })
	_positionType: PositionType = PositionType.World;

	@property({
		type: cc.Enum(PositionType),
		displayName: '坐标类型',
		tooltip: 'World: 世界坐标，如果需要整体移动轨迹则需要移动摄像机; Local: 本地坐标，轨迹整体跟随节点移动'
	})
	set positionType(value: PositionType) {
		this._positionType = value;
		this.FlushMatProperties();
	}
	get positionType(): PositionType {
		return this._positionType;
	}

	@property({
		type: cc.Enum(CornerType),
		displayName: '折角类型',
		tooltip: '连续模式下更平滑但是局部可能出现形变; 分段模式下各分段独立绘制，适用于非连续特效'
	})
	cornerType: CornerType = CornerType.Continuous;

	@property({ type: cc.Enum(SplineParameterization) })
	_splineParam: SplineParameterization = SplineParameterization.Centripetal;

	@property({
		type: cc.Enum(SplineParameterization),
		displayName: '参数化方式',
		tooltip: '主要区别是曲线折角处理，Centripetal相对来说更加自然，计算量大一点'
	})
	set splineParam(value: SplineParameterization) {
		this._splineParam = value;
		if (!CC_EDITOR) {
			this.spline.splineParam = value;
		}
	}
	get splineParam(): SplineParameterization {
		return this._splineParam;
	}

	@property({
		type: cc.Float,
		displayName: '最大长度(px)',
		tooltip: '超出该长度后尾部会被自动裁剪'
	})
	maxLength: number = 500;

	@property({
		type: cc.Float,
		displayName: '精度(px)',
		tooltip: '每个Quad表示的线段长度，值越小曲线越平滑'
	})
	segmentLength = 30;

	@property({
		type: cc.Float,
		displayName: '曲线宽度(px)',
		tooltip: '折角处的宽度会略窄，夹角越小宽度越窄'
	})
	segmentWidth = 40;

	// 非常关键的属性，决定了头部的平滑程度
	// 取值越高头部越平滑，但是越有可能出现偏移（重算Mesh导致）
	@property({
		type: cc.Float,
		displayName: '头部平滑距离(px)',
		tooltip: '取值越高头部越平滑，但是头部可能出现位移。默认取值: 精度*2'
	})
	smoothDistance = 60;

	@property({
		displayName: '自动生成轨迹',
		tooltip: '物体移动时自动调用AddPoint()生成轨迹'
	})
	selfEmit = false;

	@property({
		type: cc.Float,
		displayName: '显示时间(s)',
		tooltip: '展示X秒后自动消失。<=0表示不消失'
	})
	showDuration: number = -1;

    // 每次重绘的头部线段数。
    // 如果重绘距离越长，头部越平滑，但是会看到明显的Mesh侧移
    // 如果重绘距离很短，折角会比较明显，同时跨Mesh的效果会出现拉伸（uv不平均）
    // 目测取值=3的情况下，折角Mesh效果较好，头部侧移可以通过宽度渐变来掩盖
    public nbSegmentToParametrize = 3; //0 means all segments
	
	public fadeType: FadeType = FadeType.None;
	public fadeLengthBegin: number = 5;
	public fadeLengthEnd = 5;

	// public debugDrawSpline = false;
	public spline: CatmullRomSpline;

	// Mesh数据，CC里需要设置进MeshData
	_vertices = new CacheArray<ResetableVec2>();
	_sideDist: number[] = [];		// a_width attribute
	_dist: number[] = [];			// a_dist attribute
	
	// uv: cc.Vec2[] = [];
    // _colors: cc.Color[] = [];

	protected _lastStartingQuad: number;      // 小于这个值的Quad不计算Mesh，配合maxLength使用
	protected _quadOffset: number;            // _quadOffset只在重分配buff的时候有用

	onLoad() {
		this.spline = new CatmullRomSpline;

		//@ts-ignore
		let gfx = cc.gfx;
		let vfmtSplineTrail = new gfx.VertexFormat([
			{ name: 'a_position', type: gfx.ATTR_TYPE_FLOAT32, num: 2 },
			{ name: 'a_width', type: gfx.ATTR_TYPE_FLOAT32, num: 1 },		// 旁侧相对于中心线的距离，范围（0, segmentWidth）
			{ name: 'a_dist', type: gfx.ATTR_TYPE_FLOAT32, num: 1 },		// 距离线段起始点的距离（累积线段长度）
			{ name: gfx.ATTR_COLOR, type: gfx.ATTR_TYPE_UINT8, num: 4, normalize: true },       // 4个uint8
		]);
		vfmtSplineTrail.name = 'vfmtSplineTrail';
		this.FlushMatProperties();

		// update spline properties
		this.spline.splineParam = this._splineParam;
	}

	start() {
		if (this.selfEmit)
			this.StartPath(this.FromLocalPos(cc.Vec2.ZERO));
	}

	update() {
		if (this.selfEmit && !CC_EDITOR) {
			let pos = this.FromLocalPos(cc.Vec2.ZERO);
			this.AddPoint(pos);
		}
	}

	public FromWorldPos(worldPos: cc.Vec2): cc.Vec2 {
		if (this._positionType === PositionType.World) {
			return worldPos;
		}

		return this.node.convertToNodeSpaceAR(worldPos);
	}

	public FromLocalPos(localPos: cc.Vec2): cc.Vec2 {
		if (this._positionType === PositionType.World) {
			return this.node.convertToWorldSpaceAR(localPos);
		}

		return localPos;
	}

	protected FlushMatProperties(): void {
		let renderer = this;
		let ass = renderer._assembler as SplineTrailRendererAssembler;
		let useWolrdPos: boolean = (this._positionType === PositionType.World);
		ass.useWorldPos = useWolrdPos;
		let mat = renderer.getMaterial(0);
		if (mat.getDefine("USE_WORLD_POS") !== undefined) {
			mat.define("USE_WORLD_POS", useWolrdPos);
		}
	}

	public StartPath(point: cc.Vec2): void {
		this._lastStartingQuad = 0;
		this._quadOffset = 0;

		this._vertices.Reset();
		// this.uv.length = 0;
		// this._colors.length = 0;

		this.spline.Clear();

		let emitTime = cc.director.getTotalTime();
		this._fixedPointIndex = 0;
		let knots = this.spline.knots;
		knots.push(new Knot(point, emitTime));
	}

	public Clear(): void {
		this.StartPath(this.node.convertToWorldSpaceAR(cc.Vec2.ZERO));
	}

	// 更换材质和属性
	public ImitateTrail(trail: SplineTrailRenderer)
	{
		// this.emit = trail.emit;
		this.smoothDistance = trail.smoothDistance;
		this.segmentWidth = trail.segmentWidth;
		this.segmentLength = trail.segmentLength;
		// this.vertexColor = trail.vertexColor;
		// this.normal = trail.normal;
		this.cornerType = trail.cornerType;
		this.fadeType = trail.fadeType;
		this.fadeLengthBegin = trail.fadeLengthBegin;
		this.fadeLengthEnd = trail.fadeLengthEnd;
		this.maxLength = trail.maxLength;
		this.splineParam = trail.splineParam;
		// this.debugDrawSpline = trail.debugDrawSpline;
		// this.GetComponent<Renderer>().material = trail.GetComponent<Renderer>().material;
	}

	// 最后一个定点的下标。新的点需要和该定点做距离比较来判断是否变为新的定点
	protected _fixedPointIndex: number = 0;
	protected _distTolerance: number = 4;

	public AddPoint(point: cc.Vec2) {
		// console.warn(`x: ${point.x}, y: ${point.y}`);
		let knots = this.spline.knots;
		if (knots.length === 0) {
			knots.push(new Knot(point));
			this._fixedPointIndex = 0;
			return;
		} else if (knots.length === 1) {
			// check distance to 1st point
			let dist = cc.Vec2.distance(knots[0].position, point);
			if (dist <= this._distTolerance) {
				// 前几个点可以密一点，不要求和smoothDistance比较
				return;
			}

			// 反向计算P0，向后计算P3
			let P0 = knots[0].position.mul(2).sub(point);
			let P3 = point.mul(2).sub(knots[0].position);
			knots.splice(0, 0, new Knot(P0));
			knots.push(new Knot(point));
			knots.push(new Knot(P3));
			if (dist > this.smoothDistance) {
				this._fixedPointIndex = 2;
			} else {
				this._fixedPointIndex = 1;
			}
			// should now render
		} else {
			// let point = this.node.position;
			// 初始5个点，最后2个点总是变化，但是有可能点又被抛弃？
			// 如果最后2个点参与渲染，那么头部就会发生偏移

			// 尝试替换P2
			// 如果和P1距离太近则直接抛弃
			let fixedPointIndex = this._fixedPointIndex;
			let P0 = knots[fixedPointIndex-1].position;
			let P1 = knots[fixedPointIndex].position;
			let dist = cc.Vec2.distance(P1, point);
			if (dist <= this._distTolerance) {
				return;
			}

			// 替换P2
			let P2 = knots[fixedPointIndex+1].position;
			P2.set(point);
			
			// P1->P2延伸重算P3
			if (knots.length <= fixedPointIndex+2)
				knots.push(new Knot(cc.v2(0, 0)));

			let P3 = knots[fixedPointIndex+2].position;
			P3.set(P2.mul(2).sub(P1));
			if (cc.Vec2.distance(P1, P2) > this.smoothDistance &&
				cc.Vec2.distance(P0, P2) > this.smoothDistance)
			{
				// 新的P2足够远，固化P2
				++ this._fixedPointIndex;				
			}
		}

		// todo: 如果没有新增节点，考虑不要进行重算。时间相关的消失通过shader控制
		// 4个控制点，最后一个点是占位用的，和P3相等
		this.RenderMesh();
	}

	protected _tmpVec2 = new cc.Vec2;
	protected _halfWidthVec2 = new cc.Vec2;
	protected _prePosition = new cc.Vec2;
	protected _preTangent = new cc.Vec2;
	protected _preBinormal = new cc.Vec2;
	protected _curPosition = new cc.Vec2;
	protected _curTangent = new cc.Vec2;
	protected _curBinormal = new cc.Vec2;
	public RenderMesh() {
		let spline = this.spline;
		if (spline.knots.length < 4)
			return;

		let segmentLength = this.segmentLength;
		let segmentWidth = this.segmentWidth;
		if (this.nbSegmentToParametrize === 0) {
			spline.Parametrize(0, spline.NbSegments-1);
		} else {
			// 倒数第3个线段开始重新计算，主要内容是细分线段（subsegment），计算每个细分线段的距离
			spline.Parametrize(spline.NbSegments-this.nbSegmentToParametrize, spline.NbSegments);
		}

		let length = Math.max(spline.Length() - 0.1, 0);		// TODO: 此处0.1是干嘛的？0.1刚好是Epsilon
			
        // _quadOffset只在重分配buff的时候有用
        // nbQuad表示渲染当前长度的线段需要的总quad数（包含已过期的quad）
		let nbQuad = Math.floor(1./segmentLength * length) + 1 - this._quadOffset;

		let startingQuad = this._lastStartingQuad;
		let lastDistance = startingQuad * segmentLength + this._quadOffset * segmentLength;			// 不需要绘制的线段已经经过的距离。每个quad表示的距离大小固定，都是segmentLength=0.2

		let marker: Marker = new Marker;		// marker是一个游标，从需要计算的quad + subsegment开始往后移动
		spline.PlaceMarker(marker, lastDistance);

		let prePosition = spline.GetPosition(marker, this._prePosition);
		let preTangent = spline.GetTangent(marker, this._preTangent);
		let preBinormal = CatmullRomSpline.ComputeBinormal(preTangent, null/*dummy*/, this._preBinormal);

		// Vector3 lastPosition = spline.GetPosition(marker);
		// Vector3 lastTangent = spline.GetTangent(marker);
		// Vector3 lastBinormal = CatmullRomSpline.ComputeBinormal(lastTangent, normal);
		
		// let drawingEnd = (this.meshDisposition === MeshDisposition.Fragmented) ? nbQuad-1 : nbQuad-1;
		let drawingEnd = nbQuad-1;
		// int drawingEnd = meshDisposition == MeshDisposition.Fragmented ? nbQuad-1 : nbQuad-1;

		let vertexPerQuad = 4;
		this._vertices.Resize((drawingEnd - startingQuad) * vertexPerQuad, ResetableVec2);
		this._sideDist.length = this._vertices.length;
		this._dist.length = this._vertices.length;
		// this._colors.length = this._vertices.length;

		for (let i=startingQuad; i<drawingEnd; i++) {
			let distance = lastDistance + segmentLength;
			let firstVertexIndex = (i-startingQuad) * vertexPerQuad;
			spline.MoveMarker(marker, distance);

			let position = spline.GetPosition(marker, this._curPosition);
			let tangent = spline.GetTangent(marker, this._curTangent);

            // Mesh在xz平面，此时normal = (0, -1, 0)
            // 此时binormal在xz平面上，往Quad的侧面走
			let binormal = CatmullRomSpline.ComputeBinormal(tangent, null/*dummy*/, this._curBinormal);

			// Vector3 binormal = CatmullRomSpline.ComputeBinormal(tangent, normal);
			let h = this.FadeMultiplier(lastDistance, length);	// be 1.0 for simple
			let h2 = this.FadeMultiplier(distance, length);		// be 1.0 for simple
			let rh = h * segmentWidth, rh2 = h2 * segmentWidth;				// be segmentWidth for simple

			// float h = FadeMultiplier(lastDistance, length);     // be 1.0 for simple
			// float h2 = FadeMultiplier(distance, length);        // be 1.0 for simple
			// float rh = h * segmentWidth, rh2 = h2 * segmentWidth;           // be segmentWidth for simple

			if (this.fadeType === FadeType.Alpha || this.fadeType === FadeType.None) {
				rh = h > 0 ? segmentWidth : 0;
				rh2 = h2 > 0 ? segmentWidth : 0;
			}
			// if(fadeType == FadeType.Alpha || fadeType == FadeType.None)
			// {
			// 	rh = h > 0 ? segmentWidth : 0;
			// 	rh2 = h2 > 0 ? segmentWidth : 0;
			// }

            // 核心代码！！！
			if (this.cornerType == CornerType.Continuous)
			{
				let tmpVec2 = this._tmpVec2;

                // quad是一个四边形，每个途经点沿自己的两侧延伸
				let halfWidth = preBinormal.mul(rh * 0.5, this._halfWidthVec2);
				this._vertices.Get(firstVertexIndex).set(prePosition.add(halfWidth, tmpVec2));
				this._vertices.Get(firstVertexIndex + 1).set(prePosition.add(halfWidth.neg(tmpVec2), tmpVec2));

				halfWidth = binormal.mul(rh2 * 0.5, halfWidth);
        		this._vertices.Get(firstVertexIndex + 2).set(position.add(halfWidth, tmpVec2));
				this._vertices.Get(firstVertexIndex + 3).set(position.add(halfWidth.neg(tmpVec2), tmpVec2));

				// 注释部分是以上代码的易读版本
				// this._vertices[firstVertexIndex] = lastPosition.add(lastBinormal.mul(rh * 0.5));
				// this._vertices[firstVertexIndex + 1] = lastPosition.add(lastBinormal.mul(-rh * 0.5));
        		// this._vertices[firstVertexIndex + 2] = position.add(binormal.mul(rh2 * 0.5));
				// this._vertices[firstVertexIndex + 3] = position.add(binormal.mul(-rh2 * 0.5));

				this._sideDist[firstVertexIndex] = 0;
				this._sideDist[firstVertexIndex + 1] = segmentWidth;
				this._sideDist[firstVertexIndex + 2] = 0;
				this._sideDist[firstVertexIndex + 3] = segmentWidth;

				this._dist[firstVertexIndex] = lastDistance;
				this._dist[firstVertexIndex + 1] = lastDistance;
				this._dist[firstVertexIndex + 2] = distance;
				this._dist[firstVertexIndex + 3] = distance;
            
				// this.uv[firstVertexIndex] =  new Vector2(lastDistance/segmentWidth, 1);  
				// this.uv[firstVertexIndex + 1] = new Vector2(lastDistance/segmentWidth, 0);
        		// this.uv[firstVertexIndex + 2] = new Vector2(distance/segmentWidth, 1); 
				// this.uv[firstVertexIndex + 3] = new Vector2(distance/segmentWidth, 0);
			}
			else
			{
                // quad是一个长方形，保持上一个点的切向伸展
				// 以起点为中心两头延伸，这样segment衔接的时候更加自然
				// todo: use preposition instead
				let tmpVec2 = this._tmpVec2;
				prePosition.addSelf(preTangent.mul(segmentLength * -0.5, tmpVec2));

				// 注意此处值已经覆盖，后面不要用
				let halfWidth = preBinormal.mul(rh * 0.5, this._halfWidthVec2);
				this._vertices.Get(firstVertexIndex).set(prePosition.add(halfWidth, tmpVec2));
				this._vertices.Get(firstVertexIndex + 1).set(prePosition.add(halfWidth.neg(tmpVec2), tmpVec2));

				// prePosition向后移动一个segment
				prePosition.addSelf(preTangent.mul(segmentLength, tmpVec2));
				this._vertices.Get(firstVertexIndex + 2).set(prePosition.add(halfWidth, tmpVec2));
				this._vertices.Get(firstVertexIndex + 3).set(prePosition.add(halfWidth.neg(tmpVec2), tmpVec2));

				// 注释部分是以上代码的易读版本
				// this._vertices[firstVertexIndex] = pos.add(lastBinormal.mul(rh * 0.5));
			    // this._vertices[firstVertexIndex + 1] = pos.add(lastBinormal.mul(-rh * 0.5));
        	    // this._vertices[firstVertexIndex + 2] = pos.add(preTangent.mul(segmentLength)).add(lastBinormal.mul(rh * 0.5));
			    // this._vertices[firstVertexIndex + 3] = pos.add(preTangent.mul(segmentLength)).add(lastBinormal.mul(-rh * 0.5));

				this._sideDist[firstVertexIndex] = 0;
				this._sideDist[firstVertexIndex + 1] = segmentWidth;
				this._sideDist[firstVertexIndex + 2] = 0;
				this._sideDist[firstVertexIndex + 3] = segmentWidth;

				this._dist[firstVertexIndex] = lastDistance;
				this._dist[firstVertexIndex + 1] = lastDistance;
				this._dist[firstVertexIndex + 2] = distance;
				this._dist[firstVertexIndex + 3] = distance;
				
				// this.uv[firstVertexIndex] =  cc.v2(0, 1);  
			    // this.uv[firstVertexIndex + 1] = cc.v2(0, 0);
        	    // this.uv[firstVertexIndex + 2] = cc.v2(1, 1); 
			    // this.uv[firstVertexIndex + 3] = cc.v2(1, 0);
			}

			// let color = this.node.color;
			// this._colors[firstVertexIndex] = color;
			// this._colors[firstVertexIndex + 1] = color;
        	// this._colors[firstVertexIndex + 2] = color;
			// this._colors[firstVertexIndex + 3] = color;

			// if (this.fadeType == FadeType.Alpha || this.fadeType == FadeType.Both) {
			// 	this._colors[firstVertexIndex].a *= h;
			// 	this._colors[firstVertexIndex + 1].a *= h;
        	// 	this._colors[firstVertexIndex + 2].a *= h2;
			// 	this._colors[firstVertexIndex + 3].a *= h2;
			// }

			prePosition.set(position);
			preTangent.set(tangent);
			preBinormal.set(binormal);
			lastDistance = distance;
		}

        // 根据maxLength计算下次刷新计算的第一个quad，如果总长度很长了，下次计算会出现一些截断
		this._lastStartingQuad = Math.max(0, nbQuad - (Math.floor(this.maxLength / segmentLength) + 5));

		// update mesh parameter
		let renderer = this;
		let mat = renderer.getMaterial(0);
		if (mat.getProperty("size", 0) !== undefined) {
			mat.setProperty("size", [segmentLength, segmentWidth, 1/segmentLength, 1/segmentWidth]);
		}

		// mark for dirty
		// force assembler to refresh
		this.setVertsDirty();
	}

	protected FadeMultiplier(distance: number, length: number): number {
		// todo: use multiplier in shader
		return 1.0;

		// float ha = Mathf.Clamp01((distance - Mathf.Max(length-maxLength, 0)) / fadeLengthBegin);
		// float hb = Mathf.Clamp01((length-distance) / fadeLengthEnd);

		// return Mathf.Min(ha, hb);
	}
}
