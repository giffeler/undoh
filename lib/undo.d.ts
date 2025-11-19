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
    #private;
    static readonly modulo: Function;
    constructor(data: T, max?: number, objKeySort?: boolean, replacer?: any);
    get countPast(): number;
    get countFuture(): number;
    get canUndo(): boolean;
    get canRedo(): boolean;
    retain(data: T, replacer?: tReplacer): boolean;
    undo(reviver?: tReviver): T;
    redo(reviver?: tReviver): T;
    static diffScript(older: tIndexable, newer: tIndexable): iScript[];
    static applyEdit(script: iScript[], older: tIndexable): tIndexable;
    static jsonSort(data: any, replacer?: tReplacer, spacer?: number | string): string;
    static range(start: number, end?: number | null, step?: number): number[];
}
export {};
