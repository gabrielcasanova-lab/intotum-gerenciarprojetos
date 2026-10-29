import { describe, expect, it } from "vitest";
import { moveInOrder } from "./order";

describe("moveInOrder", () => {
  it("sobe e desce um item", () => {
    expect(moveInOrder(["a", "b", "c"], "b", -1)).toEqual(["b", "a", "c"]);
    expect(moveInOrder(["a", "b", "c"], "b", 1)).toEqual(["a", "c", "b"]);
  });
  it("não mexe no primeiro subindo nem no último descendo", () => {
    expect(moveInOrder(["a", "b"], "a", -1)).toBeNull();
    expect(moveInOrder(["a", "b"], "b", 1)).toBeNull();
    expect(moveInOrder(["a", "b"], "x", 1)).toBeNull();
  });
});
