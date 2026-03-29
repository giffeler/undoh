type tDiffable = string | unknown[];
type tReviver = NonNullable<Parameters<typeof JSON.parse>[1]>;
type tReplacer = Parameters<typeof JSON.stringify>[1];
type tModulo = (left: number, right: number) => number;
interface iScript {
    readonly pos: number;
    readonly val?: unknown;
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
    #private;
    static readonly modulo: tModulo;
    constructor(data: T, max?: number, objKeySort?: boolean, replacer?: tReplacer);
    get countPast(): number;
    get countFuture(): number;
    get canUndo(): boolean;
    get canRedo(): boolean;
    retain(data: T, replacer?: tReplacer): boolean;
    undo(reviver?: tReviver): T;
    redo(reviver?: tReviver): T;
    static diffScript(older: tDiffable, newer: tDiffable): iScript[];
    static applyEdit(script: iScript[], older: tDiffable): tDiffable;
    static jsonSort(data: unknown, replacer?: tReplacer, spacer?: number | string): string;
    static range(start: number, end?: number | null, step?: number): number[];
}
export {};
