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
            let rInfo = CAParser.Parse("\
                29bo183b$29bobo181b$12bo17bobo180b$12b2o16bo2bo3b2o148bo25b$7b2o4b2o\
                15bobo4b2o147b4o23b$3b2o2b2o4b3o13bobo153b2ob4o5b2o14b$3b2o2b2o4b2o7bo\
                bo4bo144b2o8b3ob2o3bo3bo2bo12b$12b2o9b2o149b2o9b2ob2o3bo7bo11b$12bo10b\
                o162b5o3bo6bo6b2o3b$187bo3b3o7bo6b2o3b$197bo2bo12b$25b2o170b2o14b$26b\
                2o185b$25bo4bo154bo27b$31b2o150b2o28b$30b2o152b2o27b$11bo201b$8b4o3bob\
                2o170b2o22b$2o5b4o4bobob2o2b2o21b2o19b2o119b2o23b$2o5bo2bo3b2obob2o2bo\
                bo21bo19bo122bo9bo12b$7b4o3b2o8b3o20bobo10bo4bobo5bo124bobo12b$8b4o3b\
                2o8b3o20b2o9bobo3b2o4b3o112b2o9bobo11b2o$11bo12b3o31bo3b2o6bo115b3o7bo\
                2bo11b2o$23bobo7b2o23bo3b2o6b2o95b2o19b2obo5bobo13b$23b2o8bobo22bo3b2o\
                103bo20bo2bo6bobo12b$35bo16bo6bobo93bo9bobo20b2obo8bo12b$35b2o16bo6bo\
                92bobo9b2o11b2o6b3o24b$51b3o92b2o4bobo22bobo6b2o25b$45bo100b2o3bo2bo\
                15bo6bo35b$38b2o6b2o17b2o3b2o80bobo13b2o6b2o35b$38bo6b2o18bo5bo81bobo\
                6bo6b2o42b$29bo6bobo116bo6bobo48b$29bobo4b2o28bo3bo91b2o9b2o38b$12bo\
                17bobo34b3o104bo38b$12b2o16bo2bo140bobo9bo26b$7b2o4b2o15bobo142b2o8b2o\
                26b$3b2o2b2o4b3o13bobo43b6o103b2o11b2o14b$3b2o2b2o4b2o7bobo4bo44bo6bo\
                101b3o7bo3b3o13b$12b2o9b2o10b2o36bo8bo7bo93b2o5b4o4b2obo10b$12bo10bo\
                12b2o36bo6bo6b3o94b2o2bo4bo4bo2bo5b2o3b$35bo29bo9b6o6bo98bo2bo3bo5b2ob\
                o5b2o3b$66b2o19b2o101bob2o3b3o13b$65b2o130b2o14b$60bo94bo23bo33b$30b2o\
                29b2o90b2o23b2o33b$30b2o28b2o22b3o60bo6b2o22bobo2bobo27b$147bobo33b2o\
                28b$16bobo65bobo60b2o35bo28b$16bo3bo62b5o49b2o74b$6b2o12bo10b2o49b2o3b\
                2o48b2o74b$6b2o8bo4bo7bo2bo7bo41b2o3b2o109bo14b$20bo7bo7b2o3bo143b2o2b\
                2o6b4o12b$16bo3bo7bo6bo5bo52b2o40bo43bobo2bob4o5b2obobo3b2o6b$16bobo9b\
                o7b5o43bo7bo4bo37bobo40bo3bo3bob2o5b3obo2bo2b2o6b$29bo2bo50bo7bo6bo37b\
                o41bo12bo4b2obobo11b$31b2o47bobobo5bo8bo33b3o35b2o4bo4bo14b4o12b$81b2o\
                7bo8bo33bo14b2o21b2o5bo19bo14b$80b2o8bo8bo49bo28bo3bo30b$34b2o39bo15bo\
                6bo41bo8bobo5bo22bobo30b$34bobo39b2o14bo4bo40b2o10b2o3b4o54b$22bo12b3o\
                37b2o17b2o43b2o13bobob2o14b2o37b$19b4o3b2o8b3o10bobo83bo17bo2bob3o11bo\
                2bo37b$18b4o3b2o8b3o11bo3bo80bo19bobob2o11bo7b5o29b$11b2o5bo2bo3b2obob\
                2o2bobo16bo7bo72b3o18b4o12bo6bo5bo28b$11b2o5b4o4bobob2o2b2o13bo4bo4b4o\
                87b2o5bo5bo7bo7b2o3bo28b$19b4o3bob2o23bo4bobob2o9b2o75bobo9bo9bo2bo7bo\
                29b$22bo26bo3bo3bo2bob3o8b2o75bo11b3o9b2o37b$49bobo6bobob2o149b$59b4o\
                150b$23bo12bo24bo151b$23b3o11b2o11bo44bo117b$26bo9b2o12bobo40bobo60b2o\
                55b$25b2o23b2o42b2o60b2o55b$90bo34bo87b$42b2o47b2o30b2o43bo44b$43b2o\
                45b2o32b2o41bobo43b$43bob3o72bo34bobo8bob2o10b2o31b$41bobo3bo71bo30bo\
                4bo2bo6b2ob2o10b2o31b$42b2ob2o72b3o29b2o5b2o6bob2o43b$146b2o8bo3b2o5bo\
                bo43b$27b3o116b2o10b2o8bo44b$26bo3bo124bo2bo54b$25bo5bo123bobo55b$26bo\
                3bo182b$27b3o183b$27b3o5bo177b$35bobo4bo170b$24bo10b2o4bobo169b$23bobo\
                16b2o169b$22bo3b2o185b$11b2o9bo3b2o185b$11b2o9bo3b2o185b$23bobo25b6o\
                24b6o126b$24bo25bo5bo23bo5bo126b$56bo29bo126b$50bo4bo24bo4bo127b$52b2o\
                28b2o13bo115b$97b2o114b$29b2o65bobo114b$30bo46b2o134b$27b3o19bo27b2o\
                134b$27bo20b2o50bo112b$48bobo16b2o8bo20b3o112b$20b2o45b2o7bobo18bo115b\
                $20b2o14bo39bobo18b2o114b$36b2o5bobo31bo135b$35bobo3b3ob3o165b$40bo7bo\
                18b3o143b$40b2o5b2o18b3o4b2obob2o14bo117b$66bo3bo3bo5bo12b2ob2o115b$\
                65bo5bo3bo3bo133b$66bo3bo5b3o3bo9bo5bo114b$20bo29bo16b3o12b2o129b$19b\
                3o5b2o20b3o29bobo8b2obob2o114b$18b5o4b2o20b3o161b$17b2o3b2o40bo148b$\
                35b2o3b2o5b2o3b2o9b2o26b2o120b$31b2o3b5o6b2o3b2o9bobo25bobo119b$22b2o\
                6b2o4b2ob2o51bo120b$24bo7bo3b2ob2o38bo12b2o119b$21bo15b3o12b2o25bo11b\
                3o119b$21bo2bo27bobo23bobo10b2o120b$20b2ob2o29b2o21b2ob2o12bo118b$21b\
                2o30b2o21bo5bo130b$53b2o11bo12bo133b$35b3o11b3o13b3o8b2o3b2o130b$19b2o\
                3b2o9b3o26b5o24bo119b$19b2o3b2o8bo3bo24bobobobo22b3o118b$20b5o8bo5bo\
                23b2o3b2o8bo12b5o117b$21bobo10bo3bo39bo11b2o3b2o116b$35b3o11b2o3b2o21b\
                o13b5o117b$21b3o42bo24bo3bo117b$50bo3bo10bobo24bobo118b$51b3o11bobo11b\
                2o12bo119b$51b3o12bo12b2o132b$66b2o145b$66b2o24b2o119b$22b2o42b2o24b2o\
                119b$22b2o189b$51b2o160b$36b2o13b2o160b$36b2o!\
            ");
            let gInfo = CAParser.Parse("18b2o25b$19bo7bo17b$19bobo14b2o7b$20b2o12b2o2bo6b$24b3o7b2ob2o6b$24b2ob2o7b3o6b$24bo2b2o12b2o2b$25b2o14bobob$35bo7bob$43b2o2$2o23bo19b$bo21bobo19b$bobo13b3o4b2o19b$2b2o3bo8bo3bo24b$6bob2o6bo4bo23b$5bo4bo6b2obo9bo14b$6bo3bo8bo3b2o6bo13b$7b3o13bobo3b3o13b$25bo19b$25b2o!");
            let bInfo = CAParser.Parse(
                "8b2o10b2o$7bo2bo8bo2bo$7b3o2b6o2b3o$10b2o6b2o$9bo10bo$9b2obo4bob2o$14b\
                2o3$9b2o$9b2o$38b3o$40bo$30b2o7bo$30bo$28bobo$15bo12b2o$2o12b3o$2o11b\
                o3bo26bo7b2o$13b2ob2o24b3o7b2o$41bo$41b2o$27b3o29b2o$29bo29bo$13b2ob2o10b\
                o28bobo$2o11bo3bo39b2o$2o12b3o$15bo3$41b3o4b3o$41bo2bo2bo2bo$25b2o12b\
                2o10b2o$9b2o14b2o12bo12bo$9b2o28bo3b2o2b2o3bo$40b3o6b3o2$14b2o9b2o38b2o$\
                9b2obo4bob2o3bobo38bobo$9bo10bo3bobob2o32b2obobo$10b2o6b2o5bobobo32bob\
                obo$7b3o2b6o2b3o4bo36bo$7bo2bo8bo2bo2bo2bo34bo2bo$8b2o10b2o6bo5bo7b2o4b\
                2o7bo5bo$24bo3bo3b2ob2o5b3o2b3o5b2ob2o3bo3bo$24bo3bo5bo7b2o4b2o7bo5bo3b\
                o$28bo34bo$25bo2bo34bo2bo$27bo36bo$25bobobo3b2o22b2o3bobobo$24bobob2o3b\
                2o22b2o3b2obobo$24bobo38bobo$25b2o38b2o$41b2o6b2o$43bo4bo$41b3o4b3o3$\
                41b2o6b2o$41b2o6b2o$!");

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
