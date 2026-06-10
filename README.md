# DivulgaPsi

Plataforma SaaS para divulgacao, busca, agendamento e gestao de psicologos.

## Stack

- Frontend: Next.js, React e TypeScript
- Backend: NestJS e TypeScript
- Banco de dados: PostgreSQL
- ORM: Prisma
- Cache/Fila: Redis e BullMQ
- Upload: S3 compativel
- Autenticacao: JWT e Refresh Token

## Estrutura

```txt
apps/
  api/    Backend NestJS
  web/    Frontend Next.js
packages/
  shared/ Tipos, constantes e schemas compartilhados
```

## Requisitos

- Node.js 20+
- npm 10+
- Docker e Docker Compose

## Ambiente local

1. Copie `.env.example` para `.env` e preencha os segredos locais.
2. Suba PostgreSQL e Redis:

```bash
docker compose up -d
```

3. Instale dependencias:

```bash
npm install
```

4. Gere o Prisma Client:

```bash
npm --prefix apps/api run prisma:generate
```

5. Rode as aplicacoes:

```bash
npm run dev
```

## Scripts principais

```bash
npm run dev
npm run build
npm run lint
npm run test
```

Scripts especificos:

```bash
npm --prefix apps/api run build
npm --prefix apps/api run lint
npm --prefix apps/api run test
npm --prefix apps/web run build
npm --prefix apps/web run lint
```

## Etapas do MVP

1. Setup do monorepo
2. Autenticacao
3. Perfil do psicologo
4. Pagina publica
5. Busca
6. Agenda
7. Agendamento
8. Painel basico e admin basico

Pagamentos, avaliacoes, notificacoes e SEO avancado devem ser implementados somente depois do MVP funcional.
