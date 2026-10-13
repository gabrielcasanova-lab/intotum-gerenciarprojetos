#!/usr/bin/env bash
# Monta o pacote para o cPanel a partir de um build já feito (npm run build).
#
# pacote/
#   app.js        <- "Arquivo de inicialização" no Setup Node.js App
#   servidor/     <- saída standalone do Next.js + arquivos estáticos + migrações
#
# O servidor fica numa subpasta porque o Node.js do cPanel (CloudLinux) usa a
# pasta node_modules da raiz do aplicativo para o próprio ambiente.
set -euo pipefail
cd "$(dirname "$0")/.."

rm -rf pacote intotum-projetos.zip
mkdir -p pacote
# -L: copia o conteúdo dos atalhos (symlinks), que o gerenciador de arquivos do cPanel pode não recriar.
cp -rL .next/standalone pacote/servidor
cp -r .next/static pacote/servidor/.next/static
cp -r public pacote/servidor/public
cp -r drizzle pacote/servidor/drizzle
# O .env local nunca vai no pacote: no cPanel as variáveis ficam na tela do aplicativo.
rm -f pacote/servidor/.env pacote/servidor/.env.*

cat > pacote/app.js <<'JS'
// Ponto de entrada no cPanel: repassa para o servidor do Next.js.
// Erros na partida vão para erro-inicio.log nesta pasta (o 500 do cPanel não diz o motivo).
const fs = require("fs");
const path = require("path");
const util = require("util");
const logFile = path.join(__dirname, "erro-inicio.log");
const log = (msg) => {
  try {
    fs.appendFileSync(logFile, `[${new Date().toISOString()}] ${msg}\n`);
  } catch {}
};
process.on("uncaughtException", (e) => {
  log((e && e.stack) || e);
  process.exit(1);
});
process.on("unhandledRejection", (e) => log((e && e.stack) || e));
// Erros que o Next.js só escreve na tela do servidor também vão para o arquivo.
const consoleError = console.error;
console.error = (...args) => {
  log(util.format(...args));
  consoleError(...args);
};
log(`iniciando (Node ${process.version}, pasta ${__dirname})`);
require("./servidor/server.js");
JS

(cd pacote && zip -qr ../intotum-projetos.zip .)
echo "Pacote pronto: intotum-projetos.zip ($(du -h intotum-projetos.zip | cut -f1))"
