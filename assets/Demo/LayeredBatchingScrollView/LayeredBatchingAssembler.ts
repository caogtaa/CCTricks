/****************************************************************************
 Author: GT <caogtaa@gmail.com>
 https://caogtaa.github.io
****************************************************************************/

import GTSimpleSpriteAssembler2D from "../../Shader/GTSimpleSpriteAssembler2D";



// RenderFlow遍历过程中，需要防止子节点进入的函数
const RENDER_MASK = cc.RenderFlow.FLAG_RENDER | cc.RenderFlow.FLAG_POST_RENDER;
const PROP_DIRTY_MASK = cc.RenderFlow.FLAG_OPACITY | cc.RenderFlow.FLAG_WORLD_TRANSFORM;

// 通过开关控制仅在拥有该Assembler的根节点开启合批优化
// 用于避免该Assembler被嵌套使用
let BATCH_OPTIMIZE_SWITCH: boolean = true;

export default class LayeredBatchingAssembler extends GTSimpleSpriteAssembler2D {
    protected _layers: Array<Array<cc.Node>>;

    fillBuffers(comp, renderer) {
        super.fillBuffers(comp, renderer);

        if (CC_EDITOR || CC_NATIVERENDERER)
            return;

        if (!BATCH_OPTIMIZE_SWITCH)
            return;

        let layer = [];
        this._layers = [layer];

        // 当前节点是自定义渲染的根节点，worldDirtyFlag属性将被逐层传递
        // 此处的dirtyFlag包含世界坐标变化、透明度变化。（参考render-flow.js的_children函数）
        let worldTransformFlag = renderer.worldMatDirty ? cc.RenderFlow.FLAG_WORLD_TRANSFORM : 0;
        let worldOpacityFlag = renderer.parentOpacityDirty ? cc.RenderFlow.FLAG_OPACITY_COLOR : 0;
        let dirtyFlag = worldTransformFlag | worldOpacityFlag;
        comp.node["__gtDirtyFlag"] = dirtyFlag;

        // BFS过程
        let queue = [];
        queue.push(comp.node);

        let depth: number = 0;
        let end: number = 1;
        let iter: number = 0;
        let gtRenderFlag;
        while (iter < queue.length) {
            let node = queue[iter++];
            dirtyFlag = node["__gtDirtyFlag"];

            for (let c of node.children) {
                if (!c._activeInHierarchy || c._opacity === 0)
                    continue;

                gtRenderFlag = c._renderFlag & RENDER_MASK;
                if (gtRenderFlag > 0) {
                    // 移除子节点的renderFlag，使renderFlow不执行它的RENDER函数
                    c["__gtRenderFlag"] = gtRenderFlag;
                    c._renderFlag &= ~gtRenderFlag;
                    layer.push(c);
                }
                
                // 逐层传递父节点的dirtyFlag
                c["__gtDirtyFlag"] = dirtyFlag | (c._renderFlag & PROP_DIRTY_MASK);
                queue.push(c);
            }

            if (iter == end) {
                // 完成当前层遍历，开始下一层遍历
                ++ depth;
                end = queue.length;
                layer = [];
                this._layers.push(layer);
            }
        }
    }

    postFillBuffers(comp, renderer) {
        // 记录worldMatDirty，函数退出时重置回去
        let originWorldMatDirty = renderer.worldMatDirty;
        if (!BATCH_OPTIMIZE_SWITCH || !this._layers)
            return;

        // off优化开关，避免嵌套
        BATCH_OPTIMIZE_SWITCH = false;
        let gtRenderFlag;
        let gtDirtyFlag;

        // 按层级遍历所有子节点
        for (let layer of this._layers) {
            if (layer.length == 0)
                continue;

            for (let c of layer) {
                gtRenderFlag = c["__gtRenderFlag"];
                gtDirtyFlag = c["__gtDirtyFlag"];

                // 设置worldMatDirty，在引擎默认fillBuffers()中该变量用于判断是否更新世界坐标
                renderer.worldMatDirty = gtDirtyFlag > 0 ? 1 : 0;
                c._renderFlag |= gtRenderFlag;

                // 调用子节点RenderFlow的剩余部分
                cc.RenderFlow.flows[gtRenderFlag]._func(c);
            }
        }

        this._layers = null;
        BATCH_OPTIMIZE_SWITCH = true;
        renderer.worldMatDirty = originWorldMatDirty;
    }
}
