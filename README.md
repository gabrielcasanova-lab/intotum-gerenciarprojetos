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

## Publicar no cPanel (rascunho, a validar na primeira publicação)

1. **Banco:** em "Bancos de dados PostgreSQL", crie o banco e o usuário e dê acesso ao usuário.
2. **Tabelas:** abra o phpPgAdmin, selecione o banco e execute o conteúdo de `drizzle/0000_*.sql`.
3. **Pacote:** rode `npm run build` e depois
   `cp -r public .next/standalone/ && cp -r .next/static .next/standalone/.next/`.
   Compacte a pasta `.next/standalone` e envie pelo Gerenciador de Arquivos para uma pasta
   como `/home/intotumse/intotum-projetos`.
4. **Aplicação:** em "Setup Node.js App" → Criar aplicação:
   - Versão Node.js: **22.23.3**
   - Modo: **Production**
   - Raiz do aplicativo: `intotum-projetos`
   - URL: o subdomínio escolhido (ex.: `projetos.intotumse.com.br`)
   - Arquivo de inicialização: `server.js`
   - Variável de ambiente: `DATABASE_URL`
5. **Primeiro administrador:** ainda depende do script `create-admin`; a forma de rodá-lo no
   cPanel será definida na primeira publicação.
