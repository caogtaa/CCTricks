// Copyright 2021 Cao Gaoting<caogtaa@gmail.com>
// https://caogtaa.github.io
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

/*
 * Date: 2021-08-08 14:09:47
 * LastEditors: GT<caogtaa@gmail.com>
 * LastEditTime: 2021-08-08 14:16:59
*/ 

export class EDTAA3 {
    protected _useDualChannel: boolean = false;

    // 目前Distance Texture是8bit的，所以maxDist最大是8（4bit表示16，内外平分）
    public RenderSDF(texture: cc.RenderTexture, maxDist: number = 8): { texture: cc.RenderTexture, alpha: Uint8ClampedArray } {
        this._useDualChannel = (maxDist > 8);

        let imgData = texture.readPixels();
        let width = texture.width;
        let height = texture.height;
        let alpha = this.GenerateSDF(imgData, width, height, maxDist);

        // let alphaChannel = this.RenderSDFToData(imgData, width, height, radius, cutoff);
        let resultTexture = new cc.RenderTexture;
        if (this._useDualChannel) {
            // 手动插值需要用point采样
            resultTexture.setFilters(cc.Texture2D.Filter.NEAREST, cc.Texture2D.Filter.NEAREST);
        }

        resultTexture.initWithData(alpha, cc.Texture2D.PixelFormat.RGBA8888, width, height);
        resultTexture.packable = false;
        // resultTexture.initWithData(imgData, cc.Texture2D.PixelFormat.I8, width, height);
        return {
            texture: resultTexture,
            alpha: alpha
        };
    };

    /**
     * 生成img图片对应的SDF
     * 假设img是单通道图片，并且满足edtaa3对原图的要求：基于理想边缘box-filter采样，AA宽度不大于1 texel（详见论文）
     * @param imgorigin 
     * @param height 
     * @param width 
     */
    // NOTE: 这里mrows和ncols的含义可能正好相反，mrows对应w，ncols对应h
    public GenerateSDF(imgorigin: Uint8Array, mrows: number, ncols: number, maxDist: number = 8): Uint8ClampedArray {
        // imgorigin是RGBA类型
        // alpha通道[0,256)转换成float64类型[0,1)
        let coef = 1./255;
        let img = new Float64Array(mrows * ncols);
        for (let i = 0, n = mrows * ncols; i < n; ++i) {
            img[i] = imgorigin[i * 4 + 3] * coef;
        }

        let outside = this.edtaa_main(img, mrows, ncols);
        for (let i = 0, n = mrows * ncols; i < n; ++i) {
            img[i] = 1.0 - img[i];
        }
        let inside = this.edtaa_main(img, mrows, ncols);

        // todo: 这里只用1通道可以吗？
        // distmap = outside - inside;
        let sdf = new Uint8ClampedArray(mrows * ncols * 4);
        let dist: number;
        let base: number;
        if (this._useDualChannel) {
            // use dual channel
            for (let i = 0, n = mrows * ncols; i < n; ++i) {
                // inside > 0, outside < 0
                dist = inside[i] - outside[i];

                // clamp dist value to [0, 65535]
                // store hi 8 bits in A channel
                // store lo 8 bits in R channel
                dist = Math.round(32768 + dist * 256);
                if (dist < 0)   dist = 0;
                if (dist > 65535)   dist = 65535;

                base = i * 4;
                sdf[base+3] = Math.floor(dist / 256);       // 特地把高位分量放到alpha通道，避免正常渲染啥都看不到
                sdf[base] = dist % 256;
            }
        } else {
            for (let i = 0, n = mrows * ncols; i < n; ++i) {
                dist = inside[i] - outside[i];
                base = i * 4;
                sdf[base+3] = 128 + dist * 16;      // 优先填充alpha通道
                // sdf[base] = sdf[base+1] = sdf[base+2] = sdf[base+3] = 128 + dist * 16;             // 8bit拆分成2个4bit，分别表示整数部分和小数部分。此时1个像素距离色值差16
            }
        }

        return sdf;
    }

