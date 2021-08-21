const { ccclass, property } = cc._decorator;
import { CatmullRomSpline, Knot, Marker } from "./CatmullRomSpline"

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

// Advanced Parameters
const baseNbQuad = 500;			// 初始buff大小
const nbQuadIncrement = 200;	// buff不足时增加的容量
const lengthToRedraw = 0;
const shiftMeshData: boolean = false;

//
const NbVertexPerQuad = 4;
const NbTriIndexPerQuad = 6;

@ccclass
export class SplineTrailRenderer extends cc.Component {
	@property(cc.MeshRenderer)
	renderer: cc.MeshRenderer = null;

	@property({
		type: cc.Enum(CornerType),
		displayName: '折角类型'
	})
	cornerType: CornerType = CornerType.Continuous;

	@property(cc.Texture2D)
	_texture: cc.Texture2D = null;

	// @property({
	// 	type: cc.Texture2D,
	// 	displayName: '贴图'
	// })
	// set texture(value: cc.Texture2D) {
	// 	this._texture = value;
	// 	if (!CC_EDITOR) {
	// 		this.UpdateMaterialTexture();
	// 	}
	// }
	// get texture(): cc.Texture2D {
	// 	return this._texture;
	// }

	@property({
		type: cc.Float,
		displayName: '片段长度',
		tooltip: '每个Quad表示的线段长度，值越小曲线越平滑'
	})
	segmentLength = 30;

	@property({
		type: cc.Float,
		displayName: '曲线宽度',
		tooltip: '折角处的宽度会略窄，夹角越小宽度越窄'
	})
	segmentWidth = 40;

	// 非常关键的属性，决定了头部的平滑程度
	// 取值越高头部越平滑，但是越有可能出现偏移（重算Mesh导致）
	@property({
		type: cc.Float,
		displayName: '头部平滑距离',
		tooltip: '取值越高头部越平滑，但是头部可能出现位移'
	})
	smoothDistance = 60;

	// public enum MeshDisposition { Continuous, Fragmented };         
	// public enum FadeType { None, MeshShrinking, Alpha, Both }       // 不渐变、尾巴变细、尾巴变透明、变细+变透明

	// public class AdvancedParameters
	// {
	// 	public int baseNbQuad = 500;
	// 	public int nbQuadIncrement = 200;               // buff不足时增加的容量
	// 	//public bool releaseMemoryOnClear = true;
	// 	public float lengthToRedraw = 0; //0 means fadeDistance and should suffice, but you can
	// 									 //redraw a smaller section when there is no fade as an 
	// 									 //optimization
	// 	public bool shiftMeshData = false; //optimization to prevent memory shortage on very long
	// 									   //trails. May induce lag spikes when shifting.
	// 									   //todo: fix the exception induced by modifying the max length (mesh sliding)
	// }

    // 每次重绘的头部线段数。
    // 如果重绘距离越长，头部越平滑，但是会看到明显的Mesh侧移
    // 如果重绘距离很短，折角会比较明显，同时跨Mesh的效果会出现拉伸（uv不平均）
    // 目测取值=3的情况下，折角Mesh效果较好，头部侧移可以通过宽度渐变来掩盖
    public nbSegmentToParametrize = 3; //0 means all segments
	
	public emit = true;
	public vertexColor = cc.Color.WHITE;
	// public Vector3 normal = new Vector3(0, 0, 1);
	public fadeType: FadeType = FadeType.None;
	public fadeLengthBegin: number = 5;
	public fadeLengthEnd = 5;

	public maxLength = 500;           // 显示给用户的长度。超出部分的线段不生成Mesh
	public debugDrawSpline = false;

	// private AdvancedParameters advancedParameters = new AdvancedParameters(); 

	// [HideInInspector]
	public spline: CatmullRomSpline;

	// Mesh数据，CC里需要设置进MeshData
	_vertices: cc.Vec2[];
	_sideDist: number[] = [];		// a_width attribute
	_dist: number[] = [];			// a_dist attribute
	
