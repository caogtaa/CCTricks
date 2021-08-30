/*
 * Author: GT<caogtaa@gmail.com>
 * Date: 2021-04-03 13:04:29
 * LastEditors: GT<caogtaa@gmail.com>
 * LastEditTime: 2021-04-03 17:32:26
*/

export interface Resetable {
    Reset(): void;
}

export class CacheArray<T extends Resetable> implements Resetable {
    protected _len: number = 0;
    public get length(): number {
        return this._len;
    }

    protected _data: T[] = [];
    public Get(index: number): T {      // 这里不对越界情况进行处理
        return this._data[index];
    }

    public Increase(type: { new(): T }): T {
        let data = this._data;
        if (data.length > this._len) {
            // 还存在预分配元素，直接返回
            let result = data[this._len];
            ++ this._len;
            result.Reset();
            return result;
        }

        data.length += 1;
        let result = data[this._len++] = new type();
        return result;
    }

    public Resize(n: number, type: { new(): T }) {
        if (this._len === n)
            return;

        let data = this._data;
        if (data.length < n) {
            // 扩容了
            data.length = n;
        }

        for (let i = this._len; i < n; ++i) {
            if (data[i] === undefined) {
                data[i] = new type();
            } else {
                data[i].Reset();
            }
        }

        this._len = n;
    }

    public Reset() {
        this._len = 0;
    }
}
