// Copyright 2021 Cao Gaoting<caogtaa@gmail.com>
// https://caogtaa.github.io
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

/*
 * Date: 2021-05-09 15:00:54
 * LastEditors: GT<caogtaa@gmail.com>
 * LastEditTime: 2021-05-09 15:01:32
*/ 

import MusicVisualizer from "./MusicVisualizer";
import MusicVisualizerH5 from "./MusicVisualizerH5";

const {ccclass, property} = cc._decorator;

@ccclass
export default class SceneVisualizeMusic extends cc.Component {
    @property(cc.AudioClip)
    clip: cc.AudioClip = null;

    @property(cc.SpriteFrame)
    fftTexture: cc.SpriteFrame = null;

    @property(MusicVisualizer)
    visualizer: MusicVisualizer = null;

    @property(MusicVisualizerH5)
    visualizerH5: MusicVisualizerH5 = null;

    onLoad() {
        
    }

    public Run() {
        let audioId = cc.audioEngine.playMusic(this.clip, true);
        this.visualizer?.SyncAudio(audioId, this.fftTexture);

        // 实时FFT分析的方法只有H5环境可以工作
        // this.visualizerH5?.SyncAudio(audioId);
    }

    onDestroy() {
        cc.audioEngine.stopMusic();
    }

    update() {
    }
}
