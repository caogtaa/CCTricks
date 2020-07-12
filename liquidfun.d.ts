// originally copy from https://github.com/gogachinchaladze/ivanets/blob/eee28cfa4ded80201f7c1e838e094e157490b146/definitions/liquidfun/liquidfun.d.ts
// make it Cocos Creator affine by caogtaa

declare module b2 {
	declare var waterParticle: any;
	declare var zombieParticle: any;
	declare var wallParticle: any;
	declare var springParticle: any;
	declare var elasticParticle: any;
	declare var viscousParticle: any;
	declare var powderParticle: any;
	declare var tensileParticle: any;
	declare var colorMixingParticle: any;
	declare var destructionListenerParticle: any;
	declare var barrierParticle: any;
	declare var staticPressureParticle: any;
	declare var reactiveParticle: any;
	declare var repulsiveParticle: any;
	declare var fixtureContactListenerParticle: any;
	declare var particleContactListenerParticle: any;
	declare var fixtureContactFilterParticle: any;
	declare var particleContactFilterParticle: any;

	declare class Vec2 {
		constructor(x: number, y: number);
		Set(newX: number, newY: number);
		Clone();

		x: number
		y: number
	}

	declare class Filter {
		categoryBits: number
		maskBits: number
		groupIndex: number
	}

	declare class BodyDef {
		type: any
		position: b2.Vec2
		linearDamping: number
		angularDamping: number
		fixedRotation: boolean
		bullet: boolean
		active: boolean
		userData: number
		filter: b2.Filter
	}

	declare class Fixture {
		SetDensity(density: number);
		filter: b2.Filter

		GetFriction(): number;
		SetFriction(friction: number): void;

		GetRestitution(): number;
		SetRestitution(restitution: number): void;

		TestPoint(worldPoint: b2.Vec2): boolean;
		GetBody(): b2.Body;
	}

	declare class MassData {

	}

	declare class Body {
		fixtures: b2.Fixture[]

		CreateFixtureFromShape(shape: b2.Shape, density: number): b2.Fixture;
		CreateFixtureFromDef(fixtureDefinition: b2.FixtureDef): b2.Fixture;

		GetPosition(): b2.Vec2;
		GetAngle(): number;
		GetMass(): number;
		GetInertia(): number;
		GetLocalCenter(): b2.Vec2;

		SetType(type: any);
		GetType(): any;

		SetBullet(flag: boolean);
		IsBullet(): boolean;

		SetSleepingAllowed(flag: boolean);
		IsSleepingAllowed(): boolean;

		SetAwake(flag: boolean);
		IsAwake(): boolean;

		SetActive(flag: boolean);
		IsActive(): boolean;

		SetFixedRotation(flag: boolean);
		IsFixedRotation(): boolean;

		GetWorldCenter(): b2.Vec2;
		GetLocalCenter(): b2.Vec2;
		ResetMassData();

		DestroyFixture(fixture: b2.Fixture): void;

		SetLinearVelocity(lVelocity: b2.Vec2): void;
		GetLinearVelocity(): b2.Vec2;

		SetAngularVelocity(omega: number): void;
		GetAngularVelocity(): number;

		ApplyForce(force: b2.Vec2, point: b2.Vec2, wake: boolean): void;
		ApplyForceToCenter(force: b2.Vec2, wake: boolean): void;

		ApplyTorque(torque: number, wake: boolean): void;

		ApplyLinearImpulse(impulse: b2.Vec2, point: b2.Vec2, wake: boolean): void;
		ApplyAngularImpulse(impulse: number, wake: boolean): void;

		GetMass(): number;
		GetInertia(): number;

		GetWorldPoint(localPoint: b2.Vec2): b2.Vec2;
		GetLocalPoint(worldPoint: b2.Vec2): b2.Vec2;

		SetGravityScale(gScale: number): void;

		SetSleepingAllowed(flag: boolean): void;
		IsSleepingAllowed(): boolean;

		SetAwake(flag: boolean): void;
		IsAwake(): boolean;

		SetActive(flag: boolean): void;
		IsActive(): boolean;

		GetPositionX(): number;
		GetPositionY(): number;
		SetTransform(position: b2.Vec2, angle: number): void;

		SetLinearVelocity(v: b2.Vec2): void;
		GetLinearVelocity(): b2.Vec2;

		SetAngularVelocity(omega: number): void;
		GetAngularVelocity(): number;

		GetUserData(): number;
	}

	interface QueryCallback {
		ReportFixture(fixture: b2.Fixture): boolean;
	}

	declare class AABB {
		lowerBound: b2.Vec2
		upperBound: b2.Vec2
	}

	interface RayCastCallback {

	}

