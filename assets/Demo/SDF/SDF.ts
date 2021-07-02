// SDF算法参考(线性时间生成CPU算法):
// https://github.com/mapbox/tiny-sdf
// liscense:
// https://opensource.org/licenses/BSD-2-Clause

let INF = 1e10;

export class SDF {
    protected cutoff: number;
    protected radius: number;
    protected gridOuter: Float64Array;
    protected gridInner: Float64Array;
    protected f: Float64Array;
    protected d: Float64Array;
    protected z: Float64Array;
    protected v: Int16Array;

    constructor() {

    }

    /**
     * 将root节点渲染到target节点上，target节点如果没有sprite组件会自动创建一个并关联内存纹理
     * @param root 
     * @param others 
     * @param target 
     * @param extend 内存纹理相比较原图的扩边大小，上下左右分别多出extend宽度的像素
     * @returns 
     */
    public RenderToMemory(root: cc.Node, others: cc.Node[], target: cc.Node, extend: number = 0, zoom: number = 1): cc.RenderTexture {
        // 使截屏处于被截屏对象中心（两者有同样的父节点）
        let node = new cc.Node;
        node.parent = root;
        node.x = (0.5 - root.anchorX) * root.width;
        node.y = (0.5 - root.anchorY) * root.height;

        let camera = node.addComponent(cc.Camera);
        camera.backgroundColor = new cc.Color(255, 255, 255, 0);        // 透明区域仍然保持透明，半透明区域和白色混合
        camera.clearFlags = cc.Camera.ClearFlags.DEPTH | cc.Camera.ClearFlags.STENCIL | cc.Camera.ClearFlags.COLOR;

        // 设置你想要的截图内容的 cullingMask
        camera.cullingMask = 0xffffffff;

        let success: boolean = false;
        try {
            let scaleX = 1.0;   //this.fitArea.scaleX;
            let scaleY = 1.0;   //this.fitArea.scaleY;
            //@ts-ignore
            let gl = cc.game._renderContext;

            let targetWidth = Math.floor(root.width * scaleX + extend * 2) / zoom;      // texture's width/height must be integer
            let targetHeight = Math.floor(root.height * scaleY + extend * 2) / zoom;

            // 内存纹理创建后缓存在目标节点上
            // 如果尺寸和上次不一样也重新创建
            let texture: cc.RenderTexture = target["__gt_texture"];
            if (!texture || texture.width != targetWidth || texture.height != target.height) {
                texture = target["__gt_texture"] = new cc.RenderTexture();

                texture.initWithSize(targetWidth, targetHeight, gl.STENCIL_INDEX8);
                texture.packable = false;
            }
        
            camera.alignWithScreen = false;
            camera.orthoSize = targetHeight / 2 * zoom;
            camera.targetTexture = texture;

            // 渲染一次摄像机，即更新一次内容到 RenderTexture 中
            camera.render(root);
            if (others) {
                for (let o of others) {
                    camera.render(o);
                }
            }

            let screenShot = target;
            screenShot.active = true;
            screenShot.opacity = 255;

            // screenShot.parent = root.parent;
            // screenShot.position = root.position;
            screenShot.width = targetWidth;     // root.width;
            screenShot.height = targetHeight;   // root.height;
            screenShot.angle = root.angle;

            // fitArea有可能被缩放，截图的实际尺寸是缩放后的
            screenShot.scaleX = 1.0 / scaleX;
            screenShot.scaleY = -1.0 / scaleY;

            let sprite = screenShot.getComponent(cc.Sprite);
            if (!sprite) {
                sprite = screenShot.addComponent(cc.Sprite);
                // sprite.srcBlendFactor = cc.macro.BlendFactor.ONE;
            }

            if (!sprite.spriteFrame) {
                sprite.sizeMode = cc.Sprite.SizeMode.CUSTOM;
                sprite.spriteFrame = new cc.SpriteFrame(texture);
            }
            
            success = true;
        } finally {
            camera.targetTexture = null;
            node.removeFromParent();
            if (!success) {
                target.active = false;
            }
        }

        return target["__gt_texture"];
    }

