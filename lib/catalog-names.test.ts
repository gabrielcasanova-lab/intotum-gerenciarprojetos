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

import { findSpanishName, parseNameList } from "./catalog-names";

describe("lista de nomes em espanhol", () => {
  const list = parseNameList(`# comentário
CADASTRO = REGISTROS
Cadastro = Registros
Entrada ( Simplificada ) = Entrada (Simplificada)
Análise de Estoque → Análisis de Inventario
linha sem separador`);

  it("lê as linhas e ignora comentários e linhas inválidas", () => {
    expect(list).toHaveLength(4);
  });
  it("prefere o nome exatamente igual", () => {
    expect(findSpanishName("CADASTRO", list)).toBe("REGISTROS");
    expect(findSpanishName("Cadastro", list)).toBe("Registros");
  });
  it("ignora espaços, acentos e maiúsculas quando não há igual", () => {
    expect(findSpanishName("Entrada (Simplificada)", list)).toBe("Entrada (Simplificada)");
    expect(findSpanishName("analise de estoque", list)).toBe("Análisis de Inventario");
    expect(findSpanishName("Outro", list)).toBeNull();
  });
});
