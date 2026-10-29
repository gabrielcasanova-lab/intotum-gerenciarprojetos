import "server-only";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

/** Tamanho máximo de um anexo (o limite das Server Actions em next.config.ts é um pouco maior). */
export const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;

/**
 * Pasta dos anexos. No cPanel o app.js aponta para intotum-projetos/anexos,
 * fora da pasta "servidor" que é apagada a cada atualização.
 */
// turbopackIgnore: a pasta só existe em tempo de execução; sem isso o build
// copiaria o projeto inteiro para o pacote.
function uploadDir() {
  return path.resolve(
    /*turbopackIgnore: true*/ process.env.UPLOAD_DIR ?? path.join(process.cwd(), "anexos"),
  );
}

/** Caminho real do arquivo; recusa qualquer nome que tente sair da pasta. */
function resolveStored(storagePath: string) {
  const dir = uploadDir();
  const full = path.resolve(/*turbopackIgnore: true*/ dir, storagePath);
  if (path.dirname(full) !== dir) throw new Error("Caminho de anexo inválido.");
  return full;
}

/** Grava o arquivo com nome aleatório (o nome original fica só no banco). */
export async function saveUpload(file: File) {
  await mkdir(/*turbopackIgnore: true*/ uploadDir(), { recursive: true });
  const storagePath = randomUUID();
  await writeFile(/*turbopackIgnore: true*/ resolveStored(storagePath), Buffer.from(await file.arrayBuffer()));
  return storagePath;
}

export async function readUpload(storagePath: string) {
  return readFile(/*turbopackIgnore: true*/ resolveStored(storagePath));
}

/** Apaga arquivos do disco; falhas só vão para o registro (o banco já foi limpo). */
export async function removeUploads(storagePaths: string[]) {
  for (const p of storagePaths) {
    try {
      await rm(/*turbopackIgnore: true*/ resolveStored(p), { force: true });
    } catch (error) {
      console.error("Falha ao apagar anexo:", error);
    }
  }
}

/** Tipos que o navegador pode abrir direto na aba; o resto é baixado. */
const INLINE = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
]);

export function isInlineType(mimeType: string | null) {
  return mimeType !== null && INLINE.has(mimeType);
}

/** Content-Disposition com o nome original, inclusive acentos (RFC 6266). */
export function contentDisposition(fileName: string, inline: boolean) {
  const ascii = fileName.replace(/[^\x20-\x7e]/g, "_").replace(/["\\]/g, "_");
  return `${inline ? "inline" : "attachment"}; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(fileName)}`;
}
