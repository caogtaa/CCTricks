// Copyright 2020 Cao Gaoting<caogtaa@gmail.com>
// https://caogtaa.github.io
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

import { CAParser } from "./CAParser";

/*
 * Date: 2021-05-01 17:41:46
 * LastEditors: GT<caogtaa@gmail.com>
 * LastEditTime: 2021-05-01 17:42:33
*/ 

const {ccclass, property} = cc._decorator;

type CARawConfig = {
    name: string,
    str: string
};

@ccclass
export default class SceneCellularAutomata extends cc.Component {

    @property(cc.Button)
    btnRandom: cc.Button = null;

    @property(cc.Button)
    btnRun: cc.Button = null;

    @property(cc.Button)
    btnTest: cc.Button = null;

    @property([cc.Sprite])
    images: cc.Sprite[] = [];

    @property(cc.Sprite)
    imageDisplay: cc.Sprite = null;

    @property(cc.Label)
    lblFPS: cc.Label = null;

    protected _originFPS: number = 60;              // 保存进入场景前的fps，退出场景时恢复
    protected _originEnableMultiTouch: boolean;

    protected _paused: boolean = false;
    protected _srcIndex: number = 0;
    protected _viewCenter: cc.Vec2 = cc.v2(0, 0);   // 视图中心相对与纹理的位置，单位: 设计分辨率像素
    protected _viewScale: number = 1.0;             // 视图缩放
    protected _textureSize = cc.size(1024, 1024);   // 目前先固定纹理大小，后续如果支持其他途径加载纹理，需要调整大小
    protected _configs: CARawConfig[] = [];

    onLoad() {
        let that = this;
        cc.resources.load("ca", cc.JsonAsset, (err: Error, data: cc.JsonAsset) => {
            let json = data?.json;
            if (json) {
                for (let key in json) {
                    that._configs.push({
                        name: key,
                        str: json[key]
                    });
                }
            }
        });
    }

    onEnable() {
        this._originFPS = cc.game.getFrameRate();
        this._originEnableMultiTouch = cc.macro.ENABLE_MULTI_TOUCH;

        this.SetFrameRate(20);
        cc.macro.ENABLE_MULTI_TOUCH = true;
    }

    onDisable() {
        cc.game.setFrameRate(this._originFPS);
        cc.macro.ENABLE_MULTI_TOUCH = this._originEnableMultiTouch;
    }

    protected SetFrameRate(fps: number) {
        cc.game.setFrameRate(fps);
        this.lblFPS.string = `${fps}`;
    }

    start () {
        let imageDisplay = this.imageDisplay;
        // this.images[this._srcIndex].spriteFrame = imageDisplay.spriteFrame;
        for (let image of this.images)
            this.UpdateRenderTextureMatProperties(image);

        // 初始化视图区域
        this._viewCenter.x = this._textureSize.width / 2;
        this._viewCenter.y = this._textureSize.height / 2;
        this._viewScale = 4.0;

        this.UpdateDisplayMatProperties();

        imageDisplay.node.on(cc.Node.EventType.TOUCH_START, this.OnDisplayTouchStart, this);
        imageDisplay.node.on(cc.Node.EventType.TOUCH_MOVE, this.OnDisplayTouchMove, this);
        imageDisplay.node.on(cc.Node.EventType.TOUCH_END, this.OnDisplayTouchEnd, this);
        imageDisplay.node.on(cc.Node.EventType.TOUCH_CANCEL, this.OnDisplayTouchEnd, this);

        imageDisplay.node.on(cc.Node.EventType.MOUSE_WHEEL, this.OnDisplayMouseWheel, this);

        let that = this;
        this.btnRandom.node.on("click", () => {
            let configs = that._configs;
            if (!configs)
                return;

            let index = this.RandomRangeInt(0, configs.length);
            let rInfo = CAParser.Parse(configs[index].str);

            let texture = CAParser.Merge(rInfo, null, null, null, that._textureSize.width, that._textureSize.height);
            that.SetCATexture(texture);
        });

        this.btnRun.node.on("click", () => {
            that._paused = !that._paused;
        });

        this.btnTest.node.on("click", () => {
            let configs = that._configs;
            if (!configs)
                return;

            let rInfo = CAParser.Parse(configs[this.RandomRangeInt(0, configs.length)].str);
            let gInfo = CAParser.Parse(configs[this.RandomRangeInt(0, configs.length)].str);
            let bInfo = CAParser.Parse(configs[this.RandomRangeInt(0, configs.length)].str);

            let texture = CAParser.Merge(rInfo, gInfo, bInfo, null, that._textureSize.width, that._textureSize.height);
            that.SetCATexture(texture);
        });
    }

