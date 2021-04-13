/****************************************************************************
 Author: GT <caogtaa@gmail.com>
 https://caogtaa.github.io
****************************************************************************/

import LayeredBatchingAssembler from "./LayeredBatchingAssembler";


const {ccclass, property} = cc._decorator;

@ccclass
export default class LayeredBatchingRootRenderer extends cc.Sprite {
    onEnable() {
        super.onEnable();
        if (!CC_EDITOR && !CC_NATIVERENDERER)
            this.node._renderFlag |= cc.RenderFlow.FLAG_POST_RENDER;

        // this.node._renderFlag |= cc.RenderFlow.FLAG_RENDER;
    }

    _resetAssembler() {
        this.setVertsDirty();
        let assembler = this._assembler = new LayeredBatchingAssembler();
        assembler.init(this);
    }
}
