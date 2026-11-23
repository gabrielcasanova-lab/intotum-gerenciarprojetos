import { describe, expect, it } from "vitest";
import { catalogName } from "./catalog-names";

describe("catalogName", () => {
  it("cliente em espanhol usa o nome em espanhol", () => {
    expect(catalogName({ name: "Estoque", nameEs: "Inventario" }, "es")).toBe("Inventario");
  });
  it("sem nome em espanhol, fica o nome de sempre", () => {
    expect(catalogName({ name: "Estoque", nameEs: null }, "es")).toBe("Estoque");
  });
  it("cliente em português ignora o nome em espanhol", () => {
    expect(catalogName({ name: "Estoque", nameEs: "Inventario" }, "pt")).toBe("Estoque");
  });
});
