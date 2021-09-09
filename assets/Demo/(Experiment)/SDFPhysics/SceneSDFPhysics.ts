// Copyright 2021 Cao Gaoting<caogtaa@gmail.com>
// https://caogtaa.github.io
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT
/*
 * Date: 2021-08-21 23:02:49
 * LastEditors: GT<caogtaa@gmail.com>
 * LastEditTime: 2021-08-21 23:03:26
*/

import { SplineTrailRenderer } from "../../GraphicsDrawingBoard/Script/SplineTrailRenderer";

 

const {ccclass, property} = cc._decorator;

@ccclass
export default class SceneSDFPhysics extends cc.Component {
    @property([cc.Node])
    balls: cc.Node[] = [];

    protected _isDragging: boolean = false;

    onLoad() {
        let physicsManager = cc.director.getPhysicsManager();
		physicsManager.enabled = true;

        for (let ball of this.balls) {
            ball.on(cc.Node.EventType.TOUCH_START, this.OnTouchBallStart, this);
            ball.on(cc.Node.EventType.TOUCH_MOVE, this.OnTouchBallMove, this);
            ball.on(cc.Node.EventType.TOUCH_END, this.OnTouchBallEnd, this);
            ball.on(cc.Node.EventType.TOUCH_CANCEL, this.OnTouchBallEnd, this);
        }
    }

    start() {
    }

    protected OnTouchBallStart(e: cc.Event.EventTouch) {
        this._isDragging = true;
        let ball = e.target;
        let body = ball.getComponent(cc.RigidBody);
        body.linearVelocity = cc.Vec2.ZERO;
        body.gravityScale = 0;

        let collider = ball.getComponent(cc.PhysicsCollider);
        collider.enabled = false;

        // clear old data
        let trail = ball.getComponentInChildren(SplineTrailRenderer);
        trail?.Clear();
    }

    protected OnTouchBallMove(e: cc.Event.EventTouch) {
        if (!this._isDragging)
            return false;

        let ball = e.target;
        let pos = ball.position;
        pos.addSelf(e.getDelta());
        ball.position = pos;
    }

    protected OnTouchBallEnd(e: cc.Event.EventTouch) {
        this._isDragging = true;
        let ball = e.target;

        let body = ball.getComponent(cc.RigidBody);
        body.gravityScale = 1;
        body.linearVelocity = cc.director.getPhysicsManager().gravity;
        

        let collider = ball.getComponent(cc.PhysicsCollider);
        collider.enabled = true;

        let trail = ball.getComponentInChildren(SplineTrailRenderer);
        console.log(`----- vcount: ${trail._a_vertices.length}`);
    }

    _colorIndex: number = 0;
    public OnChangeColor() {
        const colors: cc.Color[] = [
            cc.Color.RED,
            cc.Color.YELLOW,
            cc.Color.CYAN
        ];

        for (let ball of this.balls) {
            let trail = ball.getComponentInChildren(SplineTrailRenderer);
            //@ts-ignore
            let mat = trail.renderer.getMaterial(0);
            let c = colors[this._colorIndex++];
            this._colorIndex %= colors.length;

            // change uniform color
            mat.setProperty("runtime_color", c);

            // change attribute color
            trail.node.color = c;
        }
    }
}