    // flow of mexFunction in edtaa3.c
    protected edtaa_main(img: Float64Array, mrows: number, ncols: number): Float64Array {
        // plhs[0] = mxCreateDoubleMatrix(mrows, ncols, mxREAL);
        // Dout = mxGetPr(plhs[0]);
        let Dout = new Float64Array(mrows * ncols);

        // /* Call the C subroutine. */
        // xdist = (short*)mxMalloc(mrows*ncols*sizeof(short)); // local data
        // ydist = (short*)mxMalloc(mrows*ncols*sizeof(short));
        // gx = (double*)mxCalloc(mrows*ncols, sizeof(double));
        // gy = (double*)mxCalloc(mrows*ncols, sizeof(double));

        let xdist = new Int16Array(mrows * ncols);
        let ydist = new Int16Array(mrows * ncols);
        let gx = new Float64Array(mrows * ncols);
        let gy = new Float64Array(mrows * ncols);

        // computegradient(img, mrows, ncols, gx, gy);
        this.computegradient(img, mrows, ncols, gx, gy);

        // edtaa3(img, gx, gy, mrows, ncols, xdist, ydist, Dout);
        this.edtaa3(img, gx, gy, mrows, ncols, xdist, ydist, Dout);
        // // Pixels with grayscale>0.5 will have a negative distance.
        // // This is correct, but we don't want values <0 returned here.
        for (let i=0, n=mrows*ncols; i<n; ++i) {
            if(Dout[i] < 0) Dout[i]=0.0;
        }

        // 返回值有2个，double类型Dout和int32类型Iout
        // Iout保存的是下标索引值，暂时用不上
        // if(nlhs > 1) {
        // /* Create a new int array, set output data pointer to it. */
        //     plhs[1] = mxCreateNumericMatrix(mrows, ncols, mxINT32_CLASS, mxREAL);
        //     Iout = mxGetData(plhs[1]);
        //     // Compute output data for optional 'index to closest object pixel'
        //     for(i=0; i<mrows*ncols; i++) {
        //     Iout[i] = i+1 - xdist[i] - ydist[i]*mrows;
        //     }
        // }

        // mxFree(xdist); // Local data allocated with mxMalloc()
        // mxFree(ydist); // (Would be automatically deallocated, but be tidy)
        // mxFree(gx);
        // mxFree(gy);
        return Dout;
    }

    /*
    * Compute the local gradient at edge pixels using convolution filters.
    * The gradient is computed only at edge pixels. At other places in the
    * image, it is never used, and it's mostly zero anyway.
    */
    // void computegradient(double *img, int w, int h, double *gx, double *gy)
    protected computegradient(img: Float64Array, w: number, h: number, gx: Float64Array, gy: Float64Array) {
        let i: number, j: number, k: number, p: number, q: number;
        let glength: number;
        let SQRT2: number = 1.4142136;
        for(i = 1; i < h-1; i++) { // Avoid edges where the kernels would spill over
            for(j = 1; j < w-1; j++) {
                k = i*w + j;
                if((img[k]>0.0) && (img[k]<1.0)) { // Compute gradient for edge pixels only
                    gx[k] = -img[k-w-1] - SQRT2*img[k-1] - img[k+w-1] + img[k-w+1] + SQRT2*img[k+1] + img[k+w+1];
                    gy[k] = -img[k-w-1] - SQRT2*img[k-w] - img[k-w+1] + img[k+w-1] + SQRT2*img[k+w] + img[k+w+1];
                    glength = gx[k]*gx[k] + gy[k]*gy[k];
                    if(glength > 0.0) { // Avoid division by zero
                        glength = Math.sqrt(glength);
                        gx[k]=gx[k]/glength;
                        gy[k]=gy[k]/glength;
                    }
                }
            }
        }
    }

