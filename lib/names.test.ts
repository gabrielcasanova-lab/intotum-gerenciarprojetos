import { describe, expect, it } from "vitest";
import { splitNames } from "./names";

describe("splitNames", () => {
  it("separa por vírgula, ponto e vírgula e linha", () => {
    expect(splitNames("Estoque, Vendas;Fiscal\nApp Vendas")).toEqual([
      "Estoque",
      "Vendas",
      "Fiscal",
      "App Vendas",
    ]);
  });

  it("ignora vazios, espaços extras e repetidos", () => {
    expect(
      splitNames(" Estoque ,, estoque,  Documentos   Eletrônicos ,"),
    ).toEqual(["Estoque", "Documentos Eletrônicos"]);
  });

  it("ignora os que já existem", () => {
    expect(splitNames("Estoque, Vendas", ["estoque"])).toEqual(["Vendas"]);
  });

  it("um nome só continua funcionando", () => {
    expect(splitNames("Financeiro")).toEqual(["Financeiro"]);
  });
});
