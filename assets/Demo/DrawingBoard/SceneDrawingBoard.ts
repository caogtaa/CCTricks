/*
 * Author: GT<caogtaa@gmail.com>
 * Date: 2021-01-15 00:22:39
 * LastEditors: GT<caogtaa@gmail.com>
 * LastEditTime: 2021-05-30 11:27:41
*/


const {ccclass, property} = cc._decorator;

class RenderBuff {
    texture: cc.RenderTexture = null;
    spriteFrame: cc.SpriteFrame = null;
    cameraNode: cc.Node = null;
    camera: cc.Camera = null;

    /**
     * 创建一个用于计算的RenderBuff（采样方式是邻近像素）
     * @param width 
     * @param height 
     * @returns 
     */
    public static CreateComputeBuff(width: number, height: number): RenderBuff {
        let result = new RenderBuff;
        let texture = result.texture = new cc.RenderTexture();
        texture.packable = false;
        texture.setFilters(cc.Texture2D.Filter.NEAREST, cc.Texture2D.Filter.NEAREST);
        texture.initWithSize(width, height);
        result.spriteFrame = new cc.SpriteFrame(texture);
        return result;
    }

    /**
     * 创建一个用于计算的RenderBuff（采样方式是邻近像素）
     * @param width 
     * @param height 
     * @returns 
     */
    public static CreateRederBuff(width: number, height: number): RenderBuff {
        let result = new RenderBuff;
        let texture = result.texture = new cc.RenderTexture();
        texture.packable = false;
        texture.initWithSize(width, height);
        result.spriteFrame = new cc.SpriteFrame(texture);
        return result;
    }

    /**
     * 清空纹理内容
     */
    public Clear() {
        let texture = this.texture;

        //@ts-ignore
        let opts = texture._getOpts();
        let size = texture.width * texture.height;
        opts.image = new Uint8Array(size * 4);
        texture.update(opts);
    }
}

@ccclass
export default class SceneDrawingBoard extends cc.Component {
    @property(cc.Node)
    board: cc.Node = null;

    @property(cc.Node)
    pen: cc.Node = null;

    @property(cc.Sprite)
    singlePass: cc.Sprite = null;

    @property(cc.Material)
    matCapsule: cc.Material = null;

    @property(cc.Material)
    matBezier: cc.Material = null;

    protected _autoRender: boolean = true;
    protected _renderBuffMap = new Map<cc.Node, RenderBuff>();
    protected _isDragging: boolean = false;
    protected _points: cc.Vec2[] = [];
    protected _debug: boolean = false;

    onLoad() {
        let renderBuff = RenderBuff.CreateRederBuff(this.board.width, this.board.height);
        let sprite = this.board.getComponent(cc.Sprite);
        sprite.sizeMode = cc.Sprite.SizeMode.CUSTOM;
        sprite.spriteFrame = renderBuff.spriteFrame;
        this._renderBuffMap.set(this.board, renderBuff);

        // 设置混合模式为max，主要为了避免线段衔接处颜色叠加导致变厚
        // var ext = gl.getExtension('EXT_blend_minmax');
        // let mat = this.singlePass.node.getComponent(cc.Sprite).getMaterial(0);
        // mat?.setBlend(
        //     true,
        //     ext.MAX_EXT,
        //     gfx.BLEND_SRC_ALPHA,
        //     gfx.BLEND_ONE_MINUS_SRC_ALPHA,
        //     ext.MAX_EXT,
        //     gfx.BLEND_SRC_ALPHA,
        //     gfx.BLEND_ONE_MINUS_SRC_ALPHA,
        //     0xffffffff,
        //     0);

        this.board.on(cc.Node.EventType.TOUCH_START, this.OnBoardTouchStart, this);
        this.board.on(cc.Node.EventType.TOUCH_MOVE, this.OnBoardTouchMove, this);
        this.board.on(cc.Node.EventType.TOUCH_END, this.OnBoardTouchEnd, this);
        this.board.on(cc.Node.EventType.TOUCH_CANCEL, this.OnBoardTouchEnd, this);
    }

    start () {

    }

    OnRender() {
        this.RenderToNode(this.pen, this.board);
    }

    protected SetBlendEqToMax(mat: cc.Material) {
        if (this._debug)
            return;

        //@ts-ignore
        let gl = cc.game._renderContext;
        //@ts-ignore
        let gfx = cc.gfx;
        var ext = gl.getExtension('EXT_blend_minmax');
        mat?.setBlend(
            true,
            ext.MAX_EXT,
            gfx.BLEND_SRC_ALPHA,
            gfx.BLEND_ONE_MINUS_SRC_ALPHA,
            ext.MAX_EXT,
            gfx.BLEND_SRC_ALPHA,
            gfx.BLEND_ONE_MINUS_SRC_ALPHA,
            0xffffffff,
            0);
    }

