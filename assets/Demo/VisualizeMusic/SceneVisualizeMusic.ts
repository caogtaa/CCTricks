// Copyright 2021 Cao Gaoting<caogtaa@gmail.com>
// https://caogtaa.github.io
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

/*
 * Date: 2021-05-09 15:00:54
 * LastEditors: GT<caogtaa@gmail.com>
 * LastEditTime: 2021-05-09 15:01:32
*/ 

const {ccclass, property} = cc._decorator;

@ccclass
export default class SceneVisualizeMusic extends cc.Component {
    @property(cc.AudioClip)
    clip: cc.AudioClip = null;

    @property(cc.Sprite)
    sprite: cc.Sprite = null;

    protected _analyser: any = null;
    protected _freqSize: number = 128;   // 1024, be pow of 2
    protected _gainNode: any = null;
    protected _ac: any = null;
    protected _audioId: number = -1;
    protected _freqBuff: Uint8Array = null;

    protected _texture: cc.RenderTexture = null;


    onLoad() {
        this.FlushMatProperties(this.sprite);
        this.PlayMusicAndStartAnalyse();      
    }

    protected PlayMusicAndStartAnalyse() {
        if (!this.clip)
            return;

        // 参考引擎源码
        // cocos2d\audio\CCAudio.js
        let audioId = this._audioId = cc.audioEngine.playMusic(this.clip, true);
        //@ts-ignore
        let audio = cc.audioEngine._id2audio[audioId];
        let element = audio?._element;
        let buffer = element?._buffer;
        let audioContext = element?._context;
        if (!buffer || !audioContext)
            return;

        // https://developer.mozilla.org/zh-CN/docs/Web/API/Web_Audio_API/Visualizations_with_Web_Audio_API
        let analyser = this._analyser = audioContext?.createAnalyser();
        if (!analyser) {
            console.warn("Platform not support audio analyse");
            return;
        }
        
        analyser.fftSize = this._freqSize * 2;
        element._gainObj.connect(analyser);

        this._freqBuff = new Uint8Array(analyser.frequencyBinCount);

        let gl = cc.game._renderContext;
        let texture = this._texture = new cc.RenderTexture;
        let width = analyser.frequencyBinCount;
        texture.initWithSize(width, 1, gl.STENCIL_INDEX8);
        texture.packable = false;

        // 像素化
        // texture.setFilters(cc.Texture2D.Filter.NEAREST, cc.Texture2D.Filter.NEAREST);

        // 每个像素只需要1 byte表示，用I8格式
        texture.initWithData(this._freqBuff, cc.Texture2D.PixelFormat.I8, width, 1);

        // generate mipmap
        texture.genMipmaps = true;

        this.sprite.spriteFrame = new cc.SpriteFrame(texture);
    }

    protected FlushMatProperties(sprite: cc.Sprite) {
        let mat = sprite.getMaterial(0);

        // 根据音频纹理宽度和格子数量计算lod
        let horizGrids = 32;
        let vertGrids = 38;
        let lod = Math.log2(this._freqSize / horizGrids);
        lod = Math.max(1, Math.floor(lod));

        mat.setProperty("lod", lod);
        mat.setProperty("grids", [horizGrids, vertGrids]);
    }

    onDestroy() {
        cc.audioEngine.stopMusic();
    }

    update() {
        let analyser = this._analyser;
        if (!analyser || !this._freqBuff)
            return;

        // 获取频域数据
        analyser.getByteFrequencyData(this._freqBuff);

        // 获取时域数据
        //analyser.getByteTimeDomainData(this._freqBuff);

        // 音频数据更新到纹理
        let texture = this._texture;
        //@ts-ignore
        let opts = texture._getOpts();
        opts.image = this._freqBuff;
        opts.format = cc.Texture2D.PixelFormat.I8;
        this._texture.update(opts);
    }
}
