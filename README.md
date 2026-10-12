# Intotum Projetos

Ferramenta interna da Intotum para acompanhar a implantação de sistemas nos clientes:
projeto → cliente → módulo → atividade, com acesso por perfil e exportação em PDF.

Requisitos e decisões de tecnologia: documentos `requisitos-v2.md` e `tecnologia-v1.md`
do projeto no Claude.

## Tecnologia

- **Next.js 16** (React, TypeScript, Tailwind), com `output: "standalone"` para rodar no
  "Setup Node.js App" do cPanel (Node.js 22).
- **PostgreSQL** do cPanel, acessado com **Drizzle ORM**. As migrações ficam em `drizzle/`.
- **Login próprio**: senha com bcrypt, sessão em banco (cookie `sessao`, 7 dias),
  bloqueio de 15 minutos após 5 senhas erradas.

## Perfis e permissões

| Perfil | O que faz |
|---|---|
| Administrador | Tudo, sem precisar de vínculo |
| Equipe | Vê ou edita os projetos/clientes aos quais foi vinculado |
| Cliente | Só vê o próprio cliente; nunca edita nem comenta; lê só os comentários "para o cliente" |

O vínculo pode ser no **projeto inteiro** ou em **um cliente dentro do projeto**.
As regras estão em `lib/permissions.ts`, com testes em `lib/permissions.test.ts`.

## Rodar no computador

Pré-requisitos: Node.js 22 e um PostgreSQL local.

```bash
npm install
cp .env.example .env          # ajuste DATABASE_URL
npm run db:migrate            # cria as tabelas
npm run create-admin -- "Seu Nome" voce@intotumse.com.br "SenhaForte#1"
npm run dev                   # http://localhost:3000
```

Verificações:

```bash
npm test          # regras de permissão e senha
npm run typecheck
npm run lint
npm run build
```

## Publicar no cPanel

O GitHub monta o pacote sozinho: a cada mudança na branch `main`, a ação **Testes e pacote**
roda os testes e gera o arquivo `intotum-projetos.zip` (aba Actions → execução mais recente →
Artifacts). Para gerar no computador: `npm run build && ./scripts/package.sh`.

O pacote tem `app.js` (arquivo de inicialização) e a pasta `servidor/`. As tabelas do banco
são criadas e atualizadas sozinhas quando o aplicativo sobe, então não é preciso terminal
nem phpPgAdmin.

### Primeira vez

1. **Banco:** em "Bancos de dados PostgreSQL", crie o banco e o usuário e dê todos os
   privilégios ao usuário no banco.
2. **E-mail de envio (opcional):** em "Contas de e-mail", crie `projetos@intotumse.com.br`.
   Sem ele o sistema funciona, mas os convites aparecem como link para copiar.
3. **Subdomínio:** em "Domínios", crie `projetos.intotumse.com.br`.
4. **Aplicação:** em "Setup Node.js App" → Criar aplicação:
   - Versão Node.js: **22.23.3**; Modo: **Production**
   - Raiz do aplicativo: `intotum-projetos`
   - URL do aplicativo: `projetos.intotumse.com.br`
   - Arquivo de inicialização: `app.js`
   - Variáveis de ambiente: `PGHOST`, `PGDATABASE`, `PGUSER`, `PGPASSWORD` (a senha vai
     como está, sem converter símbolos; no lugar delas também serve `DATABASE_URL`), `APP_URL` e,
     se houver o e-mail, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM`
5. **Arquivos:** no Gerenciador de Arquivos, envie o `intotum-projetos.zip` para a pasta
   `intotum-projetos` e extraia lá. Não clique em "Run NPM Install": o pacote já traz tudo.
6. **Iniciar:** volte ao "Setup Node.js App" e clique em **Restart**.
7. **Administrador:** abra `https://projetos.intotumse.com.br/primeiro-acesso` e crie o seu
   usuário. Essa tela só funciona enquanto o banco não tem nenhum usuário.

### Atualizações

Pare o aplicativo, apague a pasta `servidor` antiga, envie e extraia o zip novo e clique
em **Restart**. As migrações novas rodam sozinhas ao iniciar.
