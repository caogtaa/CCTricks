

import { GlobalMeshRenderer } from './GlobalMeshRenderer';

let _tmp_vec3 = new cc.Vec3();
//@ts-ignore
let gfx = cc.gfx;

export default class SplineTrailRendererAssembler extends cc.Assembler {
    protected _worldDatas: any = {};
    protected _renderNode: cc.Node = null;

    init(renderComp) {
        super.init(renderComp);

        this._worldDatas = {};
        this._renderNode = null;
    }

    setRenderNode(node) {
        this._renderNode = node;
    }

    fillBuffers(comp, renderer) {
        if (!comp.mesh) return;

        comp.mesh._uploadData();

        // update culling mask
        let isCullingMaskSame = renderer.cullingMask === comp.node._cullingMask;

        let enableAutoBatch = comp.enableAutoBatch;

        let materials = comp._materials;
        let submeshes = comp.mesh._subMeshes;
        let subDatas = comp.mesh.subDatas;
        for (let i = 0; i < submeshes.length; i++) {
            let ia = submeshes[i];
            let meshData = subDatas[i];

            let material = materials[i] || materials[0];

            if (!enableAutoBatch || !meshData.canBatch || ia._primitiveType !== gfx.PT_TRIANGLES) {
                renderer._flush();

                renderer.material = material;
                renderer.cullingMask = comp.node._cullingMask;
                renderer.node = this._renderNode;

                renderer._flushIA(ia);

                continue;
            }

            if (!isCullingMaskSame ||
                material.getHash() !== renderer.material.getHash()) {
                renderer._flush();
            }

            renderer.material = material;
            renderer.cullingMask = comp.node._cullingMask;
            renderer.node = renderer._dummyNode;

            this._fillBuffer(comp, meshData, renderer, i);
        }

        if (CC_DEBUG &&
            (cc.macro.SHOW_MESH_WIREFRAME || cc.macro.SHOW_MESH_NORMAL) &&
            //@ts-ignore
            !(comp.node._cullingMask & (1 << cc.Node.BuiltinGroupIndex.DEBUG))) {
            renderer._flush();
            renderer.node = this._renderNode;
            comp._updateDebugDatas();

            if (cc.macro.SHOW_MESH_WIREFRAME) {
                this._drawDebugDatas(comp, renderer, 'wireFrame');
            }
            if (cc.macro.SHOW_MESH_NORMAL) {
                this._drawDebugDatas(comp, renderer, 'normal');
            }
        }
    }

    _fillBuffer(comp, meshData, renderer, dataIndex) {
        let vData = meshData.getVData(Float32Array);

        let vtxFormat = meshData.vfm;
        let vertexCount = (vData.byteLength / vtxFormat._bytes) | 0;

        let indices = meshData.getIData(Uint16Array);
        let indicesCount = indices.length;

        let buffer = renderer.getBuffer('mesh', vtxFormat);
        let offsetInfo = buffer.request(vertexCount, indicesCount);

        // buffer data may be realloc, need get reference after request.
        let indiceOffset = offsetInfo.indiceOffset,
            vertexOffset = offsetInfo.byteOffset >> 2,
            vertexId = offsetInfo.vertexOffset,
            vbuf = buffer._vData,
            ibuf = buffer._iData;

        if (renderer.worldMatDirty || !this._worldDatas[dataIndex]) {
            this._updateWorldVertices(dataIndex, vertexCount, vData, vtxFormat, comp.node._worldMatrix);
        }

        vbuf.set(this._worldDatas[dataIndex], vertexOffset);

        for (let i = 0; i < indicesCount; i++) {
            ibuf[indiceOffset + i] = vertexId + indices[i];
        }
    }

    _updateWorldVertices(dataIndex, vertexCount, local, vtxFormat, wolrdMatrix) {
        let world = this._worldDatas[dataIndex];
        if (!world) {
            world = this._worldDatas[dataIndex] = new Float32Array(local.length);
            world.set(local);
        }

        let floatCount = vtxFormat._bytes / 4;

        let elements = vtxFormat._elements;
        for (let i = 0, n = elements.length; i < n; i++) {
            let element = elements[i];
            let attrOffset = element.offset / 4;

            if (element.name === gfx.ATTR_POSITION || element.name === gfx.ATTR_NORMAL) {
                let transformMat4 = element.name === gfx.ATTR_NORMAL ? cc.Vec3.transformMat4Normal : cc.Vec3.transformMat4;
                for (let j = 0; j < vertexCount; j++) {
                    let offset = j * floatCount + attrOffset;

                    _tmp_vec3.x = local[offset];
                    _tmp_vec3.y = local[offset + 1];
                    _tmp_vec3.z = local[offset + 2];

                    transformMat4(_tmp_vec3, _tmp_vec3, wolrdMatrix);

                    world[offset] = _tmp_vec3.x;
                    world[offset + 1] = _tmp_vec3.y;
                    world[offset + 2] = _tmp_vec3.z;
                }
            }
        }
    }

    _drawDebugDatas(comp, renderer, name) {
        let debugDatas = comp._debugDatas[name];
        if (!debugDatas) return;
        for (let i = 0; i < debugDatas.length; i++) {
            let debugData = debugDatas[i];
            if (!debugData) continue;
            let material = debugData.material;
            renderer.material = material;
            renderer._flushIA(debugData.ia);
        }
    }
}

cc.Assembler.register(GlobalMeshRenderer, SplineTrailRendererAssembler);
