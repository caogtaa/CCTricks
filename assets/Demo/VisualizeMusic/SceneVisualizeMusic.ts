// Copyright 2021 Cao Gaoting<caogtaa@gmail.com>
// https://caogtaa.github.io
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

/*
 * Date: 2021-05-18 23:31:23
 * LastEditors: GT<caogtaa@gmail.com>
 * LastEditTime: 2021-05-23 22:48:17
*/ 

const {ccclass, property} = cc._decorator;

@ccclass
export default class SceneVisualizeMusic extends cc.Component {
    @property([cc.AudioClip])
    clips: cc.AudioClip[] = [];

    @property([cc.SpriteFrame])
    fftTextures: cc.SpriteFrame[] = [];

    @property(cc.Node)
    visualizer: cc.Node = null;

    @property(cc.Node)
    visualizerH5: cc.Node = null;

    // @property(cc.Node)
    // visualizerEx: cc.Node = null;

    @property([cc.Sprite])
    pass0Imgs: cc.Sprite[] = [];

    protected _audioIndex: number = -1;

    onLoad() {
        this.NextAudio();
    }

    public NextAudio() {
        if (this.clips.length === 0 || this.fftTextures.length !== this.clips.length)
            return;

        let index = this._audioIndex = (this._audioIndex + 1) % this.clips.length;
        let audioId = this._audioId = cc.audioEngine.playMusic(this.clips[index], true);

        this.visualizer?.getComponent("MusicVisualizer")?.SyncAudio(audioId, this.fftTextures[index]);

        // 实时FFT分析的方法只有H5环境可以工作
        // this.visualizerH5?.getComponent("MusicVisualizerH5")?.SyncAudio(audioId);

        // todo: do not re-create buff? clear with empty data
        let barCount = 32;
        let emptyBuff = new Uint8Array(barCount);       // todo: remove it
        for (let img of this.pass0Imgs) {
            img.spriteFrame = this.fftTextures[index];

            let renderBuff = img["__gt_texture"] = new cc.RenderTexture();
            renderBuff.packable = false;
            renderBuff.setFlipY(false);

            // 像素化
            renderBuff.setFilters(cc.Texture2D.Filter.NEAREST, cc.Texture2D.Filter.NEAREST);

            let gl = cc.game._renderContext;
            // renderBuff.initWithSize(32, 1, gl.STENCIL_INDEX8);
            renderBuff.initWithData(emptyBuff, cc.Texture2D.PixelFormat.I8, barCount, 1);

            // assign renderBuff to materials texture 2
            img.getMaterial(0)?.setProperty("tex2", renderBuff);
        }
    }

    protected UpdateFFTShader(sprite: cc.Sprite, frame: number) {
        let textureHeight = sprite?.spriteFrame?.getTexture()?.height || 1;
        let samplePerRow = 16;//this._samplePerRow;

        // +0.5确保不会采样到其他row
        let row = (Math.floor(frame / samplePerRow) + 0.5) / textureHeight;
        let startCol = (frame % samplePerRow) / samplePerRow;
        let endCol = (frame % samplePerRow + 1) / samplePerRow;
        let mat = sprite.getMaterial(0);
        if (mat) {
            mat.setProperty("row", row);
            mat.setProperty("startCol", startCol);
            mat.setProperty("endCol", endCol);
        }
    }

    protected _audioId: number = -1;
    protected Tick() {
        if (this._audioId === -1)
            return;

        let t = cc.audioEngine.getCurrentTime(this._audioId);
        let frame = Math.floor(t * 60);     // floor or round?
        for (let img of this.pass0Imgs) {
            this.UpdateFFTShader(img, frame);
        }
    }

    onDestroy() {
        cc.audioEngine.stopMusic();
    }

    update() {
        this.Tick();
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
}
