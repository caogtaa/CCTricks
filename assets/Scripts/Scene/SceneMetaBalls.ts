import MetaBallsRenderer from "../../Shader/MetaBalls/MetaBallsRenderer";

const { ccclass, property } = cc._decorator;

@ccclass
export default class SceneMetaBalls extends cc.Component {
	@property(cc.Camera)
	camera_water: cc.Camera = null;

	@property(cc.Sprite)
	sp_water_show: cc.Sprite = null;

	@property(cc.Node)
	shuiLongTou: cc.Node = null;

	@property(cc.Camera)
	waterRendererCamera: cc.Camera = null;

	@property(cc.Node)
	waterRenderer: cc.Node = null;

	@property(cc.Sprite)
	waterRendererPass2: cc.Sprite = null;

	@property(MetaBallsRenderer)
	metaBallsRenderer: MetaBallsRenderer = null;

	protected _started: boolean = false;

	protected _world = null;
	protected _particles = null;
	protected _particleGroup = null;

	onLoad() {
		if (!CC_EDITOR) {
			this.SetupWorld();
		}

		const texture = new cc.RenderTexture();
		let size = this.waterRendererPass2.node.getContentSize();
        texture.initWithSize(size.width, size.height);
		
        const spriteFrame = new cc.SpriteFrame();
        spriteFrame.setTexture(texture);
        this.waterRendererCamera.targetTexture = texture;
        this.waterRendererPass2.spriteFrame = spriteFrame;
	}

	SetupWorld() {
		// enable physics manager
		let physicsManager = cc.director.getPhysicsManager()
		physicsManager.enabled = true;

		let world = this._world = physicsManager._world;// new b2.World(new b2.Vec2(0, -15.0));
		var psd = new b2.ParticleSystemDef();
		psd.radius = 0.35;
		// psd.dampingStrength = 1.5;
		psd.viscousStrength = 0;

		this._particles = world.CreateParticleSystem(psd);
	}

	initParticle() {
		let PTM_RATIO = cc.PhysicsManager.PTM_RATIO;
		var shuiLongTouSize = this.shuiLongTou.getContentSize();
		var shuiLongTouPos = this.shuiLongTou.getPosition();
		var size = cc.winSize;
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

		// this._particles.SetRadius(0.35);
		this._particleGroup = this._particles.CreateParticleGroup(particleGroupDef);

		this.metaBallsRenderer.SetParticles(this._particles);

		let vertsCount = this._particles.GetParticleCount();
		console.log(vertsCount);
	}

    generateWater() {
		this._started = true;
		this.resetWater();
		this.initParticle();
	}

    resetWater() {
		if (this._particleGroup != null) {
			this._particleGroup.DestroyParticles(null);
			this._particles.DestroyParticleGroup(this._particleGroup);

			this._particleGroup = null;
		}
    }
}
