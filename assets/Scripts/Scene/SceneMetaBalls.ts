
const { ccclass, property } = cc._decorator;

@ccclass
export default class SceneMetaBalls extends cc.Component {
	@property(cc.Camera)
	camera_water: cc.Camera = null;

	@property(cc.Sprite)
	sp_water_show: cc.Sprite = null;

	@property(cc.Node)
	shuiLongTou: cc.Node = null;

	@property(cc.Node)
	waterRenderer: cc.Node = null;

	protected _started: boolean = false;
	protected pymanager: cc.PhysicsManager = null;
	protected particleSystem: cc.ParticleSystem = null;

	onLoad() {
		this.pymanager = cc.director.getPhysicsManager();
		this.pymanager.start();

		const texture = new cc.RenderTexture();
		let size = this.sp_water_show.node.getContentSize();
        texture.initWithSize(size.width, size.height);
		
        const spriteFrame = new cc.SpriteFrame();
        spriteFrame.setTexture(texture);
        this.camera_water.targetTexture = texture;
        this.sp_water_show.spriteFrame = spriteFrame;
	}

	initParticle() {
		let PTM_RATIO = cc.PhysicsManager.PTM_RATIO;
		var shuiLongTouSize = this.shuiLongTou.getContentSize();
		var shuiLongTouPos = this.shuiLongTou.getPosition();
		var size = cc.winSize;
		this.particleSystem = this.pymanager._particles;
		var box = new b2.PolygonShape();

		// https://google.github.io/liquidfun/API-Ref/html/classb2_polygon_shape.html#a890690250115483da6c7d69829be087e
		// Build vertices to represent an oriented box.
		// box的大小影响粒子的数量？？？
		box.SetAsBox(
			shuiLongTouSize.width/2/PTM_RATIO,
			(shuiLongTouSize.height * 1.8) / PTM_RATIO);

		var particleGroupDef = new b2.ParticleGroupDef();
		particleGroupDef.shape = box;
		particleGroupDef.flags = b2.waterParticle;
		particleGroupDef.position.Set(
			(shuiLongTouPos.x + size.width/2) / PTM_RATIO,
			(shuiLongTouPos.y + size.height/2 + shuiLongTouSize.height* 1.2) / PTM_RATIO);

		this.particleSystem.SetRadius(0.35);
		this.particleGroup = this.particleSystem.CreateParticleGroup(particleGroupDef);
		let vertsCount = this.particleSystem.GetParticleCount();
		this.totalCount = vertsCount;
		this._mat = this.sp_water_show.getMaterial(0);
		this._mat.setProperty('resolution',new Float32Array(4));
		this._mat.setProperty('metaballs',new Float32Array(vertsCount * 4));
		console.log(vertsCount);
	}

    generateWater() {
		this._started = true;
        this.resetWater();
		setTimeout(()=>{
			this.initParticle();
			this.schedule(this.scheduleWater, 0.01);
		},500);
	}
	
    scheduleWater() {
		if (!this._started)
			return;

		let PTM_RATIO = cc.PhysicsManager.PTM_RATIO;
		if(this.particleSystem != null){
			let tmp = [];
			let vertsCount = this.particleSystem.GetParticleCount();
			let posVerts = this.particleSystem.GetPositionBuffer();
			let r = this.particleSystem.GetRadius() * PTM_RATIO;
			for (let i = 0; i < vertsCount; i++) {
				tmp.push(posVerts[i].x * PTM_RATIO);
				tmp.push(posVerts[i].y * PTM_RATIO);
				tmp.push(r);
				tmp.push(0.0);
			}
			let size = this.shuiLongTou.getContentSize();
			if(this._mat){
				this._mat.setProperty('resolution',[640.0,1136.0,vertsCount,this.shuiLongTou.y - size.height/2 + 568]);
				this._mat.setProperty('metaballs',tmp);
			}
		}
    }

    resetWater() {
        this.unschedule(this.scheduleWater);
		/*
		if(this._mat){
			this._mat.setProperty('metaballs',new Float32Array(this.totalCount * 4));
		}
		*/
		if(this.particleSystem != null){
			this.particleGroup.DestroyParticles(null);
			this.particleSystem.DestroyParticleGroup(this.particleGroup);
			this.particleSystem = null;
		}
    }
}


// cc.Class({
//     extends: cc.Component,

//     properties: {
// 		camera_water: cc.Camera,
// 		sp_water_show: cc.Sprite,
// 		shuiLongTou:cc.Node,
//     },
//     onLoad() {
// 		this.pymanager = cc.director.getPhysicsManager();
// 		this.pymanager.start()
// 		/*
// 		this.pymanager.debugDrawFlags = cc.PhysicsManager.DrawBits.e_aabbBit |
// 			cc.PhysicsManager.DrawBits.e_pairBit |
// 			cc.PhysicsManager.DrawBits.e_centerOfMassBit |
// 			cc.PhysicsManager.DrawBits.e_jointBit |
// 			cc.PhysicsManager.DrawBits.e_shapeBit //|
// 			//cc.PhysicsManager.DrawBits.e_particleBit
// 			;
// 			*/
// 		const texture = new cc.RenderTexture();
// 		let size = this.sp_water_show.node.getContentSize();
//         texture.initWithSize(size.width, size.height);
		
//         const spriteFrame = new cc.SpriteFrame();
//         spriteFrame.setTexture(texture);
//         this.camera_water.targetTexture = texture;
//         this.sp_water_show.spriteFrame = spriteFrame;
//     },

// });