    protected edgedf(gx: number, gy: number, a: number)
    {
        let df: number, glength: number, temp: number, a1: number;      // double
    
        if ((gx == 0) || (gy == 0)) { // Either A) gu or gv are zero, or B) both
            df = 0.5-a;  // Linear approximation is A) correct or B) a fair guess
        } else {
            glength = Math.sqrt(gx*gx + gy*gy);
            if(glength>0) {
                gx = gx/glength;
                gy = gy/glength;
            }
            /* Everything is symmetric wrt sign and transposition,
             * so move to first octant (gx>=0, gy>=0, gx>=gy) to
             * avoid handling all possible edge directions.
             */
            gx = Math.abs(gx);
            gy = Math.abs(gy);
            if(gx<gy) {
                temp = gx;
                gx = gy;
                gy = temp;
            }
            a1 = 0.5*gy/gx;
            if (a < a1) { // 0 <= a < a1
                df = 0.5*(gx + gy) - Math.sqrt(2.0*gx*gy*a);
            } else if (a < (1.0-a1)) { // a1 <= a <= 1-a1
                df = (0.5-a)*gx;
            } else { // 1-a1 < a <= 1
                df = -0.5*(gx + gy) + Math.sqrt(2.0*gx*gy*(1.0-a));
            }
        }    
        return df;
    }

    protected distaa3(img: Float64Array, gximg: Float64Array, gyimg: Float64Array, 
        w: number, c: number, xc: number, yc: number, xi: number, yi: number)
      {
      let di: number, df: number, dx: number, dy: number, gx: number, gy: number, a: number;    // double
      let closest: number;      // int
      
      closest = c-xc-yc*w; // Index to the edge pixel pointed to from c
      a = img[closest];    // Grayscale value at the edge pixel
      gx = gximg[closest]; // X gradient component at the edge pixel
      gy = gyimg[closest]; // Y gradient component at the edge pixel
      
      if(a > 1.0) a = 1.0;
      if(a < 0.0) a = 0.0; // Clip grayscale values outside the range [0,1]
      if(a == 0.0) return 1000000.0; // Not an object pixel, return "very far" ("don't know yet")
    
      dx = xi;
      dy = yi;
      di = Math.sqrt(dx*dx + dy*dy); // Length of integer vector, like a traditional EDT
      if(di==0) { // Use local gradient only at edges
          // Estimate based on local gradient only
          df = this.edgedf(gx, gy, a);
      } else {
          // Estimate gradient based on direction to edge (accurate for large di)
          df = this.edgedf(dx, dy, a);
      }
      return di + df; // Same metric as edtaa2, except at edges (where di=0)
    }

