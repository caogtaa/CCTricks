// SDF算法参考(线性时间生成CPU算法):
// https://github.com/mapbox/tiny-sdf
// liscense:
// https://opensource.org/licenses/BSD-2-Clause

let INF = 1e10;

export class EDT {
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

    protected RenderSDFToData(imgData: Uint8Array, width: number, height: number, maxDist: number = 8): Uint8ClampedArray {

        // initialize members
        // let cutoff = this.cutoff || 0.25;
        let cutoff = 0.5;           // dist = 0永远在边线上，tinySDF中radius是maxDist的2倍
        let radius = maxDist ? maxDist * 2 : 16;

        let area = width * height;
        let longSide = Math.max(width, height);
        let gridOuter = this.gridOuter = new Float64Array(area);
        let gridInner = this.gridInner = new Float64Array(area);
        this.f = new Float64Array(longSide);
        this.d = new Float64Array(longSide);
        this.z = new Float64Array(longSide + 1);
        this.v = new Int16Array(longSide);

        var alphaChannel = new Uint8ClampedArray(area);

        // Initialize grids outside the glyph range to alpha 0
        gridOuter.fill(INF, 0, area);
        gridInner.fill(0, 0, area);
    
        for (var i = 0; i < area; i++) {
            var a = imgData[i * 4 + 3] / 255; // alpha value
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
    
        for (i = 0; i < area; i++) {
            const d = Math.sqrt(gridOuter[i]) - Math.sqrt(gridInner[i]);
            alphaChannel[i] = Math.round(255 - 255 * (d / radius + cutoff));
            imgData[i * 4 + 3] = alphaChannel[i];
        }

        return alphaChannel;
    }

    public RenderSDF(texture: cc.RenderTexture, maxDist: number): { texture: cc.RenderTexture, alpha: Uint8ClampedArray } {
        let imgData = texture.readPixels();
        let width = texture.width;
        let height = texture.height;

        let alphaChannel = this.RenderSDFToData(imgData, width, height, maxDist);
        let resultTexture = new cc.RenderTexture;
        resultTexture.initWithData(imgData, cc.Texture2D.PixelFormat.RGBA8888, width, height);
        return {
            texture: resultTexture,
            alpha: alphaChannel
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
