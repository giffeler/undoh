import Undo from "../undo";

describe("JSON", () => {
  const data: Object = {
    c: {
      x: 1,
      z: 3,
      y: "hello",
    },
    b: 34,
    a: [3, 2, 1],
  };

  test("sort", () => {
    expect(Undo.jsonSort(JSON.stringify(data))).toBe(
      `{\n"a":[\n1,\n2,\n3\n],\n"b":34,\n"c":{\n"x":1,\n"y":"hello",\n"z":3\n}\n}`,
    );
  });
});

describe("diff string", () => {
  test("empty", () => {
    expect(Undo.diffScript("", "")).toStrictEqual([]);
  });

  test("remove", () => {
    expect(Undo.diffScript("abc", "ac")).toStrictEqual([{ pos: 1 }]);
  });

  test("replace", () => {
    expect(Undo.diffScript("abc", "abd")).toStrictEqual([{ pos: 2 }, { pos: 3, val: "d" }]);
  });

  test("insert", () => {
    expect(Undo.diffScript("abc", "abec")).toStrictEqual([{ pos: 2, val: "e" }]);
  });
});

describe("diff array", () => {
  test("empty", () => {
    expect(Undo.diffScript([], [])).toStrictEqual([]);
  });

  test("remove", () => {
    expect(Undo.diffScript(["a", "b", "c"], ["a", "c"])).toStrictEqual([{ pos: 1 }]);
  });

  test("replace", () => {
    expect(Undo.diffScript(["a", "b", "c"], ["a", "b", "d"])).toStrictEqual([{ pos: 2 }, { pos: 3, val: "d" }]);
  });

  test("insert", () => {
    expect(Undo.diffScript(["a", "b", "c"], ["a", "b", "e", "c"])).toStrictEqual([{ pos: 2, val: "e" }]);
  });
});

describe("string", () => {
  let str: string;
  let undo: Undo;

  beforeEach(() => {
    str = "";
    undo = new Undo(str);
  });

  test("getters empty", () => {
    expect(undo.canUndo).toBeFalsy();
    expect(undo.canRedo).toBeFalsy();
    expect(undo.countPast).toBe(0);
    expect(undo.countFuture).toBe(0);
  });

  test("retain unchanged", () => {
    str = "abc";
    expect(undo.retain(str)).toBeTruthy();
    expect(undo.retain(str)).toBeFalsy(); // not changed
    expect(undo.canUndo).toBeTruthy();
    expect(undo.countPast).toBe(1);
    expect(undo.canRedo).toBeFalsy();
    expect(undo.countFuture).toBe(0);
  });
});

describe("number[]", () => {
  let num: number[] = [4711, -2, 88, 69];
  let undo: Undo = new Undo(num);

  test("getters empty", () => {
    expect(undo.canUndo).toBeFalsy();
    expect(undo.countPast).toBe(0);
    expect(undo.canRedo).toBeFalsy();
    expect(undo.countFuture).toBe(0);
  });

  test("retain unchanged", () => {
    num[2] = 3.14;
    expect(undo.retain(num)).toBeTruthy();
    expect(undo.retain(num)).toBeFalsy(); // not changed
    expect(undo.countPast).toBe(1);
  });

  test("retain type", () => {
    expect(undo.retain("hello")).toBeFalsy();
  });

  test("undo", () => {
    num[0] = 0;
    expect(undo.retain(num)).toBeTruthy();
    expect(undo.countPast).toBe(2);
    num.push(5);
    expect(undo.retain(num)).toBeTruthy();
    expect(undo.countPast).toBe(3);
    num.shift();
    expect(undo.retain(num)).toBeTruthy();
    expect(undo.countPast).toBe(4);
    expect((num = undo.undo())).toStrictEqual([0, -2, 3.14, 69, 5]);
    expect((num = undo.undo())).toStrictEqual([0, -2, 3.14, 69]);
    expect((num = undo.undo())).toStrictEqual([4711, -2, 3.14, 69]);
    expect((num = undo.undo())).toStrictEqual([4711, -2, 88, 69]);
    expect(undo.canUndo).toBeFalsy();
    expect((num = undo.undo())).toStrictEqual([4711, -2, 88, 69]);
  });

  test("redo", () => {
    expect((num = undo.redo())).toStrictEqual([4711, -2, 3.14, 69]);
    expect((num = undo.redo())).toStrictEqual([0, -2, 3.14, 69]);
    expect((num = undo.redo())).toStrictEqual([0, -2, 3.14, 69, 5]);
    expect(undo.canRedo).toBeTruthy();
    expect((num = undo.redo())).toStrictEqual([-2, 3.14, 69, 5]);
    expect(undo.canRedo).toBeFalsy();
  });

  test("undo change", () => {
    undo.undo();
    num = undo.undo();
    expect(undo.countFuture).toBe(2);
    num[1] = 20;
    expect(undo.retain(num)).toBeTruthy();
    expect(undo.canRedo).toBeFalsy;
    expect(num).toStrictEqual([0, 20, 3.14, 69]);
  });
});

describe("object", () => {
  let undo: Undo = new Undo({ one: 1, two: 2, three: "drei" }, 5, true);

  test("sort", () => {
    expect(undo.retain({ two: 2, three: 3, one: 1, four: 4 })).toBeTruthy();
    expect(undo.retain({ three: 3, one: 1 })).toBeTruthy();
    expect(undo.retain({ three: 3, one: 1 })).toBeFalsy();
  });

  test("undo", () => {
    expect(undo.undo()).toStrictEqual({ four: 4, one: 1, three: 3, two: 2 });
  });

  test("redo", () => {
    expect(undo.redo()).toStrictEqual({ one: 1, three: 3 });
  });
});

describe ("array of objects", () => {
  let undo: Undo = new Undo([], 10);

  test("retain", () => {
    expect(undo.retain([{id: "1", value: ""}, {id: 2, value: "abc"}])).toBeTruthy();
    expect(undo.retain([{id: "1", value: "xyz"}, {id: 2, value: "abc"}])).toBeTruthy();
    expect(undo.undo()).toStrictEqual([{id: "1", value: ""}, {id: 2, value: "abc"}]);
  });
});

describe("max", () => {
  const max: number = 2;
  let undo: Undo = new Undo("abc", max);

  test("overflow", () => {
    expect(undo.retain("bcd")).toBeTruthy();
    expect(undo.retain("bcde")).toBeTruthy();
    expect(undo.retain("bdef")).toBeTruthy();
    expect(undo.countPast).toBe(max);
    expect(undo.undo()).toStrictEqual("bcde");
    expect(undo.undo()).toStrictEqual("bcd");
    expect(undo.canUndo).toBeFalsy();
  });
});
