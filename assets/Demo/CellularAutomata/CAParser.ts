// Copyright 2021 Cao Gaoting<caogtaa@gmail.com>
// https://caogtaa.github.io
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

/*
 * Date: 2021-05-03 01:10:28
 * LastEditors: GT<caogtaa@gmail.com>
 * LastEditTime: 2021-05-03 01:12:12
*/

type TokenInfo = {
    count: number,
    type: string,
};

export class CAParser {
    // https://funnyjs.com/jspages/game-of-life.html
    /**
     * 创建指定大小的RenderTexture，并将data居中恢复到RenderTexture中
     * @param data 
     * @param targetWidth 
     * @param targetHeight 
     */
    public static Parse(data: string, targetWidth: number, targetHeight: number, out?: cc.RenderTexture): cc.RenderTexture {
        let num: number = 0;
        let tokens: TokenInfo[] = [];
        for (let c of data) {
            if (c === '!')
                break;

            else if ('0' <= c && c <= '9') {
                num *= 10;
                num += parseInt(c);
            } else {
                // blank
                tokens.push({
                    count: Math.max(1, num),
                    type: c
                });
                num = 0;
            }
        }

        // count ca height & width
        let w: number = 0;      // ca width
        let h: number = 0;      // ca height
        num = 0;
        for (let t of tokens) {
            if (t.type === '$') {
                h += t.count;
                w = Math.max(w, num);
                num = 0;
            } else {
                num += t.count;
            }
        }

        let imgData = new Uint8Array(targetHeight * targetWidth * 4);

        // fill ca into renderTexture
        let sx = Math.floor((targetWidth - w) / 2);
        let sy = Math.floor((targetHeight - h) / 2);
        let x: number = sx;
        let y: number = sy;
        for (let t of tokens) {
            if (t.type === '$') {
                y += t.count;
                x = sx;
            } else if (t.type === 'b') {
                // blank
                x += t.count;
            } else if (t.type === 'o') {
                let ex = Math.min(x + t.count, targetWidth);
                while (x < ex) {
                    if (0 <= y && y < targetHeight && 0 <= x && x < targetWidth) {
                        let p = ((targetHeight-1-y) * targetWidth + x) * 4;
                        imgData[p] = 255;
                        imgData[p+1] = 255;
                        imgData[p+2] = 255;
                        imgData[p+3] = 255;
                    }
                    ++ x;
                }
            }
        }

        // create texture to store ca
        // let gl = cc.game._renderContext;
        let texture = out || new cc.RenderTexture();
        texture.initWithData(imgData, cc.Texture2D.PixelFormat.RGBA8888, targetWidth, targetHeight);
        texture.packable = false;

        //@ts-ignore
        texture.setWrapMode(cc.Texture2D.WrapMode.REPEAT, cc.Texture2D.WrapMode.REPEAT);
        texture.setFilters(cc.Texture2D.Filter.NEAREST, cc.Texture2D.Filter.NEAREST);

        return texture;
    }
}