	declare class World {
		constructor(gravity: b2.Vec2);

		CreateBody(bodyDefinition: b2.BodyDef): b2.Body;
		CreateJoint(jointDefinition: b2.JointDef): b2.Joint;

		Step(timeStep: number, velocityIterations: number, positionIterations: number);

		SetContactListener(listener: b2.ContactListener): void;

		QueryAABB(callback: b2.QueryCallback, aabb: b2.AABB): void;
		RayCast(callback: b2.RayCastCallback, point1: b2.Vec2, point2: b2.Vec2): void;

		CreateParticleSystem(particleSystemDef: b2.ParticleSystemDef): b2.ParticleSystem;
		DestroyParticleSystem(particleSystem: b2.ParticleSystem): void;

		bodies: b2.Body[]
		particleSystems: b2.ParticleSystem[]
	}

	interface ContactListener {
		BeginContact(contact: b2.Contact): void;
		EndContact(contect: b2.Contact): void;
		PreSolve(contact: b2.Contact, manifold: b2.Manifold): void;
		PostSolve(contect: b2.Contact, manifold: b2.Manifold): void;
	}

	declare class Shape {
		radius: number

		GetPositionX(): number;
		GetPositionY(): number;
		SetPosition(x: number, y: number);
	}

	declare class EdgeShape extends b2.Shape {
		Set(v1: b2.Vec2, v2: b2.Vec2);
	}

	declare class ChainShape extends b2.Shape {
		CreateChain(points: Array<b2Vec2>);
	}

	declare class CircleShape extends b2.Shape {

	}

	declare class Transform {

	}

	declare class PolygonShape extends b2.Shape {
		SetAsBoxXY(halfWidth: number, halfHeight: number);
		SetAsBox(halfWidth: number, halfHeight: number);
	}

	declare var dynamicBody: any
	declare var kinematicBody: any
	declare var staticBody: any

	declare class FixtureDef {
		shape: any
		density: number
		friction: number
		restitution: number
		filter: b2.Filter
	}

	//Joint definitions
	declare class JointDef {
		collideConnected: boolean
		frequencyHz: number
		dampingRatio: number

		bodyA: b2.Body
		bodyB: b2.Body
	}

	declare class DistanceJointDef extends b2.JointDef {
		localAnchorA: b2.Vec2
		localAnchorB: b2.Vec2
		length: number

		InitializeAndCreate(bodyA: b2.Body, bodyB: b2.Body, anchorA: b2.Vec2, anchorB: b2.Vec2);
	}

	declare class RevoluteJointDef extends b2.JointDef {
		lowerAngle: number
		upperAngle: number
		enableLimit: boolean
		motorSpeed: number
		enableMotor: number

		localAnchorA: b2.Vec2
		localAnchorB: b2.Vec2

		InitializeAndCreate(bodyA: b2.Body, bodyB: b2.Body, sharedAnchorInWorldSpace: b2.Vec2);
	}

	declare class PrismaticJointDef extends b2.JointDef {
		lowerTranslation: number
		upperTranslation: number
		enableLimit: boolean
		maxMotorForce: number
		motorSpeed: number
		enableMotor: boolean
	}

	declare class PulleyJointDef extends b2.JointDef {

	}

	declare class GearJointDef extends b2.JointDef {

	}

	//Joint classes
	declare class Joint {

	}

	declare class DistanceJoint extends b2.Joint {

	}

	declare class RevoluteJoint extends b2.Joint {
		GetJointAngle(): number;
		GetJointSpeed(): number;
		GetMotorTorque(): number;

		SetMotorSpeed(speed: number);
		SetMaxMotorTorque(torque: number);
	}

	declare class PrismaticJoint extends b2.Joint {
		GetJointTranslation(): number;
		GetJointSpeed(): number;
		GetMotorForce(): number;

		SetMotorSpeed(speed: number);
		SetMotorForce(force: number);
	}

	declare class PulleyJoint extends b2.Joint {
		GetLengthA(): number;
		GetLengthB(): number;
	}

	declare class Contact {
		GetManifold(): b2.Manifold;
		GetFixtureA(): b2.Fixture;
		GetFixtureB(): b2.Fixture;
		SetEnabled(enabled: boolean): void;
	}

	declare class Manifold {

	}

	//Particles
	declare class ParticleColor {

	}

	declare class ParticleDef {
		flags: any
		position: b2.Vec2
		color: b2.ParticleColor
	}

