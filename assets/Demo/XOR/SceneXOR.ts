// Copyright 2021 Cao Gaoting<caogtaa@gmail.com>
// https://caogtaa.github.io
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

/*
 * Date: 2022-01-27 16:25:31
 * LastEditors: GT<caogtaa@gmail.com>
 * LastEditTime: 2022-01-27 16:48:12
*/ 


const {ccclass, property} = cc._decorator;

@ccclass
export default class SceneXOR extends cc.Component {

    @property(cc.Node)
    container: cc.Node = null;
    
    start() {
        //@ts-ignore
        let gfx = cc.gfx;
        for (let c of this.container.children) {
            let sprite = c.getComponent(cc.Sprite);
            let mat = sprite.getMaterial(0);

            mat?.setBlend(
                true,
                gfx.BLEND_FUNC_ADD,
                gfx.BLEND_ONE_MINUS_DST_COLOR,
                gfx.BLEND_ONE_MINUS_SRC_COLOR,
                gfx.BLEND_FUNC_ADD,
                gfx.BLEND_ONE_MINUS_DST_ALPHA,
                gfx.BLEND_ONE_MINUS_SRC_ALPHA,
                0x00000000,
                0);

            console.log('enter');
        }
    }
}