	triangles: number[];
	uv: cc.Vec2[];
    colors: cc.Color[];
	// normals: cc.Vec2[];

	protected _origin = cc.Vec2.ZERO;		// 始终是0，考虑移除
	protected _maxInstanciedTriCount: number = 0;
	// private Mesh mesh;
	protected _allocatedNbQuad: number;		// 已经分配的Quad buff
	protected _lastStartingQuad: number;      // 小于这个值的Quad不计算Mesh，配合maxLength使用
	protected _quadOffset: number;            // _quadOffset只在重分配buff的时候有用
	protected _mesh: cc.Mesh = null;

	onLoad() {
		this.spline = new CatmullRomSpline;

		//@ts-ignore
		let gfx = cc.gfx;
		let vfmtPosColorDist = new gfx.VertexFormat([
			{ name: 'a_position', type: gfx.ATTR_TYPE_FLOAT32, num: 2 },
			{ name: 'a_width', type: gfx.ATTR_TYPE_FLOAT32, num: 1 },		// 旁侧相对于中心线的距离，范围（0, segmentWidth）
			{ name: 'a_dist', type: gfx.ATTR_TYPE_FLOAT32, num: 1 },		// 距离线段起始点的距离（累积线段长度）
		]);
		vfmtPosColorDist.name = 'vfmtPosColorDist';

		this._mesh = new cc.Mesh;
		this._mesh.init(vfmtPosColorDist, 2000, true);
		this.renderer.mesh = this._mesh;

		if (this._texture) {
			this.UpdateMaterialTexture();
		}
	}

	start() {
		this.Init();
	}

	protected UpdateMaterialTexture(): void {
		return;
		let mat = this.renderer?.getMaterial(0);
		if (mat?.getProperty('texture', 0) !== undefined) {
			mat.setProperty('texture', this._texture);
		}
	}

	public StartPath(point: cc.Vec2): void {
		this._origin = cc.Vec2.ZERO;

		this._allocatedNbQuad = baseNbQuad;
		this._maxInstanciedTriCount = 0;
		this._lastStartingQuad = 0;
		this._quadOffset = 0;

		this._vertices = new Array<cc.Vec2>(baseNbQuad * NbVertexPerQuad);
		this.triangles = new Array<number>(baseNbQuad * NbTriIndexPerQuad);
		this.uv = new Array<cc.Vec2>(baseNbQuad * NbVertexPerQuad);
		this.colors = new Array<cc.Color>(baseNbQuad * NbVertexPerQuad);
		// this.normals = new Array<cc.Vec2>(baseNbQuad * NbVertexPerQuad);

		this.spline.Clear();

		let knots = this.spline.knots;

		knots.push(new Knot(point));
		knots.push(new Knot(point));
		knots.push(new Knot(point));
		knots.push(new Knot(point));
		knots.push(new Knot(point));
	}

	public Clear(): void {
		this.Init();
	}

	// 更换材质和属性
	public ImitateTrail(trail: SplineTrailRenderer)
	{
		this.emit = trail.emit;
		this.smoothDistance = trail.smoothDistance;
		this.segmentWidth = trail.segmentWidth;
		this.segmentLength = trail.segmentLength;
		this.vertexColor = trail.vertexColor;
		// this.normal = trail.normal;
		this.cornerType = trail.cornerType;
		this.fadeType = trail.fadeType;
		this.fadeLengthBegin = trail.fadeLengthBegin;
		this.fadeLengthEnd = trail.fadeLengthEnd;
		this.maxLength = trail.maxLength;
		this.debugDrawSpline = trail.debugDrawSpline;
		// this.GetComponent<Renderer>().material = trail.GetComponent<Renderer>().material;
	}

