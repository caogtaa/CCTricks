// Copyright 2020 Cao Gaoting<caogtaa@gmail.com>
// https://caogtaa.github.io
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

/*
 * Date: 2020-07-13 02:44:16
 * LastEditors: GT<caogtaa@gmail.com>
 * LastEditTime: 2020-07-22 14:01:57
*/ 


import MetaBallsRenderer from "./Shader/MetaBalls/MetaBallsRenderer";

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

var enableLowLevelOptimize = true;
if (enableLowLevelOptimize) {
	cc.game.once(cc.game.EVENT_ENGINE_INITED, () => {
		// b2ParticleSystem.prototype.FindContacts_Reference = function (contacts) {
		//@ts-ignore
		b2.ParticleSystem.prototype.FindContacts_Reference = function (contacts) {
			if (!this.m_flagsBuffer.data) {
				throw new Error();
			}
			if (!this.m_positionBuffer.data) {
				throw new Error();
			}

			var pos_data = this.m_positionBuffer.data;
			var squaredDiameter = this.m_squaredDiameter;
			var inverseDiameter = this.m_inverseDiameter;

			// DEBUG: b2Assert(contacts === this.m_contactBuffer);
			var beginProxy = 0;
			var endProxy = this.m_proxyBuffer.count;
			this.m_contactBuffer.count = 0;
			// let contactBuffer = this.m_contactBuffer;
			var proxyData = this.m_proxyBuffer.data;
			//@ts-ignore
			var computeRelativeTag = b2.ParticleSystem.computeRelativeTag;
			// var AddContact = this.AddContact2.bind(this);

			var dataA;
			var tagA = 0;
			var indexA = 0;
			var rightTag = 0;
			var dataB;

			var pos_data = this.m_positionBuffer.data;
			var flagBufferData = this.m_flagsBuffer.data;
			var flagBufferDataA;
			var indexB = 0;
			var pos_dataA;
			var pos_dataB;

			var ax = 0, ay = 0, bx = 0, by = 0, dx = 0, dy = 0;
			var distBtParticlesSq = 0;

			var bottomLeftTag = 0;
			var bottomRightTag = 0;

			var isFin = isFinite;

			for (var a = beginProxy, c = beginProxy; a < endProxy; ++a) {
				dataA = proxyData[a];
				tagA = dataA.tag;
				indexA = dataA.index;
				pos_dataA = pos_data[indexA];
				flagBufferDataA = flagBufferData[indexA];

				rightTag = computeRelativeTag(tagA, 1, 0);
				for (var b = a + 1; b < endProxy; ++b) {
					dataB = proxyData[b];
					if (rightTag < dataB.tag) {
						break;
					}
					
					// ------- AddContact(indexA, proxyData[b].index, contactBuffer);
					indexB = dataB.index;
					// pos_dataA = pos_data[indexA];
					pos_dataB = pos_data[indexB];
					
					// DEBUG: b2Assert(contacts === this.m_contactBuffer);
					///b2Vec2 d = m_positionBuffer.data[b] - m_positionBuffer.data[a];

					bx = pos_dataB.x;
					by = pos_dataB.y;
					ax = pos_dataA.x;
					ay = pos_dataA.y;

					dx = bx - ax;
					dy = by - ay;
					// var d = b2.Vec2.SubVV(pos_data[b], pos_data[a], s_d);

					distBtParticlesSq = dx * dx + dy * dy;
					// var distBtParticlesSq = b2.Vec2.DotVV(d, d);
					if (distBtParticlesSq < squaredDiameter) {
						var invD = 1 / Math.sqrt(distBtParticlesSq);
						// var invD = b2.InvSqrt(distBtParticlesSq);
						if (!isFin(invD)) {
							invD = 1.98177537e+019;
						}
						///b2ParticleContact& contact = contacts.Append();
						var contact = this.m_contactBuffer.data[this.m_contactBuffer.Append()];
						contact.indexA = indexA;
						contact.indexB = indexB;
						contact.flags = flagBufferDataA | flagBufferData[indexB];
						contact.weight = 1 - distBtParticlesSq * invD * inverseDiameter;
						///contact.SetNormal(invD * d);

						contact.normal.x = invD * dx;
						contact.normal.y = invD * dy;
						// b2.Vec2.MulSV(invD, d, contact.normal);
					}
					// end ------- AddContact(indexA, proxyData[b].index, contactBuffer);
				}
				bottomLeftTag = computeRelativeTag(tagA, -1, 1);
				for (; c < endProxy; ++c) {
					if (bottomLeftTag <= proxyData[c].tag) {
						break;
					}
				}
				bottomRightTag = computeRelativeTag(tagA, 1, 1);
				for (var b = c; b < endProxy; ++b) {
					dataB = proxyData[b];
					if (bottomRightTag < dataB.tag) {
						break;
					}
					
					// ------- AddContact(indexA, proxyData[b].index, contactBuffer);
					indexB = dataB.index;
					// pos_dataA = pos_data[indexA];
					pos_dataB = pos_data[indexB];
					// DEBUG: b2Assert(contacts === this.m_contactBuffer);
					///b2Vec2 d = m_positionBuffer.data[b] - m_positionBuffer.data[a];

					bx = pos_dataB.x;
					by = pos_dataB.y;
					ax = pos_dataA.x;
					ay = pos_dataA.y;

					dx = bx - ax;
					dy = by - ay;
					// var d = b2.Vec2.SubVV(pos_data[b], pos_data[a], s_d);

					distBtParticlesSq = dx * dx + dy * dy;
					// var distBtParticlesSq = b2.Vec2.DotVV(d, d);
					if (distBtParticlesSq < squaredDiameter) {
						var invD = 1 / Math.sqrt(distBtParticlesSq);
						// var invD = b2.InvSqrt(distBtParticlesSq);
						if (!isFin(invD)) {
							invD = 1.98177537e+019;
						}
						///b2ParticleContact& contact = contacts.Append();
						var contact = this.m_contactBuffer.data[this.m_contactBuffer.Append()];
						contact.indexA = indexA;
						contact.indexB = indexB;
						contact.flags = flagBufferDataA | flagBufferData[indexB];
						contact.weight = 1 - distBtParticlesSq * invD * inverseDiameter;
						///contact.SetNormal(invD * d);

						contact.normal.x = invD * dx;
						contact.normal.y = invD * dy;
						// b2.Vec2.MulSV(invD, d, contact.normal);
					}
					// end ------- AddContact(indexA, proxyData[b].index, contactBuffer);
				}
			}
		};
	});
}
