const { ccclass, property } = cc._decorator;

@ccclass
export default class SimpleDraggable extends cc.Component {
    protected _touchOffset: cc.Vec2 = cc.Vec2.ZERO;
    protected _isDragging: boolean = false;
    protected _moveCallback: (pos: cc.Vec2) => void = null;
    
    onLoad() {
        this.node.on(cc.Node.EventType.TOUCH_START, this.OnTouchStart.bind(this));
        this.node.on(cc.Node.EventType.TOUCH_MOVE, this.OnTouchMove.bind(this));
        this.node.on(cc.Node.EventType.TOUCH_END, this.OnTouchEnd.bind(this));
        this.node.on(cc.Node.EventType.TOUCH_CANCEL, this.OnTouchEnd.bind(this));
    }

    public Setup(moveCallback: (pos: cc.Vec2) => void) {
        this._moveCallback = moveCallback;
    }

    protected OnTouchStart(e: cc.Event.EventTouch) {
        let touchWorldPos = e.getLocation();
        let nodeWorldPos = this.node.convertToWorldSpaceAR(cc.Vec2.ZERO);
        this._touchOffset = nodeWorldPos.sub(touchWorldPos);
        this._isDragging = true;
        this._moveCallback && this._moveCallback(this.node.position);
    }

    protected OnTouchMove(e: cc.Event.EventTouch) {
        if (!this._isDragging)
            return;

        let touchWorldPos = e.getLocation();
        this.TraceTouchPos(touchWorldPos);
        this._moveCallback && this._moveCallback(this.node.position);
    }

    protected OnTouchEnd(e: cc.Event.EventTouch) {
        if (!this._isDragging)
            return;

        this._isDragging = false;
    }

    protected TraceTouchPos(worldPos: cc.Vec2) {
        let nodeWorldPos = worldPos.add(this._touchOffset);
        let localPos = this.node.parent.convertToNodeSpaceAR(nodeWorldPos);
        this.node.position = localPos;
    }
}
