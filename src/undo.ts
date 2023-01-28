/*
 * undoh.ts - Undo functionality for data-structures
 * Copyright © 2023, Denis Giffeler
 * Python diff algorithm: <https://blog.robertelder.org/diff-algorithm/>.
 *
 * This program is free software: you can redistribute it and/or modify it
 * under the terms of the GNU General Public License as published by the Free
 * Software Foundation, either version 3 of the License, or (at your option)
 * any later version.
 *
 * This program is distributed in the hope that it will be useful, but WITHOUT
 * ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or
 * FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License for
 * more details.
 *
 * You should have received a copy of the GNU General Public License along with
 * this program. If not, see <https://www.gnu.org/licenses/>.
 */

type tString = Capitalize<string>;
type tIndexable = string | any[];
type tReviver = (key: string, value: any) => any;
type tReplacer = any;

interface iScript {
  readonly pos: number;
  readonly val?: string[] | string;
}

interface iUndo<T> {
  get countPast(): number;
  get countFuture(): number;
  get canUndo(): boolean;
  get canRedo(): boolean;
  retain(data: T, replacer?: tReplacer): boolean;
  undo(reviver?: tReviver): T;
  redo(reviver?: tReviver): T;
}

export default class Undo<T> implements iUndo<T> {
  readonly #type: tString;
  readonly #max: number;
  readonly #keysort: boolean;
  #present: string[] | string;
  #past: iScript[][];
  #future: iScript[][];

  static readonly modulo: Function = new WebAssembly.Instance(
    /*
    (module
      (func $modulo (param $n i32) (param $d i32) (result i32)
        (i32.rem_s (local.get $n) (local.get $d))
        (i32.add (local.get $d))
        (i32.rem_s (local.get $d))
      )
      (export "modulo" (func 0))
    )
    */
    new WebAssembly.Module(
      new Uint8Array([
        0, 97, 115, 109, 1, 0, 0, 0, 1, 7, 1, 96, 2, 127, 127, 1, 127, 3, 2, 1,
        0, 7, 10, 1, 6, 109, 111, 100, 117, 108, 111, 0, 0, 10, 15, 1, 13, 0,
        32, 0, 32, 1, 111, 32, 1, 106, 32, 1, 111, 11,
      ])
    )
  ).exports["modulo"] as Function;

  constructor(
    data: T,
    max: number = 100,
    objKeySort: boolean = false,
    replacer: any = null
  ) {
    this.#type = Undo.#getType(data);
    this.#max = max;
    this.#keysort = objKeySort && this.#type === "O";
    this.#present = this.#prepare(data, replacer);
    this.#past = [];
    this.#future = [];
  }

  get countPast(): number {
    return this.#past.length;
  }

  get countFuture(): number {
    return this.#future.length;
  }

  get canUndo(): boolean {
    return this.#past.length > 0;
  }

  get canRedo(): boolean {
    return this.#future.length > 0;
  }

