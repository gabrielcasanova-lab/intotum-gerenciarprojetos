import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const { mailFrom } = await import("./mail");

describe("mailFrom", () => {
  it("só o nome: usa o SMTP_USER como endereço", () => {
    expect(mailFrom("Intotum Projetos", "projetos@intotumse.com.br")).toBe(
      '"Intotum Projetos" <projetos@intotumse.com.br>',
    );
  });

  it("nome e endereço: mantém como está", () => {
    expect(
      mailFrom("Intotum <projetos@intotumse.com.br>", "x@intotumse.com.br"),
    ).toBe("Intotum <projetos@intotumse.com.br>");
  });

  it("sem MAIL_FROM: usa o SMTP_USER", () => {
    expect(mailFrom(undefined, "projetos@intotumse.com.br")).toBe(
      "projetos@intotumse.com.br",
    );
  });
});