	// TODO: maybe lateUpdate
	public AddPoint(point: cc.Vec2) {
		if (this.emit) {
			let knots = this.spline.knots;
			// let point = this.node.position;
			// 初始5个点，最后2个点总是变化，但是有可能点又被抛弃？
			// 如果最后2个点参与渲染，那么头部就会发生偏移
			knots[knots.length-1].position = point;
			knots[knots.length-2].position = point;

			if (cc.Vec2.distance(knots[knots.length-3].position, point) > this.smoothDistance &&
				cc.Vec2.distance(knots[knots.length-4].position, point) > this.smoothDistance)
			{
				knots.push(new Knot(point));
			}
		}

		this.RenderMesh();
	}

	protected RenderMesh() {
		let spline = this.spline;
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
		// int nbQuad = ((int)(1f/segmentLength * length)) + 1 - _quadOffset;

		if (this._allocatedNbQuad < nbQuad) {
			console.error("handle overflow");
		}
		
		// if(_allocatedNbQuad < nbQuad) //allocate more memory for the mesh
		// {
		// 	Reallocate(nbQuad);
		// 	length = Mathf.Max(spline.Length() - 0.1f, 0);
		// 	nbQuad = ((int)(1f/segmentLength * length)) + 1 - _quadOffset;
		// }

		let startingQuad = this._lastStartingQuad;
		let lastDistance = startingQuad * segmentLength + this._quadOffset * segmentLength;			// 不需要绘制的线段已经经过的距离。每个quad表示的距离大小固定，都是segmentLength=0.2
		this._maxInstanciedTriCount = Math.max(this._maxInstanciedTriCount, (nbQuad-1) * NbTriIndexPerQuad);

		// int startingQuad = _lastStartingQuad;
		// float lastDistance = startingQuad * segmentLength + _quadOffset * segmentLength;            // 不需要绘制的线段已经经过的距离。每个quad表示的距离大小固定，都是segmentLength=0.2
		// _maxInstanciedTriCount = System.Math.Max(_maxInstanciedTriCount, (nbQuad-1) * NbTriIndexPerQuad);

		let marker: Marker = new Marker;		// marker是一个游标，从需要计算的quad + subsegment开始往后移动
		spline.PlaceMarker(marker, lastDistance);

		// CatmullRomSpline.Marker marker = new CatmullRomSpline.Marker();             // marker是一个游标，从需要计算的quad + subsegment开始往后移动
		// spline.PlaceMarker(marker, lastDistance); 

		let lastPosition = spline.GetPosition(marker);
		let lastTangent = spline.GetTangent(marker);
		let lastBinormal = CatmullRomSpline.ComputeBinormal(lastTangent, null/*dummy*/);

		// Vector3 lastPosition = spline.GetPosition(marker);
		// Vector3 lastTangent = spline.GetTangent(marker);
		// Vector3 lastBinormal = CatmullRomSpline.ComputeBinormal(lastTangent, normal);
		
		// let drawingEnd = (this.meshDisposition === MeshDisposition.Fragmented) ? nbQuad-1 : nbQuad-1;
		let drawingEnd = nbQuad-1;
		// int drawingEnd = meshDisposition == MeshDisposition.Fragmented ? nbQuad-1 : nbQuad-1;

		this._vertices.length = drawingEnd * NbVertexPerQuad;
		this._sideDist.length = this._vertices.length;
		this._dist.length = this._vertices.length;

		this.triangles.length = drawingEnd * NbTriIndexPerQuad;
		for (let i=startingQuad; i<drawingEnd; i++) {
			let distance = lastDistance + segmentLength;
			let firstVertexIndex = i * NbVertexPerQuad;
			let firstTriIndex = i * NbTriIndexPerQuad;
			spline.MoveMarker(marker, distance);

			let position = spline.GetPosition(marker);
			let tangent = spline.GetTangent(marker);

			// float distance = lastDistance+segmentLength;
			// int firstVertexIndex = i * NbVertexPerQuad;
			// int firstTriIndex = i * NbTriIndexPerQuad;
			// spline.MoveMarker(marker, distance);

			// Vector3 position = spline.GetPosition(marker);
			// Vector3 tangent = spline.GetTangent(marker);

            // Mesh在xz平面，此时normal = (0, -1, 0)
            // 此时binormal在xz平面上，往Quad的侧面走
			let binormal = CatmullRomSpline.ComputeBinormal(tangent, null/*dummy*/);

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
                // quad是一个四边形，每个途经点沿自己的两侧延伸
				this._vertices[firstVertexIndex] = lastPosition.add(lastBinormal.mul(rh * 0.5));
				this._vertices[firstVertexIndex + 1] = lastPosition.add(lastBinormal.mul(-rh * 0.5));
        		this._vertices[firstVertexIndex + 2] = position.add(binormal.mul(rh2 * 0.5));
				this._vertices[firstVertexIndex + 3] = position.add(binormal.mul(-rh2 * 0.5));

				this._sideDist[firstVertexIndex] = 0;
				this._sideDist[firstVertexIndex + 1] = segmentWidth;
				this._sideDist[firstVertexIndex + 2] = 0;
				this._sideDist[firstVertexIndex + 3] = segmentWidth;

				this._dist[firstVertexIndex] = lastDistance;
				this._dist[firstVertexIndex + 1] = lastDistance;
				this._dist[firstVertexIndex + 2] = distance;
				this._dist[firstVertexIndex + 3] = distance;

				// this._vertices[firstVertexIndex] = transform.InverseTransformPoint(lastPosition - _origin + (lastBinormal * (rh * 0.5f)));
				// this._vertices[firstVertexIndex + 1] = transform.InverseTransformPoint(lastPosition - _origin + (-lastBinormal * (rh * 0.5f)));
        		// this._vertices[firstVertexIndex + 2] = transform.InverseTransformPoint(position - _origin + (binormal * (rh2 * 0.5f)));
				// this._vertices[firstVertexIndex + 3] = transform.InverseTransformPoint(position - _origin + (-binormal * (rh2 * 0.5f)));
            
				// this.uv[firstVertexIndex] =  new Vector2(lastDistance/segmentWidth, 1);  
				// this.uv[firstVertexIndex + 1] = new Vector2(lastDistance/segmentWidth, 0);
        		// this.uv[firstVertexIndex + 2] = new Vector2(distance/segmentWidth, 1); 
				// this.uv[firstVertexIndex + 3] = new Vector2(distance/segmentWidth, 0);
			}
			else
			{
                // quad是一个长方形，保持上一个点的切向伸展
				// todo: 这里有点小问题，应该取新、旧两点的中点，并且取两者切线的平均值，法线也相应种蒜
				let pos = lastPosition.add(lastTangent.mul(segmentLength * -0.5));
				// Vector3 pos = lastPosition + (lastTangent * segmentLength * -0.5f) - _origin;

				// todo: optimize code
				this._vertices[firstVertexIndex] = pos.add(lastBinormal.mul(rh * 0.5));
			    this._vertices[firstVertexIndex + 1] = pos.add(lastBinormal.mul(-rh * 0.5));
        	    this._vertices[firstVertexIndex + 2] = pos.add(lastTangent.mul(segmentLength)).add(lastBinormal.mul(rh * 0.5));
			    this._vertices[firstVertexIndex + 3] = pos.add(lastTangent.mul(segmentLength)).add(lastBinormal.mul(-rh * 0.5));

				this._sideDist[firstVertexIndex] = 0;
				this._sideDist[firstVertexIndex + 1] = segmentWidth;
				this._sideDist[firstVertexIndex + 2] = 0;
				this._sideDist[firstVertexIndex + 3] = segmentWidth;

				this._dist[firstVertexIndex] = lastDistance;
				this._dist[firstVertexIndex + 1] = lastDistance;
				this._dist[firstVertexIndex + 2] = distance;
				this._dist[firstVertexIndex + 3] = distance;

				// this._vertices[firstVertexIndex] = transform.InverseTransformPoint(pos + (lastBinormal * (rh * 0.5f)));
			    // this._vertices[firstVertexIndex + 1] = transform.InverseTransformPoint(pos + (-lastBinormal * (rh * 0.5f)));
        	    // this._vertices[firstVertexIndex + 2] = transform.InverseTransformPoint(pos + (lastTangent * segmentLength) + (lastBinormal * (rh * 0.5f)));
			    // this._vertices[firstVertexIndex + 3] = transform.InverseTransformPoint(pos + (lastTangent * segmentLength) + (-lastBinormal * (rh * 0.5f)));
				
				// this.uv[firstVertexIndex] =  cc.v2(0, 1);  
			    // this.uv[firstVertexIndex + 1] = cc.v2(0, 0);
        	    // this.uv[firstVertexIndex + 2] = cc.v2(1, 1); 
			    // this.uv[firstVertexIndex + 3] = cc.v2(1, 0);
			}

			this.triangles[firstTriIndex] = firstVertexIndex;
			this.triangles[firstTriIndex + 1] = firstVertexIndex + 1;
			this.triangles[firstTriIndex + 2] = firstVertexIndex + 2;
			this.triangles[firstTriIndex + 3] = firstVertexIndex + 2; 
			this.triangles[firstTriIndex + 4] = firstVertexIndex + 1;
			this.triangles[firstTriIndex + 5] = firstVertexIndex + 3; 

			// this.colors[firstVertexIndex] = vertexColor;
			// this.colors[firstVertexIndex + 1] = vertexColor;
        	// this.colors[firstVertexIndex + 2] = vertexColor;
			// this.colors[firstVertexIndex + 3] = vertexColor;

			if (this.fadeType == FadeType.Alpha || this.fadeType == FadeType.Both) {
				this.colors[firstVertexIndex].a *= h;
				this.colors[firstVertexIndex + 1].a *= h;
        		this.colors[firstVertexIndex + 2].a *= h2;
				this.colors[firstVertexIndex + 3].a *= h2;
			}

			lastPosition = position;
			lastTangent = tangent;
			lastBinormal = binormal;
			lastDistance = distance;
		}
		
