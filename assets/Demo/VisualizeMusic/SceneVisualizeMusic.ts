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

    protected _analyser: any = null;
    protected _freqSize: number = 128;
    protected _gainNode: any = null;
    protected _ac: any = null;
    protected _audioId: number = -1;
    protected _freqBuff: Uint8Array;


    onLoad() {
        this.PlayMusicAndStartAnalyse();      
    }

    protected PlayMusicAndStartAnalyse() {
        if (!this.clip)
            return;

        let audioId = this._audioId = cc.audioEngine.playMusic(this.clip, true);
        let audio = cc.audioEngine._id2audio[audioId];
        let element = audio?._element;
        let buffer = element?._buffer;
        let ac = element?._context;
        if (!buffer || !ac)
            return;

        let analyser = this._analyser = ac?.createAnalyser();
        if (!analyser) {
            console.warn("Platform not support audio analyse");
            return;
        }
        
        analyser.fftSize = this._freqSize * 2;

        //this._gainNode = ac[ac.createGain ? "createGain":"createGainNode"]();
        //this._gainNode.connect(ac.destination);
        // analyser.connect(element._gainObj);
        // analyser.connect(element._currentSource);
        element._currentSource?.connect(analyser);

        this._freqBuff = new Uint8Array(analyser.frequencyBinCount);
    }

    onDestroy() {
        cc.audioEngine.stopMusic();
    }

    update() {
        let analyser = this._analyser;
        if (!analyser || !this._freqBuff)
            return;


        // analyser.getByteFrequencyData(this._freqBuff);
        analyser.getByteTimeDomainData(this._freqBuff);
        // self.draw(arr);
        let k = 0;
    }
}
