"use strict";
// Copyright 2021 Cao Gaoting<caogtaa@gmail.com>
// https://caogtaa.github.io
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT
var Fs = require("fs");
var Path = require("path");
var Png = require("./pngjs/lib/png").PNG;
var FFTTextureGenerator = /** @class */ (function () {
    function FFTTextureGenerator() {
        this._clip = null;
        this._analyser = null;
        this._freqSize = 32; // 1024, be pow of 2
        this._fftTexture = null;
        this._sampleBuff = null; // fft buffer for 1 sample
        this._sourceNode = null;
        this._outputPath = null;
    }
    FFTTextureGenerator.prototype.Generate = function (uuid, audioPath) {
        var that = this;
        Editor.log("[VIS] start loading " + audioPath);
        //@ts-ignore
        cc.assetManager.loadAny({ uuid: uuid }, function (err, clip) {
            if (err)
                Editor.log(err);
            // Editor.log(clip);
            // Editor.log(typeof clip);
            that._clip = clip;
            var dir = Path.dirname(audioPath);
            var ext = Path.extname(audioPath);
            var baseName = Path.basename(audioPath, ext);
            that._outputPath = Path.join(dir, baseName + "-fft.png");
            // Editor.log(`output = ${that._outputPath}`);
            that.ExtractFFTAndSave();
        });
    };
    FFTTextureGenerator.prototype.WriteFrame = function (fftTexture, frame, buff) {
        // 每个采样32长度
        // 纹理宽512，所以一行保存16个采样
        // 外部确保能整除，否则会有很多空间浪费
        var sampleLength = buff.length;
        var samplePerRow = 512 / sampleLength;
        //@ts-ignore
        var audio = this._clip._audio;
        var elapseInSec = audio.length / audio.sampleRate;
        var samples = Math.floor(elapseInSec * 60);
        // let sx = frame % 16 * sampleLength;
        // let sy = frame / 16;
        var sx = frame * sampleLength;
        if (sx + sampleLength > fftTexture.length) {
            console.error("fftTexture overflow");
            return;
        }
        fftTexture.set(buff, sx);
    };
    FFTTextureGenerator.prototype.ExtractFFTAndSave = function () {
        //@ts-ignore
        var audio = this._clip._audio;
        // let audio = this._audio;
        var offlineAudioCtx = new OfflineAudioContext(audio.numberOfChannels, audio.length, audio.sampleRate);
        var analyser = this._analyser = offlineAudioCtx.createAnalyser(); // new AnalyserNode(offlineAudioCtx);
        analyser.fftSize = this._freqSize * 2;
        var sourceNode = this._sourceNode = offlineAudioCtx.createBufferSource();
        sourceNode.buffer = audio;
        sourceNode.connect(analyser);
        analyser.connect(offlineAudioCtx.destination);
        var elapseInSec = audio.length / audio.sampleRate;
        var originSamples = Math.floor(elapseInSec * 60);
        var bytesPerSample = analyser.frequencyBinCount;
        var sampleBuff = this._sampleBuff = new Uint8Array(bytesPerSample);
        var samplePerRow = 512 / bytesPerSample;
        // 补齐最后一行
        var samples = Math.ceil(originSamples / samplePerRow) * samplePerRow;
        var fftTexture = this._fftTexture = new Uint8Array(samples * bytesPerSample);
        Editor.log("[VIS] texture width: " + 512 + ", height: " + fftTexture.length / 512 + ", samples: " + samples + ", samplePerRow: " + samplePerRow);
        var _loop_1 = function (i) {
            offlineAudioCtx.suspend(i / 60).then(function () {
                // analyser.getByteTimeDomainData(freqBuff);
                analyser.getByteFrequencyData(sampleBuff);
                that.WriteFrame(fftTexture, i, sampleBuff);
                /*if (i < 20) {
                    console.log(`${offlineAudioCtx.currentTime}`);
                    console.log(`data[0]: ${freqBuff[0]}`);
                }*/
            }).then(function () {
                offlineAudioCtx.resume();
            });
        };
        // 60帧每秒采样
        for (var i = 0; i < originSamples; ++i) {
            _loop_1(i);
        }
        var that = this;
        offlineAudioCtx.startRendering();
        offlineAudioCtx.oncomplete = function (ev) {
            sourceNode.stop();
            that.SaveFFTTexture(fftTexture, 512, fftTexture.length / 512);
            that.ReleaseAudioBuffer();
            Editor.log("[VIS] output: " + that._outputPath);
            // 发送回main进程进行资源刷新
            Editor.Ipc.sendToMain("music-visualizer:on-extract-finished", that._outputPath);
        };
        sourceNode.start(0);
    };
    FFTTextureGenerator.prototype.SaveFFTTexture = function (texture, width, height) {
        var img = new Png({
            colorType: 0,
            inputColorType: 0,
            width: width,
            height: height
        });
        img.data = texture;
        img.pack().pipe(Fs.createWriteStream(this._outputPath));
    };
    FFTTextureGenerator.prototype.ReleaseAudioBuffer = function () {
        this._clip = null;
        // this._audio = null;
        this._analyser = null;
        this._fftTexture = null;
        this._sampleBuff = null;
        this._sourceNode = null;
    };
    return FFTTextureGenerator;
}());
module.exports = FFTTextureGenerator;
