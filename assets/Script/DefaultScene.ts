// Learn TypeScript:
//  - https://docs.cocos.com/creator/manual/en/scripting/typescript.html
// Learn Attribute:
//  - https://docs.cocos.com/creator/manual/en/scripting/reference/attributes.html
// Learn life-cycle callbacks:
//  - https://docs.cocos.com/creator/manual/en/scripting/life-cycle-callbacks.html

const {ccclass, property} = cc._decorator;

@ccclass
export default class DefaultScene extends cc.Component {

    @property(cc.Label)
    label: cc.Label = null;

    @property
    text: string = 'hello';

    @property(cc.Node)
    avatar: cc.Node = null;


    // LIFE-CYCLE CALLBACKS:

    onLoad () {
        let node = this.avatar;
        cc.resources.load("MovingUP", cc.EffectAsset, (error: Error, effect: cc.EffectAsset) => {
            cc.resources.load("GTDup", cc.SpriteFrame, (error: Error, sf: cc.SpriteFrame) => {
                // let mat = cc.MaterialVariant.createWithBuiltin(cc.Material.BUILTIN_NAME.SPRITE);
                let mat = cc.Material.create(effect, 0);
                let sz = sf.getRect().size;
                node.width = sz.width;
                node.height = sz.height;
                let sprite = node.addComponent(cc.Sprite);
                sprite.spriteFrame = sf;
                sprite.setMaterial(0, mat);
            });
        });
    }

    start () {
        
    }

    // update (dt) {}
}