	declare class ParticleSystemDef {
		strictContactCheck = false;
		/**
		 * Set the particle density.
		 * See SetDensity for details.
		 */
		density = 1.0;
		/**
		 * Change the particle gravity scale. Adjusts the effect of the
		 * global gravity vector on particles. Default value is 1.0f.
		 */
		gravityScale = 1.0;
		/**
		 * Particles behave as circles with this radius. In Box2D units.
		 */
		radius = 1.0;
		/**
		 * Set the maximum number of particles.
		 * By default, there is no maximum. The particle buffers can
		 * continue to grow while b2World's block allocator still has
		 * memory.
		 * See SetMaxParticleCount for details.
		 */
		maxCount = 0;
		/**
		 * Increases pressure in response to compression
		 * Smaller values allow more compression
		 */
		pressureStrength = 0.005;
		/**
		 * Reduces velocity along the collision normal
		 * Smaller value reduces less
		 */
		dampingStrength = 1.0;
		/**
		 * Restores shape of elastic particle groups
		 * Larger values increase elastic particle velocity
		 */
		elasticStrength = 0.25;
		/**
		 * Restores length of spring particle groups
		 * Larger values increase spring particle velocity
		 */
		springStrength = 0.25;
		/**
		 * Reduces relative velocity of viscous particles
		 * Larger values slow down viscous particles more
		 */
		viscousStrength = 0.25;
		/**
		 * Produces pressure on tensile particles
		 * 0~0.2. Larger values increase the amount of surface tension.
		 */
		surfaceTensionPressureStrength = 0.2;
		/**
		 * Smoothes outline of tensile particles
		 * 0~0.2. Larger values result in rounder, smoother,
		 * water-drop-like clusters of particles.
		 */
		surfaceTensionNormalStrength = 0.2;
		/**
		 * Produces additional pressure on repulsive particles
		 * Larger values repulse more
		 * Negative values mean attraction. The range where particles
		 * behave stably is about -0.2 to 2.0.
		 */
		repulsiveStrength = 1.0;
		/**
		 * Produces repulsion between powder particles
		 * Larger values repulse more
		 */
		powderStrength = 0.5;
		/**
		 * Pushes particles out of solid particle group
		 * Larger values repulse more
		 */
		ejectionStrength = 0.5;
		/**
		 * Produces static pressure
		 * Larger values increase the pressure on neighboring partilces
		 * For a description of static pressure, see
		 * http://en.wikipedia.org/wiki/Static_pressure#Static_pressure_in_fluid_dynamics
		 */
		staticPressureStrength = 0.2;
		/**
		 * Reduces instability in static pressure calculation
		 * Larger values make stabilize static pressure with fewer
		 * iterations
		 */
		staticPressureRelaxation = 0.2;
		/**
		 * Computes static pressure more precisely
		 * See SetStaticPressureIterations for details
		 */
		staticPressureIterations = 8;
		/**
		 * Determines how fast colors are mixed
		 * 1.0f ==> mixed immediately
		 * 0.5f ==> mixed half way each simulation step (see
		 * b2World::Step())
		 */
		colorMixingStrength = 0.5;
		/**
		 * Whether to destroy particles by age when no more particles
		 * can be created.  See #b2ParticleSystem::SetDestructionByAge()
		 * for more information.
		 */
		destroyByAge = true;
		/**
		 * Granularity of particle lifetimes in seconds.  By default
		 * this is set to (1.0f / 60.0f) seconds.  b2ParticleSystem uses
		 * a 32-bit signed value to track particle lifetimes so the
		 * maximum lifetime of a particle is (2^32 - 1) / (1.0f /
		 * lifetimeGranularity) seconds. With the value set to 1/60 the
		 * maximum lifetime or age of a particle is 2.27 years.
		 */
		lifetimeGranularity = 1.0 / 60.0;
	}

	declare class ParticleGroupDef {
		flags: any
		position: b2.Vec2
		color: b2.ParticleColor
		angle: number
		angularVelocity: number
		shape: b2.Shape
		strength: number;
	}

	declare class ParticleGroup {
		SetGroupFlags(flags: any);
		GetGroupFlags(): any;
		DestroyParticles(callDestructionListener: boolean): void;
	}

	declare class ParticleSystem {
		CreateParticle(particleDefinition: b2.ParticleDef): number;
		DestroyParticlesInShape(shape: b2.Shape, transform: b2.Transform): void;

		CreateParticleGroup(particleGroupDefinition: b2.ParticleGroupDef);

		SetPaused(paused: boolean): void;

		SetParticleDestructionByAge(deletionByAge: boolean): void;
		SetParticleLifetime(particleIndex: number, lifetime: number): void;
		SetDensity(density: number): void;
		GetStuckCandidateCount(): number;
		GetStuckCandidates(): Array<number>;
		GetPositionBuffer(): Float32Array;
		GetColorBuffer(): Uint8Array;

		SetRadius(radious: number): void;
	}
}

