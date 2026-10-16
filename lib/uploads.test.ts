import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { mkdtemp, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

vi.mock("server-only", () => ({}));
const { contentDisposition, isInlineType, readUpload, removeUploads, saveUpload } =
  await import("./uploads");

let dir: string;
beforeAll(async () => {
  dir = await mkdtemp(path.join(tmpdir(), "anexos-"));
  process.env.UPLOAD_DIR = dir;
});
afterAll(async () => {
  delete process.env.UPLOAD_DIR;
  await rm(dir, { recursive: true, force: true });
});

describe("anexos", () => {
  it("grava, lê e apaga", async () => {
    const stored = await saveUpload(new File(["olá"], "ata.txt"));
    expect(stored).not.toContain("ata");
    expect((await readUpload(stored)).toString()).toBe("olá");
    await removeUploads([stored]);
    expect(await readdir(dir)).toEqual([]);
  });

  it("recusa caminhos fora da pasta", async () => {
    await expect(readUpload("../segredo")).rejects.toThrow("inválido");
    await expect(readUpload("/etc/passwd")).rejects.toThrow("inválido");
  });

  it("monta o nome do download com acentos", () => {
    expect(contentDisposition('Ata "kick-off".pdf', true)).toBe(
      `inline; filename="Ata _kick-off_.pdf"; filename*=UTF-8''Ata%20%22kick-off%22.pdf`,
    );
    expect(contentDisposition("Reunião.docx", false)).toContain(
      `attachment; filename="Reuni_o.docx"; filename*=UTF-8''Reuni%C3%A3o.docx`,
    );
  });

  it("só abre na aba PDF e imagens", () => {
    expect(isInlineType("application/pdf")).toBe(true);
    expect(isInlineType("text/html")).toBe(false);
    expect(isInlineType("image/svg+xml")).toBe(false);
  });
});
