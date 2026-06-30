import assert from "node:assert/strict";
import { beforeEach, describe, test } from "node:test";

import Undo from "../undo.js";

describe("JSON", () => {
  const data: Record<string, unknown> = {
    c: {
      x: 1,
      z: 3,
      y: "hello",
    },
    b: 34,
    a: [3, 2, 1],
  };

  test("sort", () => {
    assert.equal(
      Undo.jsonSort(data),
      `{\n "a": [\n  1,\n  2,\n  3\n ],\n "b": 34,\n "c": {\n  "x": 1,\n  "y": "hello",\n  "z": 3\n }\n}`,
    );
  });
});

describe("objKeySort edge cases", () => {
  test("handles null values", () => {
    const payload: Record<string, unknown> = {
      beta: null,
      alpha: { gamma: null },
    };
    assert.deepStrictEqual(JSON.parse(Undo.jsonSort(payload)), {
      alpha: { gamma: null },
      beta: null,
    });
  });

  test("preserves array order", () => {
    const payload: { list: number[]; nested: { values: string[] } } = {
      list: [3, 1, 2],
      nested: { values: ["c", "a", "b"] },
    };
    const snapshot = JSON.parse(JSON.stringify(payload));
    Undo.jsonSort(payload);
    assert.deepStrictEqual(payload, snapshot);
  });
});

describe("diff string", () => {
  test("empty", () => {
    assert.deepStrictEqual(Undo.diffScript("", ""), []);
  });

  test("remove", () => {
    assert.deepStrictEqual(Undo.diffScript("abc", "ac"), [{ pos: 1 }]);
  });

  test("replace", () => {
    assert.deepStrictEqual(Undo.diffScript("abc", "abd"), [
      { pos: 2 },
      { pos: 3, val: "d" },
    ]);
  });

  test("insert", () => {
    assert.deepStrictEqual(Undo.diffScript("abc", "abec"), [
      { pos: 2, val: "e" },
    ]);
  });
});

describe("diff array", () => {
  test("empty", () => {
    assert.deepStrictEqual(Undo.diffScript([], []), []);
  });

  test("remove", () => {
    assert.deepStrictEqual(Undo.diffScript(["a", "b", "c"], ["a", "c"]), [
      { pos: 1 },
    ]);
  });

  test("replace", () => {
    assert.deepStrictEqual(Undo.diffScript(["a", "b", "c"], ["a", "b", "d"]), [
      { pos: 2 },
      { pos: 3, val: "d" },
    ]);
  });

  test("insert", () => {
    assert.deepStrictEqual(
      Undo.diffScript(["a", "b", "c"], ["a", "b", "e", "c"]),
      [{ pos: 2, val: "e" }],
    );
  });
});

describe("string", () => {
  let str: string;
  let undo: Undo<string>;

  beforeEach(() => {
    str = "";
    undo = new Undo(str);
  });

  test("getters empty", () => {
    assert.equal(undo.canUndo, false);
    assert.equal(undo.canRedo, false);
    assert.equal(undo.countPast, 0);
    assert.equal(undo.countFuture, 0);
  });

  test("retain unchanged", () => {
    str = "abc";
    assert.equal(undo.retain(str), true);
    assert.equal(undo.retain(str), false); // not changed
    assert.equal(undo.canUndo, true);
    assert.equal(undo.countPast, 1);
    assert.equal(undo.canRedo, false);
    assert.equal(undo.countFuture, 0);
  });
});

