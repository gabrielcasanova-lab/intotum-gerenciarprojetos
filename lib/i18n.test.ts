import { describe, expect, it } from "vitest";
import { dictionary, isLanguage, LANGUAGES } from "./i18n";
import { STATUSES } from "./labels";

describe("i18n", () => {
  it("todo status tem texto nos dois idiomas", () => {
    for (const l of LANGUAGES) {
      for (const s of STATUSES) expect(dictionary(l).status[s]).toBeTruthy();
    }
    expect(dictionary("es").status.aguardando_cliente).toBe("Esperando al cliente");
  });

  it("idioma desconhecido cai no português", () => {
    expect(isLanguage("en")).toBe(false);
    // @ts-expect-error valor inválido de propósito
    expect(dictionary("en").logout).toBe("Sair");
  });

  it("e-mail de convite em espanhol leva o link e o login", () => {
    const text = dictionary("es").mail.invite("Ana", "https://x/convite/1", "https://x/login", "ana@x.com");
    expect(text).toContain("Hola, Ana.");
    expect(text).toContain("https://x/convite/1");
    expect(text).toContain("https://x/login");
  });
});
