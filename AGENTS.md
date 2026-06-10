# AGENTE CONSTRUTOR — Plataforma tipo Doctoralia para Psicólogos

Você é um agente sênior full stack responsável por construir uma plataforma SaaS para divulgação, busca, agendamento e gestão de psicólogos.

Stack:
- Frontend: Next.js + React + TypeScript
- Backend: NestJS + TypeScript
- Banco: PostgreSQL
- ORM: Prisma
- Cache/Fila: Redis + BullMQ
- Pagamentos: Asaas
- Upload: S3 compatível
- Autenticação: JWT + Refresh Token

Regras obrigatórias:
1. Nunca implemente tudo de uma vez.
2. Sempre trabalhe por etapas pequenas.
3. Antes de codar, analise a estrutura existente.
4. Após cada etapa, rode testes/build/lint quando possível.
5. Não exponha secrets no frontend.
6. Sempre criar validações, DTOs e tratamento de erro.
7. Priorizar segurança, LGPD e controle de permissões.
8. Manter código limpo, organizado e documentado.

Arquitetura backend:
- NestJS modular
- modules/
- controllers/
- services/
- dto/
- guards/
- strategies/
- prisma/
- common/

Arquitetura frontend:
- app/
- components/
- features/
- services/
- hooks/
- types/
- lib/

Ordem de construção:

ETAPA 1 — Setup
Criar monorepo com:
- apps/web
- apps/api
- docker-compose com PostgreSQL e Redis
- Prisma configurado
- README
- .env.example

ETAPA 2 — Autenticação
Criar:
- cadastro
- login
- refresh token
- recuperação de senha
- perfis ADMIN, PSYCHOLOGIST e PATIENT
- guards por perfil

ETAPA 3 — Perfil do psicólogo
Criar cadastro de:
- nome profissional
- CRP
- foto
- bio
- especialidades
- abordagem
- valor da consulta
- duração
- online/presencial
- cidade/estado
- WhatsApp
- status de aprovação

ETAPA 4 — Página pública
Criar página pública SEO:
- /psicologos/[slug]
- foto
- bio
- especialidades
- valor
- localização
- botão WhatsApp
- botão agendar

ETAPA 5 — Busca
Criar busca com filtros:
- cidade
- estado
- especialidade
- abordagem
- online/presencial
- faixa de preço

ETAPA 6 — Agenda
Criar:
- disponibilidade semanal
- bloqueios de horário
- horários livres
- impedir conflito de agenda

ETAPA 7 — Agendamento
Criar:
- paciente escolhe horário
- cria consulta
- status PENDING, CONFIRMED, CANCELED, COMPLETED
- painel do paciente
- painel do psicólogo

ETAPA 8 — Admin
Criar painel admin para:
- aprovar psicólogos
- gerenciar usuários
- gerenciar especialidades
- gerenciar agendamentos

ETAPA 9 — Pagamentos Asaas
Criar:
- planos
- assinatura do psicólogo
- pagamento de consulta
- webhook
- bloqueio por inadimplência

ETAPA 10 — Avaliações
Criar:
- avaliação apenas após consulta concluída
- nota 1 a 5
- comentário
- moderação admin

ETAPA 11 — Notificações
Criar fila BullMQ para:
- confirmação de cadastro
- agendamento criado
- consulta próxima
- pagamento aprovado
- cancelamento

ETAPA 12 — SEO
Criar:
- sitemap
- robots.txt
- metadados dinâmicos
- páginas por cidade
- páginas por especialidade

MVP obrigatório primeiro:
1. Login/cadastro
2. Perfil do psicólogo
3. Página pública
4. Busca
5. Agenda
6. Agendamento
7. Painel básico
8. Admin básico

Nunca avance para pagamentos antes do MVP estar funcionando.