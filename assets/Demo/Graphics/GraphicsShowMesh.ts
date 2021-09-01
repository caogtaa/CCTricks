const {ccclass, property} = cc._decorator;

@ccclass
export default class GraphicsShowMesh extends cc.Graphics {
    onLoad () {
        // super.onLoad();
        let mat = this.getMaterial(0);
        // if (mat.name.startsWith("GraphicsShowMesh"))
        this.InjectAssembler();
    }

    start () {
        
    }

    protected InjectAssembler() {
        let ctx = this;

        let assembler = ctx._assembler;
        //@ts-ignore
        let originFn = assembler._vset;

        //@ts-ignore
        let gfx = cc.gfx;
        let vfmtPosIndexSdf = new gfx.VertexFormat([
            { name: gfx.ATTR_POSITION, type: gfx.ATTR_TYPE_FLOAT32, num: 2 },
            { name: 'a_index', type: gfx.ATTR_TYPE_FLOAT32, num: 1 },           // kth vertex
            { name: 'a_dist', type: gfx.ATTR_TYPE_FLOAT32, num: 1 },
        ]);
        
        vfmtPosIndexSdf.name = 'vfmtPosIndexSdf';
        assembler.getVfmt = () => {
            return vfmtPosIndexSdf;
        };

        //@ts-ignore
        assembler._vset = (x, y, distance = 0) => {
            //@ts-ignore
            let buffer = assembler._buffer;
            let meshbuffer = buffer.meshbuffer;
            //@ts-ignore
            let dataOffset = buffer.vertexStart * assembler.getVfmtFloatCount();
    
            let vData = meshbuffer._vData;
            let uintVData = meshbuffer._uintVData;
    
            vData[dataOffset] = x;
            vData[dataOffset+1] = y;
            //@ts-ignore
            // uintVData[dataOffset+2] = assembler._curColor;
            vData[dataOffset+2] = Math.floor(buffer.vertexStart);
            vData[dataOffset+3] = distance;
    
            buffer.vertexStart ++;
            meshbuffer._dirty = true;
        };
    }
}
