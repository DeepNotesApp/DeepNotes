import { describe, expect, it } from "vitest";
import * as Y from "yjs";

import {
  useYMapValue,
  useYMapNumber,
  useYMapBoolean,
  useYMapString,
  useYArrayValues,
} from "./yjs-reactivity";

function createDocMap<V>(key: string): Y.Map<V> {
  const doc = new Y.Doc();
  return doc.getMap<V>(key);
}

function createDocArray<T>(key: string): Y.Array<T> {
  const doc = new Y.Doc();
  return doc.getArray<T>(key);
}

describe("yjs-reactivity", () => {
  it("useYMapValue reflects string mutations", () => {
    const ymap = createDocMap<unknown>("test");
    ymap.set("name", "alpha");

    const ref = useYMapValue<string>(ymap, "name");
    expect(ref.value).toBe("alpha");

    ymap.set("name", "beta");
    expect(ref.value).toBe("beta");
  });

  it("useYMapNumber reflects number mutations with default", () => {
    const ymap = createDocMap<unknown>("test");
    const ref = useYMapNumber(ymap, "x", 42);
    expect(ref.value).toBe(42);

    ymap.set("x", 99);
    expect(ref.value).toBe(99);

    ymap.delete("x");
    expect(ref.value).toBe(42);
  });

  it("useYMapBoolean reflects boolean mutations with default", () => {
    const ymap = createDocMap<unknown>("test");
    const ref = useYMapBoolean(ymap, "flag", true);
    expect(ref.value).toBe(true);

    ymap.set("flag", false);
    expect(ref.value).toBe(false);
  });

  it("useYMapString reflects string mutations with default", () => {
    const ymap = createDocMap<unknown>("test");
    const ref = useYMapString(ymap, "title", "untitled");
    expect(ref.value).toBe("untitled");

    ymap.set("title", "hello");
    expect(ref.value).toBe("hello");
  });

  it("useYArrayValues reflects array mutations", () => {
    const yarr = createDocArray<string>("test");
    yarr.push(["a", "b"]);

    const ref = useYArrayValues(yarr);
    expect(ref.value).toEqual(["a", "b"]);

    yarr.push(["c"]);
    expect(ref.value).toEqual(["a", "b", "c"]);

    yarr.delete(0, 1);
    expect(ref.value).toEqual(["b", "c"]);
  });

  it("useYMapValue holds nested Y.Map without breaking", () => {
    const inner = new Y.Map<number>();
    inner.set("z", 7);

    const ymap = createDocMap<unknown>("test");
    ymap.set("nested", inner);

    const ref = useYMapValue<Y.Map<number>>(ymap, "nested");
    expect(ref.value).toBeInstanceOf(Y.Map);
    expect(ref.value?.get("z")).toBe(7);

    const replacement = new Y.Map<number>();
    replacement.set("z", 12);
    ymap.set("nested", replacement);
    expect(ref.value?.get("z")).toBe(12);
  });
});