    protected SetCATexture(texture: cc.RenderTexture) {
        this._srcIndex = 0;
        this.images[this._srcIndex].spriteFrame = new cc.SpriteFrame(texture);
    }

    protected UpdateRenderTextureMatProperties(sprite: cc.Sprite) {
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

    protected UpdateDisplayMatProperties() {
        let sprite = this.imageDisplay;
        let mat = sprite.getMaterial(0);
        if (!mat)
            return;

        // let viewOffset = this._viewOffset;
        let width = sprite.node.width;
        let height = sprite.node.height;

        let viewCenter = this._viewCenter;
        let viewScale = this._viewScale;
        let tw = this._textureSize.width;
        let th = this._textureSize.height;

        // let left = 0.5 - width / 1024 + viewCenter.x / 1024;

        let left = viewCenter.x / tw - width / (tw * 2 * viewScale);
        let right = viewCenter.x / tw + width / (tw * 2 * viewScale);
        let bottom = viewCenter.y / th - height / (th * 2 * viewScale);
        let top = viewCenter.y / th + height / (th * 2 * viewScale);

        // mat.setProperty("left", left);
        // mat.setProperty("right", right);
        // mat.setProperty("bottom", bottom);
        // mat.setProperty("top", top);
        // shader内Remap()简化为MAD
        mat.setProperty("p", [right-left, top-bottom]);
        mat.setProperty("q", [left, bottom]);
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

    public OnFPSSliderChanged(sender: cc.Slider) {
        let fps = Math.floor(120 * sender.progress);
        fps = Math.max(fps, 2);
        fps = Math.min(fps, 120);
        this.SetFrameRate(fps);
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

    protected OnDisplayTouchStart(e: cc.Event.EventTouch) {
    }

    protected OnDisplayTouchMove(e: cc.Event.EventTouch) {
        let touches = e.getTouches();
        if (touches.length === 1) {
            // simple drag
            let touch = touches[0] as cc.Touch;
            let offset = touch.getDelta();
            offset.mulSelf(1.0 / this._viewScale);

            this._viewCenter.subSelf(offset);
            this.UpdateDisplayMatProperties();
        } else if (touches.length >= 2) {
            // simple zoom
            let t0 = touches[0] as cc.Touch;
            let t1 = touches[1] as cc.Touch;

            let p0 = t0.getLocation();
            let p1 = t1.getLocation();
            let newLength = p0.sub(p1).len();
            let oldLength = p0.sub(t0.getDelta()).sub(p1).add(t1.getDelta()).len();
            let scale = newLength / oldLength;
            this.DisplayScaleBy(scale);
        }
    }

    protected OnDisplayTouchEnd(e: cc.Event.EventTouch) {
        // do nothing
    }

    // 用鼠标滚轮进行缩放
    // 简单起见目前只支持视图中心固定的缩放
    protected OnDisplayMouseWheel(e: cc.Event.EventMouse) {
        let scrollY = e.getScrollY();
        if (!scrollY)
            return;

        if (scrollY > 0) {
            this.DisplayScaleBy(1.1);
        } else {
            this.DisplayScaleBy(0.9);
        }
    }

    protected DisplayScaleBy(scale: number) {
        if (scale > 0)
            this._viewScale = Math.min(this._viewScale * scale, 1e3);
        else
            this._viewScale = Math.max(this._viewScale * scale, 1e-3);

        this.UpdateDisplayMatProperties();
    }

    protected RandomRange(min: number, max: number) {
        return Math.random() * (max - min) + min;
    }

    protected RandomRangeInt(min: number, max: number) {
        return Math.floor(this.RandomRange(min, max));
    }
}
