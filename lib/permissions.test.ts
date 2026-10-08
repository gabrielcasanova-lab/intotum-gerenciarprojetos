import { describe, expect, it } from "vitest";
import {
  accessLevel,
  canComment,
  canManageSystem,
  visibleCommentTypes,
  type Grant,
} from "./permissions";

const target = { projectId: "p1", projectClientId: "pc1" };
const otherClient = { projectId: "p1", projectClientId: "pc2" };
const otherProject = { projectId: "p2", projectClientId: "pc3" };

describe("accessLevel", () => {
  it("admin edita tudo sem vínculo", () => {
    expect(accessLevel("admin", [], target)).toBe("editar");
  });

  it("sem vínculo, equipe não acessa", () => {
    expect(accessLevel("equipe", [], target)).toBeNull();
  });

  it("vínculo no projeto vale para todos os clientes do projeto", () => {
    const grants: Grant[] = [
      { projectId: "p1", projectClientId: null, level: "visualizar" },
    ];
    expect(accessLevel("equipe", grants, target)).toBe("visualizar");
    expect(accessLevel("equipe", grants, otherClient)).toBe("visualizar");
    expect(accessLevel("equipe", grants, otherProject)).toBeNull();
  });

  it("vínculo no cliente vale só para aquele cliente", () => {
    const grants: Grant[] = [
      { projectId: null, projectClientId: "pc1", level: "editar" },
    ];
    expect(accessLevel("equipe", grants, target)).toBe("editar");
    expect(accessLevel("equipe", grants, otherClient)).toBeNull();
  });

  it("vale o maior nível entre os vínculos", () => {
    const grants: Grant[] = [
      { projectId: "p1", projectClientId: null, level: "visualizar" },
      { projectId: null, projectClientId: "pc1", level: "editar" },
    ];
    expect(accessLevel("equipe", grants, target)).toBe("editar");
    expect(accessLevel("equipe", grants, otherClient)).toBe("visualizar");
  });

  it("cliente só vê o próprio cliente e nunca edita", () => {
    const grants: Grant[] = [
      { projectId: null, projectClientId: "pc1", level: "editar" },
    ];
    expect(accessLevel("cliente", grants, target)).toBe("visualizar");
    expect(accessLevel("cliente", grants, otherClient)).toBeNull();
  });

  it("cliente ignora vínculo no projeto inteiro", () => {
    const grants: Grant[] = [
      { projectId: "p1", projectClientId: null, level: "visualizar" },
    ];
    expect(accessLevel("cliente", grants, target)).toBeNull();
  });
});

describe("comentários", () => {
  it("cliente lê só comentários para o cliente", () => {
    expect(visibleCommentTypes("cliente")).toEqual(["cliente"]);
    expect(visibleCommentTypes("equipe")).toEqual(["interno", "cliente"]);
  });

  it("só quem edita comenta", () => {
    const view: Grant[] = [
      { projectId: "p1", projectClientId: null, level: "visualizar" },
    ];
    const edit: Grant[] = [
      { projectId: "p1", projectClientId: null, level: "editar" },
    ];
    expect(canComment("equipe", view, target)).toBe(false);
    expect(canComment("equipe", edit, target)).toBe(true);
    expect(canComment("cliente", edit, target)).toBe(false);
    expect(canComment("admin", [], target)).toBe(true);
  });
});

describe("administração", () => {
  it("só admin gerencia o sistema", () => {
    expect(canManageSystem("admin")).toBe(true);
    expect(canManageSystem("equipe")).toBe(false);
    expect(canManageSystem("cliente")).toBe(false);
  });
});
