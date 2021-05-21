// Copyright 2021 Cao Gaoting<caogtaa@gmail.com>
// https://caogtaa.github.io
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

/*
 * Date: 2021-05-20 00:53:21
 * LastEditors: GT<caogtaa@gmail.com>
 * LastEditTime: 2021-05-21 19:54:20
*/ 


const {ccclass, property} = cc._decorator;

@ccclass
export default class MusicVisualizer extends cc.Sprite {
    @property({
        type: cc.SpriteFrame,
        displayName: "FFT纹理"
    })
    set fft(value: cc.SpriteFrame) {
        if (value) {
            let texture = value.getTexture();
            texture.setFilters(cc.Texture2D.Filter.NEAREST, cc.Texture2D.Filter.NEAREST);
            texture.packable = false;
        }

        this.spriteFrame = value;
    }
    get fft(): cc.SpriteFrame {
        return this.spriteFrame;
    }

    protected _audioId: number = -1;
    protected _samplePerRow: number = 16;

    onLoad() {
    }

    onDestroy() {
    }

    /**
     * 对运行中的音乐进行可视化。
     * 需要由外部控制音乐的播放、停止。外部通过调用cc.audioEngine.playMusic()获取audioId
     * @param audioId       cc.audioEngine.playMusic()返回的audioId
     * @param fft           audioId对应音频的FFT纹理
     * @param samplePerRow  FFT纹理每行存储的采样数
     */
    public SyncAudio(audioId: number, fft?: cc.SpriteFrame, samplePerRow?: number) {
        this._audioId = audioId;

        if (fft !== undefined) {
            // 强制修改纹理状态。像素化 & 禁止动态合图
            let texture = fft.getTexture();
            texture.setFilters(cc.Texture2D.Filter.NEAREST, cc.Texture2D.Filter.NEAREST);
            texture.packable = false;

            this.fft = fft;
        }

        if (samplePerRow !== undefined)
            this._samplePerRow = samplePerRow;
    }

    protected UpdateFFTShader(sprite: cc.Sprite, frame: number) {
        let textureHeight = sprite?.spriteFrame?.getTexture()?.height || 1;
        let samplePerRow = this._samplePerRow;

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

    update() {
        if (this._audioId === -1)
            return;

        let t = cc.audioEngine.getCurrentTime(this._audioId);
        let frame = Math.floor(t * 60);     // floor or round?
        this.UpdateFFTShader(this, frame);
    }
}
