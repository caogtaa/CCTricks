// Copyright 2021 Cao Gaoting<caogtaa@gmail.com>
// https://caogtaa.github.io
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

/*
 * Date: 2021-05-09 21:11:36
 * LastEditors: GT<caogtaa@gmail.com>
 * LastEditTime: 2021-05-09 21:13:59
*/ 

// Note: run `tsc FFTTextureGenerator.ts` to compile this script

// some necessary declaration for tsc to work
declare var require: any;
declare var Editor: any;
declare namespace cc {
    export class AudioClip {}    
}

let fs = require("fs");
let PNG = require("pngjs").PNG;

class FFTTextureGenerator {
    public Generate(audioPath: string) {
        Editor.log(`enter extract: ${audioPath}`);
    }

    /*public HandleInspectorClick() {
        return;
        if (!CC_EDITOR)
            return;

        let scene = this.getComponent(SceneVisualizeMusic);
        let clip = scene?.clip;
        if (!clip)
            return;

        this._clip = clip;
        console.log("--entered");
        this.ExtractFFTAndSave();
    }*/

    protected _clip: cc.AudioClip = null;
    protected _analyser: any = null;
    protected _freqSize: number = 32;   // 1024, be pow of 2
    protected _fftTexture: Uint8Array = null;
    protected _sampleBuff: Uint8Array = null;     // fft buffer for 1 sample
    protected _sourceNode: AudioBufferSourceNode = null;
    
    public WriteFrame(fftTexture: Uint8Array, frame: number, buff: Uint8Array) {
        // 每个采样32长度
        // 纹理宽512，所以一行保存16个采样
        // 外部确保能整除，否则会有很多空间浪费
        let sampleLength = buff.length;
        let samplePerRow = 512 / sampleLength;
        
        //@ts-ignore
        let audio: AudioBuffer = this._clip._audio;
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

    protected ExtractFFTAndSave() {
        //@ts-ignore
        let audio: AudioBuffer = this._clip._audio;
        let offlineAudioCtx = new OfflineAudioContext(audio.numberOfChannels, audio.length, audio.sampleRate);
        let analyser = this._analyser = offlineAudioCtx.createAnalyser();// new AnalyserNode(offlineAudioCtx);
        analyser.fftSize = this._freqSize * 2;

        let sourceNode = this._sourceNode = offlineAudioCtx.createBufferSource();
        sourceNode.buffer = audio;
        sourceNode.connect(analyser);
        analyser.connect(offlineAudioCtx.destination);

        let elapseInSec = audio.length / audio.sampleRate;
        let originSamples: number = Math.floor(elapseInSec * 60);
        let bytesPerSample = analyser.frequencyBinCount;

        let sampleBuff = this._sampleBuff = new Uint8Array(bytesPerSample);
        let samplePerRow = 512 / bytesPerSample;

        // 补齐最后一行
        let samples = Math.ceil(originSamples / samplePerRow) * samplePerRow;
        let fftTexture = this._fftTexture = new Uint8Array(samples * bytesPerSample);

        console.log(`texture width: ${512}, height: ${fftTexture.length / 512}, samples: ${samples}, samplePerRow: ${samplePerRow}`);
        
        // 60帧每秒采样
        for (let i = 0; i < originSamples; ++i) {
            offlineAudioCtx.suspend(i / 60).then(() => {
                // analyser.getByteTimeDomainData(freqBuff);
                analyser.getByteFrequencyData(sampleBuff);
                that.WriteFrame(fftTexture, i, sampleBuff);
                /*if (i < 20) {
                    console.log(`${offlineAudioCtx.currentTime}`);
                    console.log(`data[0]: ${freqBuff[0]}`);
                }*/
            }).then(() => {
                offlineAudioCtx.resume();
            });
        }

        let that = this;
        offlineAudioCtx.startRendering();
        offlineAudioCtx.oncomplete = (ev: OfflineAudioCompletionEvent) => {
            sourceNode.stop();
            that.SaveFFTTexture(fftTexture, 512, fftTexture.length / 512);
            that.ReleaseAudioBuffer();
            console.log("finished without error");
        };

        sourceNode.start(0);
    }

    protected SaveFFTTexture(texture: Uint8Array, width: number, height: number) {
        let img = new PNG({
            colorType: 0,       // grayscale
            inputColorType: 0,  // grayscale
            width: width,
            height: height
        });

        img.data = texture;
        img.pack().pipe(fs.createWriteStream("F:/workspace/CCBatchingTricks/aa.png"));
    }

    protected ReleaseAudioBuffer() {
        this._clip = null;
        this._analyser = null;
        this._fftTexture = null;
        this._sampleBuff = null;
        this._sourceNode = null;
    }
}

export = FFTTextureGenerator;
