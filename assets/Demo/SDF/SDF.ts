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
    public RenderToMemory(root: cc.Node, others: cc.Node[], target: cc.Node, extend: number = 0): cc.RenderTexture {
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
            let gl = cc.game._renderContext;

            let targetWidth = Math.floor(root.width * scaleX + extend * 2);      // texture's width/height must be integer
            let targetHeight = Math.floor(root.height * scaleY + extend * 2);

            // 内存纹理创建后缓存在目标节点上
            // 如果尺寸和上次不一样也重新创建
            let texture: cc.RenderTexture = target["__gt_texture"];
            if (!texture || texture.width != targetWidth || texture.height != target.height) {
                texture = target["__gt_texture"] = new cc.RenderTexture();

                texture.initWithSize(targetWidth, targetHeight, gl.STENCIL_INDEX8);
                texture.packable = false;
            }
        
            camera.alignWithScreen = false;
            // camera.orthoSize = root.height / 2;
            camera.orthoSize = targetHeight / 2;
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

    public RenderSDF(texture: cc.RenderTexture, radius?: number, cutoff?: number): { texture: cc.RenderTexture, alpha: Uint8ClampedArray } {
        let imgData = texture.readPixels();
        let width = texture.width;
        let height = texture.height;

        // initialize members
        // let cutoff = this.cutoff || 0.25;
        if (cutoff === undefined)
            cutoff = 0

        radius = radius || this.radius || 18;

        let area = width * height;
        let longSide = Math.max(width, height);
        this.gridOuter = new Float64Array(area);
        this.gridInner = new Float64Array(area);
        this.f = new Float64Array(longSide);
        this.d = new Float64Array(longSide);
        this.z = new Float64Array(longSide + 1);
        this.v = new Int16Array(longSide);

        var alphaChannel = new Uint8ClampedArray(area);
    
        for (var i = 0; i < area; i++) {
            var a = imgData[i * 4 + 3] / 255; // alpha value
            this.gridOuter[i] = a === 1 ? 0 : a === 0 ? INF : Math.pow(Math.max(0, 0.5 - a), 2);
            this.gridInner[i] = a === 1 ? INF : a === 0 ? 0 : Math.pow(Math.max(0, a - 0.5), 2);
        }
    
        this.EDT(this.gridOuter, width, height, this.f, this.d, this.v, this.z);
        this.EDT(this.gridInner, width, height, this.f, this.d, this.v, this.z);
    
        for (i = 0; i < area; i++) {
            var d = this.gridOuter[i] - this.gridInner[i];
            alphaChannel[i] = Math.max(0, Math.min(255, Math.round(255 - 255 * (d / radius + cutoff))));
            // imgData[i * 4 + 0] = 255;
            // imgData[i * 4 + 1] = 255;
            // imgData[i * 4 + 2] = 255;
            imgData[i * 4 + 3] = alphaChannel[i];
        }
    
        let resultTexture = new cc.RenderTexture;
        resultTexture.initWithData(imgData, cc.Texture2D.PixelFormat.RGBA8888, width, height);
        return {
            texture: resultTexture,
            alpha: alphaChannel
        };
    };
    
    // 2D Euclidean distance transform by Felzenszwalb & Huttenlocher https://cs.brown.edu/~pff/dt/
    protected EDT(data, width, height, f, d, v, z) {
        for (var x = 0; x < width; x++) {
            for (var y = 0; y < height; y++) {
                f[y] = data[y * width + x];
            }
            this.EDT1D(f, d, v, z, height);
            for (y = 0; y < height; y++) {
                data[y * width + x] = d[y];
            }
        }
        for (y = 0; y < height; y++) {
            for (x = 0; x < width; x++) {
                f[x] = data[y * width + x];
            }
            this.EDT1D(f, d, v, z, width);
            for (x = 0; x < width; x++) {
                data[y * width + x] = Math.sqrt(d[x]);
            }
        }
    }
    
    // 1D squared distance transform
    protected EDT1D(f, d, v, z, n) {
        v[0] = 0;
        z[0] = -INF;
        z[1] = +INF;
    
        for (var q = 1, k = 0; q < n; q++) {
            var s = ((f[q] + q * q) - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
            while (s <= z[k]) {
                k--;
                s = ((f[q] + q * q) - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
            }
            k++;
            v[k] = q;
            z[k] = s;
            z[k + 1] = +INF;
        }
    
        for (q = 0, k = 0; q < n; q++) {
            while (z[k + 1] < q) k++;
            d[q] = (q - v[k]) * (q - v[k]) + f[v[k]];
        }
    }
}
