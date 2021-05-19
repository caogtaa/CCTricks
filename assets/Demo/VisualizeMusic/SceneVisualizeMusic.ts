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
    protected _freqSize: number = 32;   // 1024, be pow of 2
    protected _gainNode: any = null;
    protected _ac: any = null;
    protected _audioId: number = -1;
    protected _freqBuff: Uint8Array = null;
    protected _sourceNode: AudioBufferSourceNode = null;

    protected _texture: cc.RenderTexture = null;
    protected _fftTexture: Uint8Array = null;

    onLoad() {
        
    }

    public WriteFrame(fftTexture: Uint8Array, frame: number, buff: Uint8Array) {
        // 每个采样32长度
        // 纹理宽512，所以一行保存16个采样
        // 外部确保能整除，否则会有很多空间浪费
        let sampleLength = buff.length;
        let samplePerRow = 512 / sampleLength;
        
        //@ts-ignore
        let audio: AudioBuffer = this.clip._audio;
        let elapseInSec = audio.length / audio.sampleRate;
        let samples = Math.floor(elapseInSec * 60);

        // let sx = frame % 16 * sampleLength;
        // let sy = frame / 16;
        let sx = frame * sampleLength;
        if (sx + sampleLength > fftTexture.length) {
            console.error("fftTexture overflow");
            return;
        }

        fftTexture.set(buff, sx);
    }

    public Run() {
        //this.FlushMatProperties(this.sprite);
        //this.PlayMusicAndStartAnalyse();

        this.Test();
    }

    protected Test() {
        //@ts-ignore
        let audio: AudioBuffer = this.clip._audio;
        let offlineAudioCtx = new OfflineAudioContext(audio.numberOfChannels, audio.length, audio.sampleRate);
        let analyser = this._analyser = offlineAudioCtx.createAnalyser();// new AnalyserNode(offlineAudioCtx);
        analyser.fftSize = this._freqSize * 2;

        let sourceNode = this._sourceNode = offlineAudioCtx.createBufferSource();
        sourceNode.buffer = audio;

        //let gain = offlineAudioCtx.createGain();


        sourceNode.connect(analyser);
        analyser.connect(offlineAudioCtx.destination);
            //.connect(gain);

        let elapseInSec = audio.length / audio.sampleRate;
        let samples: number = Math.floor(elapseInSec * 60);
        let freqBuff = this._freqBuff = new Uint8Array(analyser.frequencyBinCount);
        let fftTexture = this._fftTexture = new Uint8Array(samples * analyser.frequencyBinCount);        
        
        // 60帧每秒采样
        for (let i = 0; i < samples; ++i) {
            offlineAudioCtx.suspend(i / 60).then(() => {
                // gain.gain.setValueAtTime()
                // analyser.getByteTimeDomainData(freqBuff);
                analyser.getByteFrequencyData(freqBuff);
                that.WriteFrame(fftTexture, i, freqBuff);
                /*if (i < 20) {
                    console.log(`${offlineAudioCtx.currentTime}`);
                    console.log(`data[0]: ${freqBuff[0]}`);
                }*/
            }).then(() => {
                offlineAudioCtx.resume();
            });
        }

        /*let processor = offlineAudioCtx.createScriptProcessor(this._freqSize * 2);
        let buff = offlineAudioCtx.createBufferSource();
        buff.connect(processor);
        processor.onaudioprocess = (ev: AudioProcessingEvent) => {
            let k = 0;
        };*/

        /*let audioWorklet = offlineAudioCtx.audioWorklet;
        audioWorklet.addModule*/
        let that = this;
        offlineAudioCtx.startRendering();
        offlineAudioCtx.oncomplete = (ev: OfflineAudioCompletionEvent) => {
            sourceNode.stop();
            that.Replay();
        };

        sourceNode.start(0);
    }

    protected Replay() {

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
        let horizGrids = 28;
        let vertGrids = 33;
        let scaleX = 20 / horizGrids;
        let lod = Math.log2(this._freqSize * scaleX / horizGrids);
        lod = Math.max(1, Math.floor(lod));

        mat.setProperty("grids", [horizGrids, vertGrids]);
        mat.setProperty("scaleX", scaleX);
        mat.setProperty("lod", lod);        
    }

    onDestroy() {
        cc.audioEngine.stopMusic();
    }

    protected _kk = 0;
    update() {
        return;
        let t = cc.audioEngine.getCurrentTime(this._audioId);
        let row = Math.floor(t * 60);
        let mat = this.sprite.getMaterial(0);
        if (mat) {
            mat.setProperty("row", row);
        }
        
        return;
        let analyser = this._analyser;
        if (!analyser || !this._freqBuff)
            return;

        // 获取频域数据
        analyser.getByteFrequencyData(this._freqBuff);
        if (++this._kk < 20)
            console.log(`data[0]: ${this._freqBuff[0]}`);


        // 获取时域数据
        //analyser.getByteTimeDomainData(this._freqBuff);

        // 音频数据更新到纹理
        let texture = this._texture;
        //@ts-ignore
        let opts = texture._getOpts();
        opts.image = this._freqBuff;
        opts.format = cc.Texture2D.PixelFormat.I8;
        opts.genMipmaps = true;
        this._texture.update(opts);
    }
}