    protected edtaa3(img: Float64Array, gx: Float64Array, gy: Float64Array, 
        w: number, h: number, distx: Int16Array, disty: Int16Array, dist: Float64Array)
    {
        let x: number, y: number, i: number, c: number;       // int
        let offset_u: number, offset_ur: number, offset_r: number, offset_rd: number,
          offset_d: number, offset_dl: number, offset_l: number, offset_lu: number;       // int
        let olddist: number, newdist: number;     // double
        let cdistx: number, cdisty: number, newdistx: number, newdisty: number;   // int
        let changed: number;      // int
        let epsilon = 1e-3;
      
        /* Initialize index offsets for the current image width */
        offset_u = -w;
        offset_ur = -w+1;
        offset_r = 1;
        offset_rd = w+1;
        offset_d = w;
        offset_dl = w-1;
        offset_l = -1;
        offset_lu = -w-1;
      
        /* Initialize the distance images */
        for(i=0; i<w*h; i++) {
            distx[i] = 0; // At first, all pixels point to
            disty[i] = 0; // themselves as the closest known.
            if(img[i] <= 0.0) {
                dist[i]= 1000000.0; // Big value, means "not set yet"
            } else if (img[i]<1.0) {
                dist[i] = this.edgedf(gx[i], gy[i], img[i]); // Gradient-assisted estimate
            } else {
                dist[i]= 0.0; // Inside the object
            }
        }
      
        /* Perform the transformation */
        do {
            changed = 0;
      
            /* Scan rows, except first row */
            for(y=1; y<h; y++) {
      
                /* move index to leftmost pixel of current row */
                i = y*w;
      
                /* scan right, propagate distances from above & left */
      
                /* Leftmost pixel is special, has no left neighbors */
                olddist = dist[i];
                if(olddist > 0) // If non-zero distance or not set yet
                {
                    c = i + offset_u; // Index of candidate for testing
                    cdistx = distx[c];
                    cdisty = disty[c];
                    newdistx = cdistx;
                    newdisty = cdisty+1;
                    newdist = this.distaa3(img, gx, gy, w, c, cdistx, cdisty, newdistx, newdisty);
                    // newdist = this.distaa3(img, gx, gy, w, c, cdistx, cdisty, newdistx, newdisty);
                    if(newdist < olddist-epsilon)
                    {
                        distx[i]=newdistx;
                        disty[i]=newdisty;
                        dist[i]=newdist;
                        olddist=newdist;
                        changed = 1;
                    }
      
                    c = i+offset_ur;
                    cdistx = distx[c];
                    cdisty = disty[c];
                    newdistx = cdistx-1;
                    newdisty = cdisty+1;
                    newdist = this.distaa3(img, gx, gy, w, c, cdistx, cdisty, newdistx, newdisty);
                    if(newdist < olddist-epsilon)
                    {
                        distx[i]=newdistx;
                        disty[i]=newdisty;
                        dist[i]=newdist;
                        changed = 1;
                    }
                }
                i++;
      
                /* Middle pixels have all neighbors */
                for(x=1; x<w-1; x++, i++)
                {
                    olddist = dist[i];
                    if(olddist <= 0) continue; // No need to update further
      
                    c = i+offset_l;
                    cdistx = distx[c];
                    cdisty = disty[c];
                    newdistx = cdistx+1;
                    newdisty = cdisty;
                    newdist = this.distaa3(img, gx, gy, w, c, cdistx, cdisty, newdistx, newdisty);
                    if(newdist < olddist-epsilon)
                    {
                        distx[i]=newdistx;
                        disty[i]=newdisty;
                        dist[i]=newdist;
                        olddist=newdist;
                        changed = 1;
                    }
      
                    c = i+offset_lu;
                    cdistx = distx[c];
                    cdisty = disty[c];
                    newdistx = cdistx+1;
                    newdisty = cdisty+1;
                    newdist = this.distaa3(img, gx, gy, w, c, cdistx, cdisty, newdistx, newdisty);
                    if(newdist < olddist-epsilon)
                    {
                        distx[i]=newdistx;
                        disty[i]=newdisty;
                        dist[i]=newdist;
                        olddist=newdist;
                        changed = 1;
                    }
      
                    c = i+offset_u;
                    cdistx = distx[c];
                    cdisty = disty[c];
                    newdistx = cdistx;
                    newdisty = cdisty+1;
                    newdist = this.distaa3(img, gx, gy, w, c, cdistx, cdisty, newdistx, newdisty);
                    if(newdist < olddist-epsilon)
                    {
                        distx[i]=newdistx;
                        disty[i]=newdisty;
                        dist[i]=newdist;
                        olddist=newdist;
                        changed = 1;
                    }
      
                    c = i+offset_ur;
                    cdistx = distx[c];
                    cdisty = disty[c];
                    newdistx = cdistx-1;
                    newdisty = cdisty+1;
                    newdist = this.distaa3(img, gx, gy, w, c, cdistx, cdisty, newdistx, newdisty);
                    if(newdist < olddist-epsilon)
                    {
                        distx[i]=newdistx;
                        disty[i]=newdisty;
                        dist[i]=newdist;
                        changed = 1;
                    }
                }
      
                /* Rightmost pixel of row is special, has no right neighbors */
                olddist = dist[i];
                if(olddist > 0) // If not already zero distance
                {
                    c = i+offset_l;
                    cdistx = distx[c];
                    cdisty = disty[c];
                    newdistx = cdistx+1;
                    newdisty = cdisty;
                    newdist = this.distaa3(img, gx, gy, w, c, cdistx, cdisty, newdistx, newdisty);
                    if(newdist < olddist-epsilon)
                    {
                        distx[i]=newdistx;
                        disty[i]=newdisty;
                        dist[i]=newdist;
                        olddist=newdist;
                        changed = 1;
                    }
      
                    c = i+offset_lu;
                    cdistx = distx[c];
                    cdisty = disty[c];
                    newdistx = cdistx+1;
                    newdisty = cdisty+1;
                    newdist = this.distaa3(img, gx, gy, w, c, cdistx, cdisty, newdistx, newdisty);
                    if(newdist < olddist-epsilon)
                    {
                        distx[i]=newdistx;
                        disty[i]=newdisty;
                        dist[i]=newdist;
                        olddist=newdist;
                        changed = 1;
                    }
      
                    c = i+offset_u;
                    cdistx = distx[c];
                    cdisty = disty[c];
                    newdistx = cdistx;
                    newdisty = cdisty+1;
                    newdist = this.distaa3(img, gx, gy, w, c, cdistx, cdisty, newdistx, newdisty);
                    if(newdist < olddist-epsilon)
                    {
                        distx[i]=newdistx;
                        disty[i]=newdisty;
                        dist[i]=newdist;
                        changed = 1;
                    }
                }
      
                /* Move index to second rightmost pixel of current row. */
                /* Rightmost pixel is skipped, it has no right neighbor. */
                i = y*w + w-2;
      
                /* scan left, propagate distance from right */
                for(x=w-2; x>=0; x--, i--)
                {
                    olddist = dist[i];
                    if(olddist <= 0) continue; // Already zero distance
      
                    c = i+offset_r;
                    cdistx = distx[c];
                    cdisty = disty[c];
                    newdistx = cdistx-1;
                    newdisty = cdisty;
                    newdist = this.distaa3(img, gx, gy, w, c, cdistx, cdisty, newdistx, newdisty);
                    if(newdist < olddist-epsilon)
                    {
                        distx[i]=newdistx;
                        disty[i]=newdisty;
                        dist[i]=newdist;
                        changed = 1;
                    }
                }
            }
            
            /* Scan rows in reverse order, except last row */
            for(y=h-2; y>=0; y--)
            {
                /* move index to rightmost pixel of current row */
                i = y*w + w-1;
      
                /* Scan left, propagate distances from below & right */
      
                /* Rightmost pixel is special, has no right neighbors */
                olddist = dist[i];
                if(olddist > 0) // If not already zero distance
                {
                    c = i+offset_d;
                    cdistx = distx[c];
                    cdisty = disty[c];
                    newdistx = cdistx;
                    newdisty = cdisty-1;
                    newdist = this.distaa3(img, gx, gy, w, c, cdistx, cdisty, newdistx, newdisty);
                    if(newdist < olddist-epsilon)
                    {
                        distx[i]=newdistx;
                        disty[i]=newdisty;
                        dist[i]=newdist;
                        olddist=newdist;
                        changed = 1;
                    }
      
                    c = i+offset_dl;
                    cdistx = distx[c];
                    cdisty = disty[c];
                    newdistx = cdistx+1;
                    newdisty = cdisty-1;
                    newdist = this.distaa3(img, gx, gy, w, c, cdistx, cdisty, newdistx, newdisty);
                    if(newdist < olddist-epsilon)
                    {
                        distx[i]=newdistx;
                        disty[i]=newdisty;
                        dist[i]=newdist;
                        changed = 1;
                    }
                }
                i--;
      
                /* Middle pixels have all neighbors */
                for(x=w-2; x>0; x--, i--)
                {
                    olddist = dist[i];
                    if(olddist <= 0) continue; // Already zero distance
      
                    c = i+offset_r;
                    cdistx = distx[c];
                    cdisty = disty[c];
                    newdistx = cdistx-1;
                    newdisty = cdisty;
                    newdist = this.distaa3(img, gx, gy, w, c, cdistx, cdisty, newdistx, newdisty);
                    if(newdist < olddist-epsilon)
                    {
                        distx[i]=newdistx;
                        disty[i]=newdisty;
                        dist[i]=newdist;
                        olddist=newdist;
                        changed = 1;
                    }
      
                    c = i+offset_rd;
                    cdistx = distx[c];
                    cdisty = disty[c];
                    newdistx = cdistx-1;
                    newdisty = cdisty-1;
                    newdist = this.distaa3(img, gx, gy, w, c, cdistx, cdisty, newdistx, newdisty);
                    if(newdist < olddist-epsilon)
                    {
                        distx[i]=newdistx;
                        disty[i]=newdisty;
                        dist[i]=newdist;
                        olddist=newdist;
                        changed = 1;
                    }
      
                    c = i+offset_d;
                    cdistx = distx[c];
                    cdisty = disty[c];
                    newdistx = cdistx;
                    newdisty = cdisty-1;
                    newdist = this.distaa3(img, gx, gy, w, c, cdistx, cdisty, newdistx, newdisty);
                    if(newdist < olddist-epsilon)
                    {
                        distx[i]=newdistx;
                        disty[i]=newdisty;
                        dist[i]=newdist;
                        olddist=newdist;
                        changed = 1;
                    }
      
                    c = i+offset_dl;
                    cdistx = distx[c];
                    cdisty = disty[c];
                    newdistx = cdistx+1;
                    newdisty = cdisty-1;
                    newdist = this.distaa3(img, gx, gy, w, c, cdistx, cdisty, newdistx, newdisty);
                    if(newdist < olddist-epsilon)
                    {
                        distx[i]=newdistx;
                        disty[i]=newdisty;
                        dist[i]=newdist;
                        changed = 1;
                    }
                }
                /* Leftmost pixel is special, has no left neighbors */
                olddist = dist[i];
                if(olddist > 0) // If not already zero distance
                {
                    c = i+offset_r;
                    cdistx = distx[c];
                    cdisty = disty[c];
                    newdistx = cdistx-1;
                    newdisty = cdisty;
                    newdist = this.distaa3(img, gx, gy, w, c, cdistx, cdisty, newdistx, newdisty);
                    if(newdist < olddist-epsilon)
                    {
                        distx[i]=newdistx;
                        disty[i]=newdisty;
                        dist[i]=newdist;
                        olddist=newdist;
                        changed = 1;
                    }
      
                    c = i+offset_rd;
                    cdistx = distx[c];
                    cdisty = disty[c];
                    newdistx = cdistx-1;
                    newdisty = cdisty-1;
                    newdist = this.distaa3(img, gx, gy, w, c, cdistx, cdisty, newdistx, newdisty);
                    if(newdist < olddist-epsilon)
                    {
                        distx[i]=newdistx;
                        disty[i]=newdisty;
                        dist[i]=newdist;
                        olddist=newdist;
                        changed = 1;
                    }
      
                    c = i+offset_d;
                    cdistx = distx[c];
                    cdisty = disty[c];
                    newdistx = cdistx;
                    newdisty = cdisty-1;
                    newdist = this.distaa3(img, gx, gy, w, c, cdistx, cdisty, newdistx, newdisty);
                    if(newdist < olddist-epsilon)
                    {
                        distx[i]=newdistx;
                        disty[i]=newdisty;
                        dist[i]=newdist;
                        changed = 1;
                    }
                }
      
                /* Move index to second leftmost pixel of current row. */
                /* Leftmost pixel is skipped, it has no left neighbor. */
                i = y*w + 1;
                for(x=1; x<w; x++, i++)
                {
                    /* scan right, propagate distance from left */
                    olddist = dist[i];
                    if(olddist <= 0) continue; // Already zero distance
      
                    c = i+offset_l;
                    cdistx = distx[c];
                    cdisty = disty[c];
                    newdistx = cdistx+1;
                    newdisty = cdisty;
                    newdist = this.distaa3(img, gx, gy, w, c, cdistx, cdisty, newdistx, newdisty);
                    if(newdist < olddist-epsilon)
                    {
                        distx[i]=newdistx;
                        disty[i]=newdisty;
                        dist[i]=newdist;
                        changed = 1;
                    }
                }
            }
        }
        while(changed); // Sweep until no more updates are made
      
        /* The transformation is completed. */
      
    }
}