// Copyright 2020 Cao Gaoting<caogtaa@gmail.com>
// https://caogtaa.github.io
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

/*
 * Date: 2020-07-13 02:44:16
 * LastEditors: GT<caogtaa@gmail.com>
 * LastEditTime: 2020-07-22 14:01:57
*/ 


import MetaBallsRenderer from "../../Shader/MetaBalls/MetaBallsRenderer";

const { ccclass, property } = cc._decorator;

@ccclass
export default class SceneMetaBalls extends cc.Component {
	@property(cc.Camera)
	waterRendererCamera: cc.Camera = null;

	@property(cc.Node)
	waterRenderer: cc.Node = null;

	@property(cc.Sprite)
	waterRendererPass2: cc.Sprite = null;

	@property(MetaBallsRenderer)
	metaBallsRenderer: MetaBallsRenderer = null;

	@property(cc.Node)
	particleBox: cc.Node = null;

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

	CreateParticlesGroup() {
		let PTM_RATIO = cc.PhysicsManager.PTM_RATIO;
		var boxSize = this.particleBox.getContentSize();
		var boxPos = this.particleBox.getPosition();
		var size = cc.winSize;
		var box = new b2.PolygonShape();

		// https://google.github.io/liquidfun/API-Ref/html/classb2_polygon_shape.html#a890690250115483da6c7d69829be087e
		// Build vertices to represent an oriented box.
		// box的大小影响粒子的数量
		box.SetAsBox(
			boxSize.width / 2 / PTM_RATIO,
			boxSize.height / 2 / PTM_RATIO)

		var particleGroupDef = new b2.ParticleGroupDef();
		particleGroupDef.shape = box;
		particleGroupDef.flags = b2.waterParticle;
		particleGroupDef.position.Set(
			(boxPos.x + size.width/2) / PTM_RATIO,
			(boxPos.y + size.height/2) / PTM_RATIO);

		this._particleGroup = this._particles.CreateParticleGroup(particleGroupDef);
		this.metaBallsRenderer.SetParticles(this._particles);

		let vertsCount = this._particles.GetParticleCount();
		console.log(vertsCount);
	}

    GenerateWater() {
		this.ResetParticleGroup();

		// re-create particles in next tick
		// otherwise old particle system is not correctly released
		// this is a non-repeat schedule
		let that = this;
		cc.director.getScheduler().schedule(() => {
			that.CreateParticlesGroup();
		}, this.node, 0, 0, 0, false);
	}

    ResetParticleGroup() {
		if (this._particleGroup != null) {
			this._particleGroup.DestroyParticles(false);
			this._particles.DestroyParticleGroup(this._particleGroup);

			this._particleGroup = null;
		}
    }
}
