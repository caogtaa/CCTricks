// Copyright 2021 Cao Gaoting<caogtaa@gmail.com>
// https://caogtaa.github.io
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

/*
 * Date: 2021-05-20 20:45:01
 * LastEditors: GT<caogtaa@gmail.com>
 * LastEditTime: 2021-05-20 20:45:42
*/ 


function attachNode(node, parent, worldPos, callback) {
    // world position to relative position
    parent.addChild(node);
    node.position = parent.convertToNodeSpaceAR(worldPos);

    // todo: support undo
    if (callback) {
        callback(null, node);
    }
}

// load prefab by uuid, create instance under canvas or some parent node
function insertNode(param, callback) {
    param = param || { worldX: 0, worldY: 0 };
    let worldPos = cc.v2(param.worldX, param.worldY);   // todo: uniform param

    let parent = null;
    if (param.parentId) {
        // @ts-ignore
        parent = cc.engine.getInstanceById(param.parentId);
    } else {
        // canvas can be renamed, should find cc.Canvas component in scene top level
        // parent = cc.find('Canvas');
        let scene = cc.director.getScene();
        for (let s of scene.children) {
            if (s.getComponent(cc.Canvas)) {
                parent = s;
                break;
            } 
        }
    }

    if (!parent) {
        if (callback)
            callback('Canvas or parent node not found, cancel.', null);

        return;
    }

    if (param.uuid) {
        cc.loader.load(
            { uuid: param.uuid, type: 'uuid' },
            null,
            function (error, prefab) {
                if (error) {
                    Editor.log(error);
                    if (callback) {
                        callback(error, null);
                    }
                    return;
                }

                let node = cc.instantiate(prefab);
                attachNode(node, parent, worldPos, callback);
            }
        );
    } else {
        let node = new cc.Node();
        attachNode(node, parent, worldPos, callback);
    }
}

// @ts-ignore
module.exports = {
    'create-node': function (event, param) {
        let selected = Editor.Selection.curSelection('node');
        if (selected.length > 0) {
            param.parentId = selected[0];
        }

        insertNode(param, (error, node) => {
            if (node) {
                // select new node
                Editor.Selection.select('node', node.uuid);
                // Editor.log(`'${node.name}' created`);
            }

            if (event.reply) {
                event.reply(error);
            }
        });
    },

    'do-extract-fft': function(event, param) {
        Editor.log('success');
        event.reply(null);
    }
};