		// _maxInstanciedTriCount是上次绘制的最大值，清理掉。（实际上设置正确length就行）
		// for (let i=(nbQuad-1)*NbTriIndexPerQuad; i<this._maxInstanciedTriCount; i++) //clear a few tri ahead
		// 	this.triangles[i] = 0;

        // 根据maxLength计算下次刷新计算的第一个quad，如果总长度很长了，下次计算会出现一些截断
		this._lastStartingQuad = lengthToRedraw == 0 ? 
			Math.max(0, nbQuad - (Math.floor(this.maxLength / segmentLength) + 5)) :
			Math.max(0, nbQuad - (Math.floor(lengthToRedraw / segmentLength) + 5));

		this._mesh.setVertices("a_position", this._vertices)
		this._mesh.setVertices("a_width", this._sideDist);
		this._mesh.setVertices("a_dist", this._dist);
		this._mesh.setIndices(this.triangles, 0, true);

		// update mesh parameter
		let mat = this.renderer.getMaterial(0);
		if (mat.getProperty("size", 0) !== undefined) {
			mat.setProperty("size", [segmentLength, segmentWidth, 1/segmentLength, 1/segmentWidth]);
		}
	}

	// private void OnDrawGizmos()
    // {
	// 	//DebugDrawEquallySpacedDots();
	// 	if(advancedParameters != null && spline != null && debugDrawSpline)
	// 	{
	// 		spline.DebugDrawSpline();
	// 	}
	// 	//DebugDrawSubKnots();
    // }

	protected Init(): void {
		this._origin = cc.Vec2.ZERO;//Vector3.zero;//transform.position;

		// mesh = GetComponent<MeshFilter>().mesh;
		// mesh.MarkDynamic();

		this._allocatedNbQuad = baseNbQuad;
		this._maxInstanciedTriCount = 0;
		this._lastStartingQuad = 0;
		this._quadOffset = 0;

		this._vertices = new Array<cc.Vec2>(baseNbQuad * NbVertexPerQuad);
		this.triangles = new Array<number>(baseNbQuad * NbTriIndexPerQuad);
		this.uv = new Array<cc.Vec2>(baseNbQuad * NbVertexPerQuad);
		this.colors = new Array<cc.Color>(baseNbQuad * NbVertexPerQuad);
		// this.normals = new Array<cc.Vec2>(baseNbQuad * NbVertexPerQuad);

		// if (normal == Vector3.zero)
		// {
		// 	normal = (transform.position - Camera.main.transform.position).normalized;
		// }

		// for(int i=0; i<normals.Length; i++)
		// {
		// 	normals[i] = normal;
		// }

		//spline.knots.Clear();
		this.spline.Clear();

		let knots = this.spline.knots;
		let point = this.node.position;
		// Vector3 point = transform.position;

		knots.push(new Knot(point));
		knots.push(new Knot(point));
		knots.push(new Knot(point));
		knots.push(new Knot(point));
		knots.push(new Knot(point));
	}

	// private void Reallocate(int nbQuad)
	// {
	// 	if(advancedParameters.shiftMeshData && _lastStartingQuad > 0/*advancedParameters.nbQuadIncrement / 4*/) //slide
	// 	{
	// 		int newIndex = 0;
	// 		for(int i=_lastStartingQuad; i<nbQuad; i++)
	// 		{
	// 			_vertices[newIndex] = _vertices[i];
	// 			triangles[newIndex] = triangles[i];
	// 			uv[newIndex] = uv[i];
	// 			colors[newIndex] = colors[i];
	// 			normals[newIndex] =  normals[i];

	// 			newIndex++;
	// 		}

	// 		_quadOffset += _lastStartingQuad;
	// 		_lastStartingQuad = 0;
	// 	}
		
	// 	if(_allocatedNbQuad < nbQuad - _quadOffset)
	// 	{
	// 		if((_allocatedNbQuad + advancedParameters.nbQuadIncrement) * NbVertexPerQuad > 65000)
	// 		{
	// 			Clear();
	// 			return;
	// 		}

	// 		_allocatedNbQuad += advancedParameters.nbQuadIncrement;

	// 		Vector3[] vertices2 = new Vector3[_allocatedNbQuad * NbVertexPerQuad];
	// 		int[] triangles2 = new int[_allocatedNbQuad * NbTriIndexPerQuad];
	// 		Vector2[] uv2 = new Vector2[_allocatedNbQuad * NbVertexPerQuad];
	// 		Color[] colors2 = new Color[_allocatedNbQuad * NbVertexPerQuad];
	// 		Vector3[] normals2 = new Vector3[_allocatedNbQuad * NbVertexPerQuad];

	// 		_vertices.CopyTo(vertices2, 0);
	// 		triangles.CopyTo(triangles2, 0);
	// 		uv.CopyTo(uv2, 0);
	// 		colors.CopyTo(colors2, 0);
	// 		normals.CopyTo(normals2, 0);

	// 		_vertices = vertices2;
	// 		triangles = triangles2;
	// 		uv = uv2;
	// 		colors = colors2;
	// 		normals = normals2;
			
	// 	}
	// }

	protected FadeMultiplier(distance: number, length: number): number {
		// todo: use multiplier in shader
		return 1.0;

		// float ha = Mathf.Clamp01((distance - Mathf.Max(length-maxLength, 0)) / fadeLengthBegin);
		// float hb = Mathf.Clamp01((length-distance) / fadeLengthEnd);

		// return Mathf.Min(ha, hb);
	}
}
