// Copyright 2020 Cao Gaoting<caogtaa@gmail.com>
// https://caogtaa.github.io
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

/*
 * Date: 2020-07-23 16:15:08
 * LastEditors: GT<caogtaa@gmail.com>
 * LastEditTime: 2020-07-23 16:43:03
*/

const { ccclass, property } = cc._decorator;

@ccclass
export default class SceneTestGraphics extends cc.Component {
    @property(cc.Graphics)
    graphics: cc.Graphics = null;

    onLoad() {
        let ctx = this.graphics;
        ctx.clear();
        ctx.strokeColor = cc.Color.BLACK;
        ctx.fillColor = cc.Color.RED;
        ctx.lineWidth = 5;
        ctx.moveTo(0, 0);
        ctx.lineTo(100, 100);
        ctx.stroke();

        ctx.rect(20, 20, 80, 100);
        ctx.fill();    
    }
}
