// Copyright 2021 Cao Gaoting<caogtaa@gmail.com>
// https://caogtaa.github.io
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

/*
 * Date: 2021-05-20 01:42:36
 * LastEditors: GT<caogtaa@gmail.com>
 * LastEditTime: 2021-05-20 01:44:19
*/ 

const {ccclass, property} = cc._decorator;

@ccclass
export default class MusicVisualzierH5 extends cc.Sprite {
    protected _audioId: number = -1;

    protected _analyser: any = null;
    protected _freqSize: number = 32;   // 1024, be pow of 2
    protected _gainNode: any = null;
    protected _ac: any = null;
    protected _sampleBuff: Uint8Array = null;
    // protected _sourceNode: AudioBufferSourceNode = null;

    protected _fftSampleTexture: cc.RenderTexture = null;
    // protected _fftTexture: Uint8Array = null;

    onLoad() {
    }

    onDestroy() {
    }

    /**
     * 对运行中的音乐进行可视化。
     * 需要由外部控制音乐的播放、停止。外部通过调用cc.audioEngine.playMusic()获取audioId
     * @param audioId 
     * @param fft 
     * @param samplePerRow 
     */
    public SyncAudio(audioId: number, fft?: cc.SpriteFrame, samplePerRow?: number) {
        this._audioId = audioId;
        this.FlushMatProperties(this);
        this.StartAnalyse(audioId);
    }

    protected FlushMatProperties(sprite: cc.Sprite) {
        // use default
        /*let mat = sprite.getMaterial(0);
        if (!mat)
            return;

        // deprecated
        // 根据音频纹理宽度和格子数量计算lod
        /*let horizGrids = 33;
        let vertGrids = 38;
        let scaleX = 20 / horizGrids;
        let lod = Math.log2(this._freqSize * scaleX / horizGrids);
        lod = Math.max(1, Math.floor(lod));

        mat.setProperty("grids", [horizGrids, vertGrids]);
        mat.setProperty("scaleX", scaleX);
        mat.setProperty("lod", lod);*/
    }

    protected StartAnalyse(audioId: number) {
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

        this._sampleBuff = new Uint8Array(analyser.frequencyBinCount);

        let gl = cc.game._renderContext;
        let texture = this._fftSampleTexture = new cc.RenderTexture;
        let width = analyser.frequencyBinCount;
        texture.initWithSize(width, 1, gl.STENCIL_INDEX8);
        texture.packable = false;

        // 像素化
        texture.setFilters(cc.Texture2D.Filter.NEAREST, cc.Texture2D.Filter.NEAREST);

        // 每个像素只需要1 byte表示，用I8格式
        texture.initWithData(this._sampleBuff, cc.Texture2D.PixelFormat.I8, width, 1);
        this.spriteFrame = new cc.SpriteFrame(texture);
    }

    update() {
        if (this._audioId === -1)
            return;

        let analyser = this._analyser;
        if (!analyser || !this._sampleBuff)
            return;

        // 获取频域数据
        analyser.getByteFrequencyData(this._sampleBuff);

        // 获取时域数据
        //analyser.getByteTimeDomainData(this._sampleBuff);

        // 音频数据更新到纹理
        let texture = this._fftSampleTexture;
        //@ts-ignore
        let opts = texture._getOpts();
        opts.image = this._sampleBuff;
        opts.format = cc.Texture2D.PixelFormat.I8;
        opts.genMipmaps = true;
        texture.update(opts);
    }
}
