// Copyright 2020 Cao Gaoting<caogtaa@gmail.com>
// https://caogtaa.github.io
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

/*
 * Date: 2021-05-01 17:41:46
 * LastEditors: GT<caogtaa@gmail.com>
 * LastEditTime: 2021-05-01 17:42:33
*/ 

const {ccclass, property} = cc._decorator;

@ccclass
export default class SceneCellularAutomata extends cc.Component {

    @property(cc.Button)
    btnRun: cc.Button = null;

    @property([cc.Sprite])
    images: cc.Sprite[] = [];

    @property(cc.Sprite)
    imageDisplay: cc.Sprite = null;

    protected _paused: boolean = false;
    protected _srcIndex: number = 0;

    onLoad() {

    }

    start () {
        this.images[this._srcIndex].spriteFrame = this.imageDisplay.spriteFrame;
        for (let image of this.images)
            this.UpdateMaterialProperties(image);

        let that = this;
        this.btnRun.node.on("click", () => {
            that._paused = !that._paused;
        });
    }

    protected UpdateMaterialProperties(sprite: cc.Sprite) {
        let mat = sprite.getMaterial(0);
        if (!mat)
            return;

        let sf = sprite.spriteFrame;
        let dx: number, dy: number;
        if (sf) {
            // 获取纹素大小
            let sz = sf.getOriginalSize();
            dx = 1.0 / sz.width;
            dy = 1.0 / sz.height;
        } else {
            // 纹理为空时，以设计分辨率像素为纹素大小。这里要求节点大小和期望的游戏区大小相同
            dx = 1.0 / sprite.node.width;
            dy = 1.0 / sprite.node.height;
        }

        mat.setProperty("dx", dx);
        mat.setProperty("dy", dy);
    }

    protected Tick() {
        if (this._paused)
            return;

        let order = this._srcIndex;
        let from = this.images[order];
        let to = this.images[1-order];
        let imageDisplay = this.imageDisplay;

        from.enabled = true;
        this.RenderToMemory(from.node, [], to.node);
        from.enabled = false;

        imageDisplay.spriteFrame = to.spriteFrame;
        if (to.node.scaleY * imageDisplay.node.scaleY < 0) {
            // 如果scaleY符号不相等，则imageDisplay上下翻转
            imageDisplay.node.scaleY *= -1.0;
        }

        // 切换RenderTexture
        this._srcIndex = 1 - this._srcIndex;
    }

    update(dt: number) {
        this.Tick();
    }

    public OnFPSEditDidEnded(sender: cc.EditBox) {
        let fps = parseInt(sender.string);
        cc.game.setFrameRate(fps);
    }

    public RenderToMemory(root: cc.Node, others: cc.Node[], target: cc.Node, extend: number = 0): cc.RenderTexture {
        // 使截屏处于被截屏对象中心（两者有同样的父节点）
        let node = new cc.Node;
        node.parent = root;
        node.x = (0.5 - root.anchorX) * root.width;
        node.y = (0.5 - root.anchorY) * root.height;

        let camera = node.addComponent(cc.Camera);
        camera.backgroundColor = new cc.Color(255, 255, 255, 0);        // 透明区域仍然保持透明，半透明区域和白色混合
        camera.clearFlags = cc.Camera.ClearFlags.DEPTH | cc.Camera.ClearFlags.STENCIL | cc.Camera.ClearFlags.COLOR;

        // 设置你想要的截图内容的 cullingMask
        camera.cullingMask = 0xffffffff;

        let success: boolean = false;
        try {
            let scaleX = 1.0;   //this.fitArea.scaleX;
            let scaleY = 1.0;   //this.fitArea.scaleY;
            let gl = cc.game._renderContext;

            let targetWidth = Math.floor(root.width * scaleX + extend * 2);      // texture's width/height must be integer
            let targetHeight = Math.floor(root.height * scaleY + extend * 2);

            // 内存纹理创建后缓存在目标节点上
            // 如果尺寸和上次不一样也重新创建
            let texture: cc.RenderTexture = target["__gt_texture"];
            if (!texture || texture.width != targetWidth || texture.height != target.height) {
                texture = target["__gt_texture"] = new cc.RenderTexture();

                texture.initWithSize(targetWidth, targetHeight, gl.STENCIL_INDEX8);
                texture.packable = false;
                // texture.setFlipY(false);

                // 采样坐标周期循环
                //@ts-ignore
                texture.setWrapMode(cc.Texture2D.WrapMode.REPEAT, cc.Texture2D.WrapMode.REPEAT);

                // 像素化
                texture.setFilters(cc.Texture2D.Filter.NEAREST, cc.Texture2D.Filter.NEAREST);
            }
        
            camera.alignWithScreen = false;
            // camera.orthoSize = root.height / 2;
            camera.orthoSize = targetHeight / 2;
            camera.targetTexture = texture;

            // 渲染一次摄像机，即更新一次内容到 RenderTexture 中
            camera.render(root);
            if (others) {
                for (let o of others) {
                    camera.render(o);
                }
            }

            let screenShot = target;
            screenShot.active = true;
            screenShot.opacity = 255;

            // screenShot.parent = root.parent;
            // screenShot.position = root.position;
            screenShot.width = targetWidth;     // root.width;
            screenShot.height = targetHeight;   // root.height;
            screenShot.angle = root.angle;

            // fitArea有可能被缩放，截图的实际尺寸是缩放后的
            screenShot.scaleX = 1.0 / scaleX;
            screenShot.scaleY = -1.0 / scaleY;

            let sprite = screenShot.getComponent(cc.Sprite);
            if (!sprite) {
                sprite = screenShot.addComponent(cc.Sprite);
                // sprite.srcBlendFactor = cc.macro.BlendFactor.ONE;
            }

            // 如果没有sf或者一开始设置过其他sf，则替换为renderTexture
            if (!sprite.spriteFrame || sprite.spriteFrame.getTexture() != texture) {
                sprite.sizeMode = cc.Sprite.SizeMode.CUSTOM;
                sprite.spriteFrame = new cc.SpriteFrame(texture);
            }
            
            success = true;
        } finally {
            camera.targetTexture = null;
            node.removeFromParent();
            if (!success) {
                target.active = false;
            }
        }

        return target["__gt_texture"];
    }

    // update (dt) {}
}
