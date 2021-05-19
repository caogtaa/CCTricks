import SceneVisualizeMusic from "./SceneVisualizeMusic";

 
const { ccclass, property, menu, inspector, executeInEditMode, requireComponent } = cc._decorator;

@ccclass
@executeInEditMode
@menu("control-inspector/fft-texture-generator")
@inspector("packages://control-inspector/fft-texture-generator.js")
export default class FFTTextureGenerator extends cc.Component {
    public Sync() {
        if (!CC_EDITOR)
            return;

        let scene = this.getComponent(SceneVisualizeMusic);
        let clip = scene?.clip;
        if (!clip)
            return;

        this._clip = clip;
        console.log("--entered");
        this.Test();
    }

    protected _clip: cc.AudioClip = null;
    protected _analyser: any = null;
    protected _freqSize: number = 32;   // 1024, be pow of 2
    protected _fftTexture: Uint8Array = null;
    protected _freqBuff: Uint8Array = null;     // fft buffer for 1 sample
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

    protected Test() {
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
        let samples: number = Math.floor(elapseInSec * 60);
        let freqBuff = this._freqBuff = new Uint8Array(analyser.frequencyBinCount);
        let fftTexture = this._fftTexture = new Uint8Array(samples * analyser.frequencyBinCount);        
        
        // 60帧每秒采样
        for (let i = 0; i < samples; ++i) {
            offlineAudioCtx.suspend(i / 60).then(() => {
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

        let that = this;
        offlineAudioCtx.startRendering();
        offlineAudioCtx.oncomplete = (ev: OfflineAudioCompletionEvent) => {
            sourceNode.stop();
            that.SaveFFTTexture();
            that.ReleaseAudioBuffer();
            console.log("finished without error");
        };

        sourceNode.start(0);
    }

    protected SaveFFTTexture() {

    }

    protected ReleaseAudioBuffer() {
        this._clip = null;
        this._analyser = null;
        this._fftTexture = null;
        this._freqBuff = null;
        this._sourceNode = null;
    }
}
