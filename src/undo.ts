/*
 * undoh.ts - Undo functionality for data-structures
 * Copyright © 2022, Denis Giffeler
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

type tIndexable = string | any[];
type tString = Capitalize<string>;
type tReviver = (key?: string, value?: any) => any;
type tReplacer = any;

interface iScript {
  pos: number;
  val?: any;
}

interface iUndo {
  get countPast(): number;
  get countFuture(): number;
  get canUndo(): boolean;
  get canRedo(): boolean;
  retain(data: any, replacer?: tReplacer): boolean;
  undo(reviver?: tReviver): any;
  redo(reviver?: tReviver): any;
}

export default class Undo implements iUndo {
  readonly #type: tString;
  readonly #max: number;
  readonly #keysort: boolean;
  #present: tIndexable;
  #past: iScript[][];
  #future: iScript[][];

  constructor(
    data: any,
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

  #prepare(data: any, replacer?: tReplacer): tIndexable {
    return typeof data === "string"
      ? structuredClone(data)
      : (this.#keysort
          ? Undo.jsonSort(data, replacer, 1)
          : JSON.stringify(data, replacer, 1)
        ).split(/\s*$\s*/m);
  }

  #recover(data: tIndexable, reviver?: tReviver): any {
    return typeof data === "string"
      ? structuredClone(data)
      : JSON.parse(data.join(""), reviver);
  }

  #hasChanged(data: tIndexable): boolean {
    return (
      this.#past.length === 0 ||
      this.#present.length !== data.length ||
      (typeof data === "string"
        ? this.#present !== data
        : data.length === 0 ||
          data.some((v: any, i: number) => v !== this.#present[i]))
    );
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

  retain(data: any, replacer?: tReplacer): boolean {
    if (this.#type === Undo.#getType(data)) {
      const md: tIndexable = this.#prepare(data, replacer);
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

  undo(reviver?: tReviver): any {
    if (this.#past.length > 0) {
      const e: tIndexable = Undo.applyEdit(this.#past.pop()!, this.#present);
      this.#future.unshift(Undo.diffScript(e, this.#present));
      this.#present = e;
    }
    return this.#recover(this.#present, reviver);
  }

  redo(reviver?: tReviver): any {
    if (this.#future.length > 0) {
      const e: tIndexable = Undo.applyEdit(
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
                    c[Undo.#modulo(k - 1, Z)]! < c[Undo.#modulo(k + 1, Z)]!)
                    ? c[Undo.#modulo(k + 1, Z)]!
                    : c[Undo.#modulo(k - 1, Z)]! + 1,
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
              c[Undo.#modulo(k, Z)] = a;
              if (
                L % 2 === o &&
                z >= -(h - o) &&
                z <= h - o &&
                c[Undo.#modulo(k, Z)]! + d[Undo.#modulo(z, Z)]! >= N
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

  static applyEdit(script: iScript[], older: tIndexable): tIndexable {
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
      const type: tString = Undo.#getType(data),
        ao: string = traverseMap(traverseObject(data), type);
      return JSON.stringify(
        JSON.parse(type === "A" ? `[${ao}]` : `{${ao}}`),
        replacer,
        spacer
      );
    } else {
      return data;
    }

    function traverseObject(object: Object): Map<any, any> {
      let map: Map<any, any> = new Map();

      for (const [key, value] of Object.entries(object).sort()) {
        const type: tString = Undo.#getType(value);
        map.set(
          key + type,
          typeof value === "object"
            ? traverseObject(type === "A" ? value.sort() : value)
            : value
        );
      }
      return map;
    }

    function traverseMap(map: Map<any, any>, type: tString): string {
      let i: number = 0,
        json: string = "";

      for (const [key, value] of map.entries()) {
        const k: string = key.slice(0, -1),
          t: tString = key.slice(-1);
        type !== "A" && (json += `"${k}":`);
        if (typeof value === "object") {
          json +=
            t === "A"
              ? `[${traverseMap(value, t)}]`
              : `{${traverseMap(value, t)}}`;
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
  }

  static #getType(data: any): tString {
    return Object.prototype.toString.call(data)[8] as tString;
  }

  static #modulo(n: number, d: number): number {
    return ((n % d) + d) % d;
  }

  static range(
    start: number,
    end: number | null = null,
    step: number = 1
  ): number[] {
    return end === null
      ? [...Array(start).keys()].filter((n: number): boolean => n % step === 0)
      : [...Array(Math.abs(end - start)).keys()]
          .filter((n: number): boolean => n % step === 0)
          .map((n: number): number => start + (end < start ? -n : n));
  }
}
