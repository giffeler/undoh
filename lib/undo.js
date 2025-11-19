export default class Undo {
    #type;
    #max;
    #keysort;
    #present;
    #past;
    #future;
    static modulo = new WebAssembly.Instance(new WebAssembly.Module(new Uint8Array([
        0, 97, 115, 109, 1, 0, 0, 0, 1, 7, 1, 96, 2, 127, 127, 1, 127, 3, 2, 1,
        0, 7, 10, 1, 6, 109, 111, 100, 117, 108, 111, 0, 0, 10, 15, 1, 13, 0,
        32, 0, 32, 1, 111, 32, 1, 106, 32, 1, 111, 11,
    ]))).exports["modulo"];
    constructor(data, max = 100, objKeySort = false, replacer = null) {
        this.#type = Undo.#getType(data);
        this.#max = max;
        this.#keysort = objKeySort && this.#type === "O";
        this.#present = this.#prepare(data, replacer);
        this.#past = [];
        this.#future = [];
    }
    get countPast() {
        return this.#past.length;
    }
    get countFuture() {
        return this.#future.length;
    }
    get canUndo() {
        return this.#past.length > 0;
    }
    get canRedo() {
        return this.#future.length > 0;
    }
    retain(data, replacer) {
        if (this.#type === Undo.#getType(data)) {
            const md = this.#prepare(data, replacer);
            if (this.#hasChanged(md)) {
                this.#past.length === this.#max && this.#past.shift();
                this.#past.push(Undo.diffScript(md, this.#present));
                this.#present = md;
                this.#future = [];
                return true;
            }
        }
        return false;
    }
    undo(reviver) {
        if (this.#past.length > 0) {
            const e = Undo.applyEdit(this.#past.pop(), this.#present);
            this.#future.unshift(Undo.diffScript(e, this.#present));
            this.#present = e;
        }
        return this.#recover(this.#present, reviver);
    }
    redo(reviver) {
        if (this.#future.length > 0) {
            const e = Undo.applyEdit(this.#future.shift(), this.#present);
            this.#past.push(Undo.diffScript(e, this.#present));
            this.#present = e;
        }
        return this.#recover(this.#present, reviver);
    }
    static diffScript(older, newer) {
        let result = [];
        worker(older, newer);
        return result;
        function worker(e, f, i = 0, j = 0) {
            const [N, M, L, Z] = [
                e.length,
                f.length,
                e.length + f.length,
                2 * Math.min(e.length, f.length) + 2,
            ];
            if (N > 0 && M > 0) {
                let [w, g, p] = [
                    N - M,
                    Array(Z).fill(0),
                    Array(Z).fill(0),
                ];
                for (const h of Undo.range(Math.floor(L / 2) + (L % 2 ^ 1) + 1)) {
                    for (const r of [0, 1]) {
                        let [c, d, o, m] = r === 0 ? [g, p, 1, 1] : [p, g, 0, -1];
                        for (const k of Undo.range(-(h - 2 * Math.max(0, h - M)), h - 2 * Math.max(0, h - N) + 1, 2)) {
                            let a = k === -h ||
                                (k !== h &&
                                    c[Undo.modulo(k - 1, Z)] < c[Undo.modulo(k + 1, Z)])
                                ? c[Undo.modulo(k + 1, Z)]
                                : c[Undo.modulo(k - 1, Z)] + 1, b = a - k;
                            const [s, t] = [a, b];
                            while (a < N &&
                                b < M &&
                                e[(1 - o) * N + m * a + (o - 1)] ===
                                    f[(1 - o) * M + m * b + (o - 1)]) {
                                [a, b] = [a + 1, b + 1];
                            }
                            const z = -(k - w);
                            c[Undo.modulo(k, Z)] = a;
                            if (L % 2 === o &&
                                z >= -(h - o) &&
                                z <= h - o &&
                                c[Undo.modulo(k, Z)] + d[Undo.modulo(z, Z)] >= N) {
                                const [D, x, y, u, v] = o === 1
                                    ? [2 * h - 1, s, t, a, b]
                                    : [2 * h, N - a, M - b, N - s, M - t];
                                if (D > 1 || (x !== u && y !== v)) {
                                    worker(e.slice(0, x), f.slice(0, y), i, j);
                                    worker(e.slice(u, N), f.slice(v, M), i + u, j + v);
                                }
                                else if (M > N) {
                                    worker("", f.slice(N, M), i + N, j + N);
                                }
                                else if (M < N) {
                                    worker(e.slice(M, N), "", i + M, j + M);
                                }
                                return;
                            }
                        }
                    }
                }
            }
            else if (N > 0) {
                for (const n of Undo.range(0, N)) {
                    result.push({ pos: i + n });
                }
            }
            else {
                for (const n of Undo.range(0, M)) {
                    result.push({ pos: i, val: newer[j + n] });
                }
            }
        }
    }
    static applyEdit(script, older) {
        let i = 0, res = [];
        for (const e of script) {
            while (e.pos > i) {
                res.push(older[i++]);
            }
            if (e.pos === i) {
                if ("val" in e) {
                    res.push(e.val);
                }
                else {
                    i++;
                }
            }
        }
        while (i < older.length) {
            res.push(older[i++]);
        }
        return typeof older === "string" ? res.join("") : res;
    }
    static jsonSort(data, replacer, spacer = 1) {
        if (data === null || typeof data !== "object") {
            return JSON.stringify(data, replacer, spacer) ?? "";
        }
        const type = this.#getType(data), ao = this.#traverseMap(this.#traverseObject(data), type);
        return JSON.stringify(JSON.parse(type === "A" ? `[${ao}]` : `{${ao}}`), replacer, spacer);
    }
    static #traverseObject(object) {
        let map = new Map();
        for (const [key, value] of Object.entries(object).sort()) {
            const type = this.#getType(value);
            const isTraversable = value !== null && typeof value === "object";
            map.set(key + type, isTraversable
                ? this.#traverseObject(type === "A" ? [...value].sort() : value)
                : value);
        }
        return map;
    }
    static #traverseMap(map, type) {
        let i = 0, json = "";
        for (const [key, value] of map.entries()) {
            const k = key.slice(0, -1), t = key.slice(-1);
            type !== "A" && (json += `"${k}":`);
            if (value !== null && typeof value === "object") {
                json +=
                    t === "A"
                        ? `[${this.#traverseMap(value, t)}]`
                        : `{${this.#traverseMap(value, t)}}`;
            }
            else {
                json +=
                    typeof value === "string"
                        ? `"${value.replace(/["\n\r\t\b\f\\]/g, "\\$&")}"`
                        : value;
            }
            ++i < map.size && (json += ",");
        }
        return json;
    }
    #prepare(data, replacer) {
        return typeof data === "string"
            ? structuredClone(data)
            : (this.#keysort
                ? Undo.jsonSort(data, replacer, 1)
                : JSON.stringify(data, replacer, 1)).split(/^\s*/m);
    }
    #recover(data, reviver) {
        return typeof data === "string"
            ? structuredClone(data)
            : JSON.parse(data.join(""), reviver);
    }
    #hasChanged(data) {
        return (this.#past.length === 0 ||
            this.#present.length !== data.length ||
            (typeof data === "string"
                ? this.#present !== data
                : data.length === 0 ||
                    data.some((v, i) => v !== this.#present[i])));
    }
    static range(start, end = null, step = 1) {
        [start, end] = end === null ? [0, start - 1] : [start, end - 1];
        return Array.from({ length: Math.floor((end - start) / step) + 1 }, (_, i) => start + i * step);
    }
    static #getType(data) {
        return Object.prototype.toString.call(data)[8];
    }
}
//# sourceMappingURL=undo.js.map