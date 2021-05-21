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
    @property([cc.AudioClip])
    clips: cc.AudioClip[] = [];

    @property([cc.SpriteFrame])
    fftTextures: cc.SpriteFrame[] = [];

    @property(cc.Node)
    visualizer: cc.Node = null;

    @property(cc.Node)
    visualizerH5: cc.Node = null;

    protected _audioIndex: number = -1;

    onLoad() {
        this.NextAudio();
    }

    public NextAudio() {
        if (this.clips.length === 0 || this.fftTextures.length !== this.clips.length)
            return;

        let index = this._audioIndex = (this._audioIndex + 1) % this.clips.length;
        let audioId = cc.audioEngine.playMusic(this.clips[index], true);

        this.visualizer?.getComponent("MusicVisualizer")?.SyncAudio(audioId, this.fftTextures[index]);

        // 实时FFT分析的方法只有H5环境可以工作
        // this.visualizerH5?.getComponent("MusicVisualizerH5")?.SyncAudio(audioId);
    }

    onDestroy() {
        cc.audioEngine.stopMusic();
    }

    update() {
    }
}