  public retain(data: T, replacer?: tReplacer): boolean {
    if (this.#type === Undo.#getType(data)) {
      const md: string[] | string = this.#prepare(data, replacer);
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

  public undo(reviver?: tReviver): T {
    if (this.#past.length > 0) {
      const e: tIndexable = this.applyEdit(this.#past.pop()!, this.#present);
      this.#future.unshift(Undo.diffScript(e, this.#present));
      this.#present = e;
    }
    return this.#recover(this.#present, reviver);
  }

  public redo(reviver?: tReviver): T {
    if (this.#future.length > 0) {
      const e: tIndexable = this.applyEdit(
        this.#future.shift()!,
        this.#present
      );
      this.#past.push(Undo.diffScript(e, this.#present));
      this.#present = e;
    }
    return this.#recover(this.#present, reviver);
  }

  static diffScript(older: tIndexable, newer: tIndexable): iScript[] {
    let result: iScript[] = [];

    worker(older, newer);
    return result;

    function worker(
      e: tIndexable,
      f: tIndexable,
      i: number = 0,
      j: number = 0
    ): void {
      const [N, M, L, Z]: [number, number, number, number] = [
        e.length,
        f.length,
        e.length + f.length,
        2 * Math.min(e.length, f.length) + 2,
      ];

      if (N > 0 && M > 0) {
        let [w, g, p]: [number, number[], number[]] = [
          N - M,
          Array(Z).fill(0),
          Array(Z).fill(0),
        ];
        for (const h of Undo.range(Math.floor(L / 2) + (L % 2 ^ 1) + 1)) {
          for (const r of [0, 1]) {
            let [c, d, o, m]: [number[], number[], number, number] =
              r === 0 ? [g, p, 1, 1] : [p, g, 0, -1];
            for (const k of Undo.range(
              -(h - 2 * Math.max(0, h - M)),
              h - 2 * Math.max(0, h - N) + 1,
              2
            )) {
              let a: number =
                  k === -h ||
                  (k !== h &&
                    c[Undo.modulo(k - 1, Z)]! < c[Undo.modulo(k + 1, Z)]!)
                    ? c[Undo.modulo(k + 1, Z)]!
                    : c[Undo.modulo(k - 1, Z)]! + 1,
                b: number = a - k;
              const [s, t]: [number, number] = [a, b];
              while (
                a < N &&
                b < M &&
                e[(1 - o) * N + m * a + (o - 1)] ===
                  f[(1 - o) * M + m * b + (o - 1)]
              ) {
                [a, b] = [a + 1, b + 1];
              }
              const z: number = -(k - w);
              c[Undo.modulo(k, Z)] = a;
              if (
                L % 2 === o &&
                z >= -(h - o) &&
                z <= h - o &&
                c[Undo.modulo(k, Z)]! + d[Undo.modulo(z, Z)]! >= N
              ) {
                const [D, x, y, u, v]: [
                  number,
                  number,
                  number,
                  number,
                  number
                ] =
                  o === 1
                    ? [2 * h - 1, s, t, a, b]
                    : [2 * h, N - a, M - b, N - s, M - t];
                if (D > 1 || (x !== u && y !== v)) {
                  worker(e.slice(0, x), f.slice(0, y), i, j);
                  worker(e.slice(u, N), f.slice(v, M), i + u, j + v);
                } else if (M > N) {
                  worker("", f.slice(N, M), i + N, j + N);
                } else if (M < N) {
                  worker(e.slice(M, N), "", i + M, j + M);
                }
                return;
              }
            }
          }
        }
      } else if (N > 0) {
        for (const n of Undo.range(0, N)) {
          result.push({ pos: i + n });
        }
      } else {
        for (const n of Undo.range(0, M)) {
          result.push({ pos: i, val: newer[j + n] });
        }
      }
    }
  }

  public applyEdit(script: iScript[], older: tIndexable): tIndexable {
    let i: number = 0,
      res: tIndexable = [];

    for (const e of script) {
      while (e.pos > i) {
        res.push(older[i++]);
      }
      if (e.pos === i) {
        if ("val" in e) {
          res.push(e.val);
        } else {
          i++;
        }
      }
    }
    while (i < older.length) {
      res.push(older[i++]);
    }
    return typeof older === "string" ? res.join("") : res;
  }

  static jsonSort(
    data: any,
    replacer?: tReplacer,
    spacer: number | string = 1
  ): string {
    if (typeof data === "object") {
      const type: tString = this.#getType(data),
        ao: string = this.#traverseMap(this.#traverseObject(data), type);
      return JSON.stringify(
        JSON.parse(type === "A" ? `[${ao}]` : `{${ao}}`),
        replacer,
        spacer
      )!;
    } else {
      return data;
    }
  }

  static #traverseObject(object: Object): Map<any, any> {
    let map: Map<any, any> = new Map();

    for (const [key, value] of Object.entries(object).sort()) {
      const type: tString = this.#getType(value);
      map.set(
        key + type,
        typeof value === "object"
          ? this.#traverseObject(type === "A" ? value.sort() : value)
          : value
      );
    }
    return map;
  }

  static #traverseMap(map: Map<any, any>, type: tString): string {
    let i: number = 0,
      json: string = "";

    for (const [key, value] of map.entries()) {
      const k: string = key.slice(0, -1),
        t: tString = key.slice(-1);
      type !== "A" && (json += `"${k}":`);
      if (typeof value === "object") {
        json +=
          t === "A"
            ? `[${this.#traverseMap(value, t)}]`
            : `{${this.#traverseMap(value, t)}}`;
      } else {
        json +=
          typeof value === "string"
            ? `"${value.replace(/["\n\r\t\b\f\\]/g, "\\$&")}"`
            : value;
      }
      ++i < map.size && (json += ",");
    }
    return json;
  }

  #prepare(data: T, replacer?: tReplacer): string[] | string {
    return typeof data === "string"
      ? structuredClone(data)
      : (this.#keysort
          ? Undo.jsonSort(data, replacer, 1)
          : JSON.stringify(data, replacer, 1)
        ).split(/^\s*/m);
  }

  #recover(data: string[] | string, reviver?: tReviver): T {
    return typeof data === "string"
      ? structuredClone(data)
      : JSON.parse(data.join(""), reviver);
  }

  #hasChanged(data: string[] | string): boolean {
    return (
      this.#past.length === 0 ||
      this.#present.length !== data.length ||
      (typeof data === "string"
        ? this.#present !== data
        : data.length === 0 ||
          data.some((v: string, i: number) => v !== this.#present[i]))
    );
  }

  static range(
    start: number,
    end: number | null = null,
    step: number = 1
  ): number[] {
    [start, end] = end === null ? [0, start - 1] : [start, end - 1];
    return Array.from(
      { length: Math.floor((end - start) / step) + 1 },
      (_: never, i: number) => start + i * step
    );
  }

  static #getType(data: any): tString {
    return Object.prototype.toString.call(data)[8] as tString;
  }
}