    public RenderSDFToData(imgData: Uint8Array, width: number, height: number, radius?: number, cutoff?: number, zoom: number = 1): Uint8ClampedArray {

        // initialize members
        // let cutoff = this.cutoff || 0.25;
        if (cutoff === undefined)
            cutoff = 0;

        radius = radius || this.radius || 18;

        let area = width * height;
        let longSide = Math.max(width, height);
        let gridOuter = this.gridOuter = new Float64Array(area);
        let gridInner = this.gridInner = new Float64Array(area);
        this.f = new Float64Array(longSide);
        this.d = new Float64Array(longSide);
        this.z = new Float64Array(longSide + 1);
        this.v = new Int16Array(longSide);

        // var alphaChannel = new Uint8ClampedArray(area);
        // todo: 先用4个8位表示32位，避免讨论大小端问题
        let alpha32 = new Uint8ClampedArray(area * 4);

        // Initialize grids outside the glyph range to alpha 0
        gridOuter.fill(INF, 0, area);
        gridInner.fill(0, 0, area);
    
        for (let i = 0; i < area; ++i) {
            let a = imgData[i * 4 + 3] / 255; // alpha value
            if (a === 0) continue; // empty pixels
            if (a === 1) { // fully drawn pixels
                gridOuter[i] = 0;
                gridInner[i] = INF;
            } else { // aliased pixels
                const d = 0.5 - a;
                gridOuter[i] = d > 0 ? d * d : 0;
                gridInner[i] = d < 0 ? d * d : 0;
            }
        }
    
        this.edt(gridOuter, width, height, this.f, this.d, this.v, this.z);
        this.edt(gridInner, width, height, this.f, this.d, this.v, this.z);
    
        let offset = 0;
        for (let i = 0; i < area; ++i) {
            const d = Math.sqrt(gridOuter[i]) - Math.sqrt(gridInner[i]);
            // 1 byte version
            // alphaChannel[i] = Math.round(255 - 255 * (d / radius + cutoff));
            // compose with original image
            // imgData[i * 4 + 3] = alphaChannel[i];

            // 4 bytes version
            let a = d / radius + cutoff;    // a in range [0, 1]
            for (let k = 0; k < 4; ++k) {
                a *= 256;
                alpha32[offset++] = Math.floor(a);
                a -= Math.floor(a);
            }
        }

        return alpha32;
    }

    public RenderSDF(texture: cc.RenderTexture, radius?: number, cutoff?: number, zoom: number = 1): { texture: cc.RenderTexture, alphaTexture: cc.RenderTexture } {
        let imgData = texture.readPixels();
        let width = texture.width;
        let height = texture.height;

        let alpha32 = this.RenderSDFToData(imgData, width, height, radius, cutoff, zoom);
        // let resultTexture = new cc.RenderTexture;
        // resultTexture.initWithData(imgData, cc.Texture2D.PixelFormat.RGBA8888, width, height);
        let alpha32Texture = new cc.RenderTexture;
        alpha32Texture.initWithData(alpha32, cc.Texture2D.PixelFormat.RGBA8888, width, height);
        return {
            texture: null,  // resultTexture,
            alphaTexture: alpha32Texture
        };
    };
    
    // 2D Euclidean distance transform by Felzenszwalb & Huttenlocher https://cs.brown.edu/~pff/dt/
    protected edt(data, width, height, f, d, v, z) {
        for (let x = 0; x < width; x++) this.edt1d(data, x, width, height, f, v, z);
        for (let y = 0; y < height; y++) this.edt1d(data, y * width, 1, width, f, v, z);
    }

    // 1D squared distance transform
    protected edt1d(grid, offset, stride, length, f, v, z) {
        v[0] = 0;
        z[0] = -INF;
        z[1] = INF;
        f[0] = grid[offset];

        for (let q = 1, k = 0, s = 0; q < length; q++) {
            f[q] = grid[offset + q * stride];
            const q2 = q * q;
            do {
                const r = v[k];
                s = (f[q] - f[r] + q2 - r * r) / (q - r) / 2;
            } while (s <= z[k] && --k > -1);

            k++;
            v[k] = q;
            z[k] = s;
            z[k + 1] = INF;
        }

        for (let q = 0, k = 0; q < length; q++) {
            while (z[k + 1] < q) k++;
            const r = v[k];
            const qr = q - r;
            grid[offset + q * stride] = f[r] + qr * qr;
        }
    }
}