    protected static _tmpV2 = cc.v2(0, 0);
    update() {
        let points = this._points;
        if (points.length < 3)
            return;

        let A = points[0];
        let B = points[1];
        let C = points[2];
        
        let sprite = this.singlePass;
        let isValid: boolean = true;
        let useBezier: boolean = true;
        let halfBezier: boolean = true;

        // ABC共线的情况用直线处理
        if (Math.abs((B.x-A.x) * (C.y-A.y) - (B.y-A.y) * (C.x-A.x)) <= 1e-5) {
            useBezier = false;
        }

        // 画直线时候点重叠，则不画
        if (!useBezier && A.equals(B)) {
            isValid = false;
        }

        // if (useBezier) {
        //     // 距离太短的也不要用bezier
        //     let tmpV2 = SceneDrawingBoard._tmpV2;
        //     A.sub(B, tmpV2);
        //     let dist2 = tmpV2.dot(tmpV2);
        //     if (dist2 < 16) {
        //         useBezier = false;
        //     }
        // }

        if (!useBezier) {
            sprite.setMaterial(0, this.matCapsule);
            let mat = sprite.getComponent(cc.Sprite).getMaterial(0);
            this.SetBlendEqToMax(mat);
            mat.setProperty("PP", [A.x, A.y, B.x, B.y]);
        } else {
            sprite.setMaterial(0, this.matBezier);
            let mat = sprite.getComponent(cc.Sprite).getMaterial(0);
            this.SetBlendEqToMax(mat);

            if (halfBezier) {
                // 切分bezier曲线，只绘制AB段
                // vec2 TC = PB;
                // vec2 TB = (PA - PC) * 0.25 + PB;
                // PB = TB;
                // PC = TC;
                let TB = A.sub(C);
                TB.mulSelf(0.25).addSelf(B);

                C = B;
                B = TB;
            } else {
                // B从途经点变为控制点
                // B = (4.0 * B - A - C) / 2.0
                B = B.mul(4);
                B.subSelf(A).subSelf(C).divSelf(2);
            }

            mat.setProperty("PA", [A.x, A.y]);
            mat.setProperty("PB", [B.x, B.y]);
            mat.setProperty("PC", [C.x, C.y]);
        }

        if (this._debug)
            console.log(`${A}, ${B}, ${C}, color=${this._colorIndex}, useBezier=${useBezier}`);

        if (isValid) {
            sprite.enabled = true;
            if (this._debug)
                sprite.node.color = this._colors[this._colorIndex];
            this._colorIndex = (this._colorIndex + 1) % this._colors.length;
            this.RenderToNode(sprite.node, this.board);
            sprite.enabled = false;
        }

        this._points.shift();
        // this._points.shift();

        return;
        if (!this._autoRender)
            return;

        this.RenderToNode(this.pen, this.board);
    }
    
    protected TouchPosToPassPos(pos: cc.Vec2): cc.Vec2 {
        let node = this.singlePass.node;
        node.convertToNodeSpaceAR(pos, pos);

        // map to [-0.5, 0.5]
        pos.x /= node.width;
        pos.y /= node.height;

        // [-0.5, 0.5] map to [-1, 1]
        pos.mulSelf(2.0);

        // scale Y, same as in shader
        pos.y *= node.height / node.width;
        return pos;
    }

    protected OnBoardTouchStart(e: cc.Event.EventTouch) {
        this._isDragging = true;
        this._points.length = 0;
        this._points.push(this.TouchPosToPassPos(e.getLocation()));
    }

    protected _colorIndex: number = 0;
    protected _colors = [cc.Color.WHITE, cc.Color.RED, cc.Color.GREEN, cc.Color.BLUE, cc.Color.YELLOW, cc.Color.CYAN];

    protected OnBoardTouchMove(e: cc.Event.EventTouch) {
        if (!this._isDragging)
            return;

        let cur = this.TouchPosToPassPos(e.getLocation());
        this._points.push(cur);
    }

    protected OnBoardTouchEnd() {
        this._isDragging = false;

        // simply clear points
        // todo: draw last segment
        this._points.length = 0;

        if (this._debug)
            console.log(`---------------------------- end ------------------------`)
    }

    /**
     * 1:1将root内容渲染到target
     * @param root 
     * @param target 
     * @returns 
     */
     public RenderToNode(root: cc.Node, target: cc.Node): cc.RenderTexture {
        let renderBuff = this._renderBuffMap.get(target);
        if (!renderBuff)
            return null;

        if (!renderBuff.cameraNode || !renderBuff.camera) {
            // 创建截图专用的camera
            // 使截屏处于被截屏对象中心（两者有同样的父节点）
            let node = renderBuff.cameraNode = new cc.Node;
            node.parent = target;
            node.x = (0.5 - target.anchorX) * target.width;
            node.y = (0.5 - target.anchorY) * target.height;

            let camera = renderBuff.camera = node.addComponent(cc.Camera);
            camera.backgroundColor = new cc.Color(255, 255, 255, 0);        // 透明区域仍然保持透明，半透明区域和白色混合
            // camera.clearFlags = cc.Camera.ClearFlags.DEPTH | cc.Camera.ClearFlags.STENCIL | cc.Camera.ClearFlags.COLOR;

            // 设置你想要的截图内容的 cullingMask
            camera.cullingMask = 0xffffffff;

            // let targetWidth = root.width;
            let targetHeight = root.height;

            camera.alignWithScreen = true;
            camera.orthoSize = targetHeight / 2;
            camera.targetTexture = renderBuff.texture;
        }

        let success: boolean = false;
        let camera = renderBuff.camera;
        // let node = renderBuff.cameraNode;
        try {
            // 渲染一次摄像机，即更新一次内容到 RenderTexture 中
            camera.enabled = true;
            camera.render(root);
            success = true;
        } finally {
            // 隐藏额外的camera避免在本帧再次渲染
            camera.enabled = false;
        }

        return renderBuff.texture;
    }
}