describe("number[]", () => {
  let num: number[] = [4711, -2, 88, 69];
  const undo: Undo<number[]> = new Undo(num);

  test("getters empty", () => {
    assert.equal(undo.canUndo, false);
    assert.equal(undo.countPast, 0);
    assert.equal(undo.canRedo, false);
    assert.equal(undo.countFuture, 0);
  });

  test("retain unchanged", () => {
    num[2] = 3.14;
    assert.equal(undo.retain(num), true);
    assert.equal(undo.retain(num), false); // not changed
    assert.equal(undo.countPast, 1);
  });

  /*test("retain type", () => {
    assert.equal(undo.retain("hello"), false);
  });*/

  test("undo", () => {
    num[0] = 0;
    assert.equal(undo.retain(num), true);
    assert.equal(undo.countPast, 2);
    num.push(5);
    assert.equal(undo.retain(num), true);
    assert.equal(undo.countPast, 3);
    num.shift();
    assert.equal(undo.retain(num), true);
    assert.equal(undo.countPast, 4);
    assert.deepStrictEqual((num = undo.undo()), [0, -2, 3.14, 69, 5]);
    assert.deepStrictEqual((num = undo.undo()), [0, -2, 3.14, 69]);
    assert.deepStrictEqual((num = undo.undo()), [4711, -2, 3.14, 69]);
    assert.deepStrictEqual((num = undo.undo()), [4711, -2, 88, 69]);
    assert.equal(undo.canUndo, false);
    assert.deepStrictEqual((num = undo.undo()), [4711, -2, 88, 69]);
  });

  test("redo", () => {
    assert.deepStrictEqual((num = undo.redo()), [4711, -2, 3.14, 69]);
    assert.deepStrictEqual((num = undo.redo()), [0, -2, 3.14, 69]);
    assert.deepStrictEqual((num = undo.redo()), [0, -2, 3.14, 69, 5]);
    assert.equal(undo.canRedo, true);
    assert.deepStrictEqual((num = undo.redo()), [-2, 3.14, 69, 5]);
    assert.equal(undo.canRedo, false);
  });

  test("undo change", () => {
    undo.undo();
    num = undo.undo();
    assert.equal(undo.countFuture, 2);
    num[1] = 20;
    assert.equal(undo.retain(num), true);
    assert.equal(undo.canRedo, false);
    assert.equal(undo.countFuture, 0);
    assert.deepStrictEqual(num, [0, 20, 3.14, 69]);
  });
});

describe("object", () => {
  const undo: Undo<Record<string, unknown>> = new Undo(
    { one: 1, two: 2, three: "drei" },
    5,
    true,
  );

  test("sort", () => {
    assert.equal(undo.retain({ two: 2, three: 3, one: 1, four: 4 }), true);
    assert.equal(undo.retain({ three: 3, one: 1 }), true);
    assert.equal(undo.retain({ three: 3, one: 1 }), false);
  });

  test("undo", () => {
    assert.deepStrictEqual(undo.undo(), { four: 4, one: 1, three: 3, two: 2 });
  });

  test("redo", () => {
    assert.deepStrictEqual(undo.redo(), { one: 1, three: 3 });
  });
});

describe("array of objects", () => {
  const undo: Undo<Array<Record<string, unknown>>> = new Undo([], 10);

  test("retain", () => {
    assert.equal(
      undo.retain([
        { id: "1", value: "" },
        { id: 2, value: "abc" },
      ]),
      true,
    );
    assert.equal(
      undo.retain([
        { id: "1", value: "xyz" },
        { id: 2, value: "abc" },
      ]),
      true,
    );
    assert.deepStrictEqual(undo.undo(), [
      { id: "1", value: "" },
      { id: 2, value: "abc" },
    ]);
  });
});

describe("max", () => {
  const max: number = 2;
  const undo: Undo<string> = new Undo("abc", max);

  test("overflow", () => {
    assert.equal(undo.retain("bcd"), true);
    assert.equal(undo.retain("bcde"), true);
    assert.equal(undo.retain("bdef"), true);
    assert.equal(undo.countPast, max);
    assert.deepStrictEqual(undo.undo(), "bcde");
    assert.deepStrictEqual(undo.undo(), "bcd");
    assert.equal(undo.canUndo, false);
  });
});

describe("replacer", () => {
  const valid: string[] = ["b", "c"];
  const undo: Undo<Record<string, unknown>> = new Undo(
    { a: 1, b: 2, c: 3, d: 4 },
    10,
    true,
    valid,
  );

  test("retain", () => {
    assert.equal(undo.retain({ d: 4, b: 2, c: -3, a: -1, e: 0 }, valid), true);
  });
  test("undo", () => {
    assert.deepStrictEqual(undo.undo(), { b: 2, c: 3 });
  });
  test("redo", () => {
    assert.deepStrictEqual(undo.redo(), { b: 2, c: -3 });
  });
});

describe("documentation contract", () => {
  test("README quickstart works", () => {
    const buffer: Undo<string> = new Undo("");
    buffer.retain("def");
    buffer.retain("ghi");
    assert.equal(buffer.undo(), "def");
    assert.equal(buffer.redo(), "ghi");
  });

  test("applyEdit remains available as a static helper", () => {
    const script = Undo.diffScript("abc", "adc");
    assert.equal(Undo.applyEdit(script, "abc"), "adc");
  });
});
