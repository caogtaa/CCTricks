/****************************************************************************
 Author: GT <caogtaa@gmail.com>
 https://caogtaa.github.io
****************************************************************************/

const { ccclass, property } = cc._decorator;

@ccclass
export default class SceneLayeredBatchingScrollView extends cc.Component {
    @property(cc.Node)
    item: cc.Node = null;

    @property(cc.Node)
    content: cc.Node = null;

    onLoad() {
        for (let i = 0; i < 100; ++i) {
            let newItem = cc.instantiate(this.item);
            newItem.parent = this.content;
        }
    }
}
