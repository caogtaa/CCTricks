// Copyright 2021 Cao Gaoting<caogtaa@gmail.com>
// https://caogtaa.github.io
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

/*
 * Date: 2021-05-09 21:11:36
 * LastEditors: GT<caogtaa@gmail.com>
 * LastEditTime: 2021-05-09 21:13:59
*/ 

const {ccclass, property} = cc._decorator;

@ccclass
export default class Visualier extends cc.Sprite {
    @property(cc.AudioClip)
    clip: cc.AudioClip = null;

    @property(cc.SpriteFrame)
    set fft(value: cc.SpriteFrame) {
        this.spriteFrame = value;
    }
    get fft(): cc.SpriteFrame {
        return this.spriteFrame;
    }

    protected _audioId: number = -1;

    onLoad() {
    }

    public Play() {
        if (!this.clip || !this.fft) {
            this._audioId = -1;
            return;
        }

        this._audioId = cc.audioEngine.playMusic(this.clip, true);
    }

    protected UpdateFFTShader(sprite: cc.Sprite, frame: number) {
        // +0.5确保不会采样到其他row
        let textureHeight = sprite?.spriteFrame?.getTexture()?.height || 1;
        let row = (Math.floor(frame / 16) + 0.5) / textureHeight;
        let startCol = (frame % 16) / 16;
        let endCol = (frame % 16 + 1) / 16;
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
