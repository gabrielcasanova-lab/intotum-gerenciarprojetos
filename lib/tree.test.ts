import { describe, expect, it } from "vitest";
import { copyTree } from "./tree";

describe("copyTree", () => {
  it("troca os ids e liga o filho ao pai novo", () => {
    let n = 0;
    const { parents, children } = copyTree(
      [
        { id: "a", parentId: null },
        { id: "b", parentId: "a" },
        { id: "c", parentId: null },
        { id: "d", parentId: "zz" },
      ],
      () => `novo${++n}`,
    );
    expect(parents.map((r) => [r.item.id, r.id, r.parentId])).toEqual([
      ["a", "novo1", null],
      ["c", "novo3", null],
      ["d", "novo4", null],
    ]);
    expect(children.map((r) => [r.item.id, r.id, r.parentId])).toEqual([
      ["b", "novo2", "novo1"],
    ]);
  });
});
