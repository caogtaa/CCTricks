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
export default class SceneVisualizeMusic extends cc.Component {
    @property([cc.AudioClip])
    clips: cc.AudioClip[] = [];

    @property([cc.SpriteFrame])
    fftTextures: cc.SpriteFrame[] = [];

    @property(cc.Node)
    visualizer: cc.Node = null;

    @property(cc.Node)
    visualizerH5: cc.Node = null;

    @property(cc.Sprite)
    visualizerEx: cc.Sprite = null;

    @property([cc.Sprite])
    pass0Imgs: cc.Sprite[] = [];

    @property([cc.Material])
    materials: cc.Material[] = [];

    @property([cc.Material])
    pass0Materials: cc.Material[] = [];

    protected _audioIndex: number = -1;
    protected _matIndex: number = -1;
    protected _renderBuffMap = new Map<cc.Node, RenderBuff>();

    // 保存名字对应的材质，简单起见在onLoad里hardcode
    protected _nameToMat = new Map<string, cc.Material>();
    protected _nameToPass0Mat = new Map<string, cc.Material>();

    // 多pass渲染时，材质依赖关系。
    // pass 0需要计算image buff，保存时序相关信息，这里暂时不使用Cocos自带的多pass，先用多个组件按顺序render的方式
    protected _matDep = new Map<string, string>();

    onLoad() {
        for (let m of this.materials) {
            this._nameToMat.set(m.name, m);
        }

        for (let m of this.pass0Materials) {
            this._nameToPass0Mat.set(m.name, m);
        }

        this._matDep
            .set("VMWaveFFT", "VMPolarExPass0")
            .set("VMPolarWave", "VMPolarExPass0")
            .set("VMPolarEx", "VMPolarExPass0")
            .set("VMPolar", "VMClassicFFTExPass0")
            .set("VMMeter", "VMClassicFFTExPass0")
            .set("VMClassic", "VMClassicFFTExPass0")
            .set("VMCircle", "VMClassicFFTExPass0")

        this.NextAudio();
        this.NextMat();
    }

    public NextMat() {
        if (this.materials.length === 0)
            return;

        let index = this._matIndex = (this._matIndex + 1) % this.materials.length;
        let mat = this.materials[index];
        let matDep = this._nameToPass0Mat.get(this._matDep.get(mat.name));
        for (let img of this.pass0Imgs) {
            img.setMaterial(0, matDep);
            img.spriteFrame = this.fftTextures[this._audioIndex];

            let renderBuff = this._renderBuffMap.get(img.node);
            if (!renderBuff) {
                renderBuff = RenderBuff.CreateComputeBuff(img.node.width, img.node.height);
                this._renderBuffMap.set(img.node, renderBuff);
            } else {
                // 清空buff避免受上一个效果影响
                renderBuff.Clear();
            }

            // assign renderBuff to materials texture 2
            img.getMaterial(0)?.setProperty("tex2", renderBuff.texture);
        }

        this.visualizerEx.setMaterial(0, mat);
    }

    public NextAudio() {
        if (this.clips.length === 0 || this.fftTextures.length !== this.clips.length)
            return;

        let index = this._audioIndex = (this._audioIndex + 1) % this.clips.length;
        let audioId = this._audioId = cc.audioEngine.playMusic(this.clips[index], true);

        // this.visualizer?.getComponent("MusicVisualizer")?.SyncAudio(audioId, this.fftTextures[index]);

        // 实时FFT分析的方法只有H5环境可以工作
        // this.visualizerH5?.getComponent("MusicVisualizerH5")?.SyncAudio(audioId);

        // todo: do not re-create buff? clear with empty data
        for (let img of this.pass0Imgs) {
            img.spriteFrame = this.fftTextures[index];

            // let renderBuff = RenderBuff.CreateComputeBuff(img.node.width, img.node.height);
            // this._renderBuffMap.set(img.node, renderBuff);

            // // assign renderBuff to materials texture 2
            // img.getMaterial(0)?.setProperty("tex2", renderBuff.texture);
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
    protected _srcIndex: number = 0;
    protected Tick() {
        if (this._audioId === -1)
            return;

        let t = cc.audioEngine.getCurrentTime(this._audioId);
        let frame = Math.floor(t * 60);     // floor or round?

        let pass0Imgs = this.pass0Imgs;
        let order = this._srcIndex;
        let from = pass0Imgs[order];
        let to = pass0Imgs[1-order];

        this.UpdateFFTShader(from, frame);
        from.enabled = true;
        this.RenderToNode(from.node, to.node);
        from.enabled = false;       // 渲染结束后隐藏自己

        this.visualizerEx.spriteFrame = this._renderBuffMap.get(to.node)?.spriteFrame;

        // 切换RenderTexture
        this._srcIndex = 1 - this._srcIndex;
    }

    onDestroy() {
        cc.audioEngine.stopMusic();
    }

    update() {
        this.Tick();
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
            node.parent = root;
            node.x = (0.5 - root.anchorX) * root.width;
            node.y = (0.5 - root.anchorY) * root.height;

            let camera = renderBuff.camera = node.addComponent(cc.Camera);
            camera.backgroundColor = new cc.Color(255, 255, 255, 0);        // 透明区域仍然保持透明，半透明区域和白色混合
            camera.clearFlags = cc.Camera.ClearFlags.DEPTH | cc.Camera.ClearFlags.STENCIL | cc.Camera.ClearFlags.COLOR;

            // 设置你想要的截图内容的 cullingMask
            camera.cullingMask = 0xffffffff;

            // let targetWidth = root.width;
            let targetHeight = root.height;

            camera.alignWithScreen = false;
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
