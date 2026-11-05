---

description: "Tarefas da feature 007: preparação para publicação"
---

# Tasks: Preparação para publicação

**Input**: Design documents from `/specs/007-preparacao-publicacao/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/api.md, quickstart.md

**Tests**: incluídos (constituição, princípio V). Jest com repositórios simulados; infraestrutura validada pelo
ensaio de produção local (quickstart 4 a 6).

**Organization**: tarefas agrupadas por história da spec (US1 a US5).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: pode rodar em paralelo (arquivos diferentes, sem dependência pendente)
- **[Story]**: história da spec (US1 a US5)

## Convenções

- Senha nunca em texto no log, no banco ou no aparelho; a provisória só aparece uma vez, na resposta.
- Migration nova: primeiro na cópia (backup novo, contagens, `migration:generate` vazio); depois no dev.
- Infraestrutura de produção fica em `docker-compose.prod.yml`, `.env.producao.example` e `deploy/`; o
  `docker-compose.yml` de desenvolvimento não muda.
- Ao terminar cada fase: testes, tipos e lint do backend e do frontend.

---

## Phase 1: Setup

- [X] T001 Backup novo do dev (`~/backup_antes_publicacao.dump`), recriar `controle_fazenda_copia` e anotar as contagens
- [X] T002 [P] Remover os 13 imports e variáveis sem uso apontados por `npx oxlint src` (create-usuario.dto, movimentacao-pasto.controller, pasto.controller, pesagem.service.spec, parto.service, diagnostico.service, raca.service.spec, raca.controller, create-animal.dto, gerar-lote.dto, codigo-identificacao.service.spec) sem mudar comportamento; `oxlint` com zero avisos (FR-021)

---

## Phase 2: Foundational

- [X] T003 Campos novos: `precisaTrocarSenha` boolean não nulo padrão `false` e `senhaAlteradaEm` timestamptz nulo em backend/src/usuario/entities/usuario.entity.ts; `senhaAlteradaEm` timestamptz nulo em backend/src/modulos/admin/entities/administrador.entity.ts
- [X] T004 Gerar a migration `Publicacao` na cópia, mover para backend/src/database/migrations/, aplicar na cópia e conferir contagens iguais e `migration:generate` sem mudanças
- [X] T005 [P] Testes de backend/src/auth/senha-provisoria.spec.ts (10 caracteres, só do alfabeto sem 0/O/1/l/I, valores diferentes) e implementar backend/src/auth/senha-provisoria.ts com `crypto.randomInt` (R6)

**Checkpoint**: banco com os campos novos; gerador de senha provisória pronto.

---

## Phase 3: User Story 1 - Senhas sob controle sem e-mail (Priority: P1) 🎯

**Goal**: troca da própria senha, redefinição pelo dono e pelo administrador com senha provisória e troca obrigatória,
sessões antigas encerradas.

**Independent Test**: quickstart, cenário 1.

- [X] T006 [US1] Recusar token anterior à troca: em backend/src/auth/strategies/jwt.strategy.ts e backend/src/modulos/admin/admin-jwt.strategy.ts, 401 quando `payload.iat < floor(senhaAlteradaEm / 1000)`; devolver `precisaTrocarSenha` no payload validado do usuário; testes nas specs das estratégias (FR-005)
- [X] T007 [US1] Testes e guard global backend/src/auth/guards/senha-provisoria.guard.ts: com `precisaTrocarSenha`, 403 `{ codigo: 'SENHA_PROVISORIA', message: 'Crie uma senha nova para continuar' }` em toda rota de fazenda, exceto as marcadas com o decorator novo `@PermiteSenhaProvisoria()`; rotas públicas e do painel não são afetadas; registrar em backend/src/app.module.ts depois do guard de JWT (FR-004)
- [X] T008 [US1] `POST /auth/trocar-senha` `{ senhaAtual, novaSenha }` em backend/src/auth/auth.controller.ts e auth.service.ts com `@PermiteSenhaProvisoria()`: 400 senha atual errada, nova com menos de 8 ou igual à atual; grava hash, `senhaAlteradaEm`, desliga `precisaTrocarSenha` e devolve `{ accessToken, usuario }` novo; o login passa a devolver `usuario.precisaTrocarSenha`; testes em auth.service.spec.ts (FR-001, FR-002)
- [X] T009 [US1] `POST /usuario/:id/redefinir-senha` (DONO) em backend/src/usuario/usuario.controller.ts e usuario.service.ts: 404 usuário de outra fazenda, 403 se o alvo for DONO, 400 usuário desativado; grava hash da provisória, liga `precisaTrocarSenha`, grava `senhaAlteradaEm` e devolve `{ senhaProvisoria }`; mínimo de 8 caracteres no cadastro de funcionário em create-usuario.dto.ts; testes e papéis (FR-003, FR-006)
- [X] T010 [US1] Painel: `POST /admin/fazendas/:id/redefinir-senha-dono` em backend/src/modulos/admin/admin.controller.ts e admin-fazendas.service.ts (dono ativo da fazenda; 404 fazenda inexistente) e `POST /admin/auth/trocar-senha` em admin-auth.service.ts (regra de 12 com letra e número de `motivoSenhaFraca`, grava `senhaAlteradaEm`, devolve token novo); `criar-admin` grava `senhaAlteradaEm`; testes (FR-002, FR-003)
- [X] T011 [P] [US1] Frontend: frontend/src/pages/TrocarSenha.tsx (rota `/trocar-senha`; senha atual, nova duas vezes; `autoComplete` `current-password` e `new-password`; ao salvar guarda o token novo) e item "Trocar minha senha" em frontend/src/components/Layout.tsx; Login.tsx leva a `/trocar-senha` quando `precisaTrocarSenha`; frontend/src/api/client.ts leva a `/trocar-senha` no 403 `SENHA_PROVISORIA` (FR-001, FR-004)
- [X] T012 [P] [US1] Frontend: botão "Redefinir senha" por funcionário ativo em frontend/src/pages/Usuarios.tsx com confirmação, senha provisória exibida uma vez com botão de copiar e aviso para entregar ao funcionário
- [X] T013 [P] [US1] Painel: "Redefinir senha do dono" em frontend/src/modulos/admin/AdminFazendaDetalhe.tsx e "Trocar minha senha" em frontend/src/modulos/admin/AdminLayout.tsx, com as funções em frontend/src/modulos/admin/api.ts

**Checkpoint**: US1 pronta; dá para testar no dev.

---

## Phase 4: User Story 2 - Sistema no ar com endereço seguro (Priority: P1)

**Goal**: compose de produção com HTTPS automático, `/api`, partes internas fechadas, saúde e autoheal.

**Independent Test**: quickstart, cenário 4 (ensaio local com `DOMINIO=localhost`).

- [X] T014 [P] [US2] `GET /saude` público em backend/src/saude/saude.controller.ts e saude.module.ts (`SELECT 1`; 200 `{ status: 'ok' }`, 503 `{ status: 'erro' }`), registrado em app.module.ts; teste (FR-014)
- [X] T015 [P] [US2] backend/src/main.ts: `trust proxy` = 1 (endereço real atrás do Caddy)
- [X] T016 [P] [US2] deploy/Caddyfile: site `{$DOMINIO}`, `handle_path /api/*` → `backend:3000`, resto → `frontend:80`, cabeçalhos `Strict-Transport-Security`, `X-Content-Type-Options nosniff`, `X-Frame-Options DENY`, `Referrer-Policy strict-origin-when-cross-origin`, sem `Server` (FR-010, FR-013)
- [X] T017 [US2] docker-compose.prod.yml na raiz: `db` (sem portas, `pg_isready`), `backend` (sem portas, `SWAGGER_ENABLED=false`, `CORS_ORIGINS=https://${DOMINIO}`, healthcheck em `/saude`, label do autoheal), `frontend` (build com `VITE_API_URL=/api`, sem portas, healthcheck), `caddy` (80 e 443, volumes de dados e config), `autoheal`; todos `restart: unless-stopped`; e .env.producao.example com cada variável explicada (FR-011, FR-012, FR-014)
- [X] T018 [US2] Ensaio local do cenário 4 do quickstart com `DOMINIO=localhost` e banco vazio: site, redirecionamento, `/api/saude`, sem `/api/docs`, cabeçalhos, portas 5432/3000/8080 fechadas, autoheal com `docker pause`, reinício do Docker; criar o primeiro administrador pelo `criar-admin` dentro do container

**Checkpoint**: produção ensaiada na máquina local.

---

## Phase 5: User Story 3 - Backup diário que de fato restaura (Priority: P1)

**Goal**: dump diário enviado à nuvem, guarda de 7 dias e 4 semanas, alerta de falha, restauração testada.

**Independent Test**: quickstart, cenário 5.

- [X] T019 [P] [US3] deploy/backup/Dockerfile (`postgres:16-alpine` + `rclone` + `crond`, fuso `America/Sao_Paulo`, cron às 03:00) e deploy/backup/backup.sh: `pg_dump -Fc` em `/backups/diarios/controle_fazenda_AAAA-MM-DD.dump`, cópia em `semanais/` no domingo, `rclone copy` para `${BACKUP_REMOTO}`, apagar diários com mais de 7 dias e semanais com mais de 28 (local e remoto), chamar `${BACKUP_AVISO_URL}` no sucesso e `${BACKUP_AVISO_URL}/fail` com log em qualquer erro (FR-016, FR-017, FR-019)
- [X] T020 [P] [US3] deploy/backup/restaurar.sh: listar backups do remoto, baixar o escolhido (ou o mais recente), parar o backend, `pg_restore --clean --if-exists`, subir o backend e imprimir as contagens por tabela (FR-018)
- [X] T021 [US3] Serviço `backup` no docker-compose.prod.yml (volume `/backups`, variáveis do remoto S3 e da URL de aviso) e variáveis em .env.producao.example; comando para rodar o backup na hora
- [X] T022 [US3] Ensaio do cenário 5 com um remoto local do `rclone`: backup na hora, dados criados e contagens anotadas, volume do banco apagado, restauração pelo roteiro, contagens iguais e tempo medido; guarda simulada com arquivos antigos

**Checkpoint**: backup e restauração comprovados.

---

## Phase 6: User Story 4 - Proteção contra tentativas em massa (Priority: P2)

**Goal**: limite na consulta pública e bloqueios registrados no log (o bloqueio dos logins já existe).

**Independent Test**: quickstart, cenário 3.

- [X] T023 [P] [US4] Testes e guard backend/src/common/limite-por-ip.guard.ts (60 por minuto por endereço, 429 `{ codigo: 'MUITAS_CONSULTAS' }`, limpeza das entradas velhas) aplicado em backend/src/consulta-publica/consulta-publica.controller.ts; frontend/src/pages/ConsultaAnimal.tsx mostra "Muitas consultas seguidas, tente daqui a um minuto" no 429 (FR-008)
- [X] T024 [P] [US4] `Logger.warn` sem senha nos bloqueios: backend/src/auth/auth.service.ts (e-mail e horário), backend/src/modulos/admin/admin-auth.service.ts (e-mail e endereço) e no guard do limite (endereço) (FR-009)

**Checkpoint**: limites prontos.

---

## Phase 7: User Story 5 - Cadastro de novas fazendas (Priority: P2)

**Goal**: sem cadastro público; o administrador cria a fazenda e o dono no painel.

**Independent Test**: quickstart, cenário 2.

**Depende de**: US1 (senha provisória e troca obrigatória).

- [X] T025 [US5] Remover `POST /auth/registrar-fazenda`, `registrarFazenda` do AuthService e backend/src/auth/dto/registrar-fazenda.dto.ts; ajustar testes (FR-022)
- [X] T026 [US5] `POST /admin/fazendas` `{ nomeFazenda, nomeDono, emailDono }` em backend/src/modulos/admin/admin.controller.ts e admin-fazendas.service.ts: fazenda e dono na mesma transação, senha provisória, `precisaTrocarSenha = true`, 409 e-mail já usado sem criar nada, devolve `{ fazendaId, senhaProvisoria }`; testes (FR-023)
- [X] T027 [P] [US5] Painel: botão "Nova fazenda" em frontend/src/modulos/admin/AdminFazendas.tsx com formulário e a senha provisória exibida uma vez com botão de copiar; função em frontend/src/modulos/admin/api.ts
- [X] T028 [US5] Atualizar os scripts de validação do scratchpad para criar fazendas de teste pela rota do painel (helper único) e rodar o quickstart 1 a 3 na cópia

**Checkpoint**: todas as histórias prontas.

---

## Phase 8: Polish & Cross-Cutting Concerns

- [X] T029 [P] Login do usuário e do painel com `<form>`, `id`/`name` e `autoComplete` `username` e `current-password` em frontend/src/pages/Login.tsx e frontend/src/modulos/admin/AdminLogin.tsx; conferir no navegador que ele oferece salvar a senha (FR-024)
- [X] T030 docs/publicacao/Roteiro-de-publicacao.md: contratar o servidor, instalar Docker, apontar o domínio, criar o bucket e as chaves, preencher o `.env`, subir, criar o administrador, configurar UptimeRobot e Healthchecks.io, atualizar para versão nova (backup antes, migrations), restaurar e redefinir o administrador pelo servidor (FR-015, FR-025)
- [X] T031 [P] README.md (seção de produção apontando o roteiro) e docs/modulos/Planejamento-modulos.md (cabeçalho: preparação para publicação concluída)
- [X] T032 Migration no dev (`docker compose up -d --build`), quickstart completo e registro neste arquivo

---

## Dependencies & Execution Order

- **Setup (T001–T002)** → **Foundational (T003–T005)** → histórias.
- **US1** depende só da base. **US5** depende da US1 (senha provisória e troca obrigatória).
- **US2** e **US3** independem do código das outras histórias; a US3 usa o compose da US2 (T017 antes de T021).
- **US4** é independente.
- **Polish** por último; T030 depois de US2 e US3.

### Parallel Opportunities

- T002 e T005 em paralelo com o resto da base.
- Na US1, T011, T012 e T013 (frontend) juntos depois de T008 a T010.
- T014, T015 e T016 juntos; T019 e T020 juntos.
- US4 em paralelo com a US2 ou a US3.

## Implementation Strategy

### MVP (incremento 1: código, testável no dev)

1. Setup e Foundational.
2. US1 (senhas), US4 (limites) e US5 (cadastro pelo painel), mais T029 (senha salva pelo navegador).
3. Parar para o dono testar no dev.

### Incremento 2: infraestrutura

1. US2 (compose de produção, Caddy, saúde, autoheal) e US3 (backup e restauração), com o ensaio local.
2. Roteiro de publicação e documentação (T030–T032).

Com os dois incrementos, falta só o que depende de terceiros: servidor, domínio, bucket e contas dos alertas.

## Registro do incremento 1 (T001–T013, T023–T029)

- O levantamento mostrou que já existiam o bloqueio dos dois logins e o limite da consulta pública (30/min); o
  limite passou a 60/min com código `MUITAS_CONSULTAS`, registro no log e teste.
- Backend: 528 testes (87 suítes); `oxlint` com zero avisos. Frontend: `tsc -b` e `eslint src` sem problemas.
- Cópia: migration `Publicacao1793852171977` com contagens iguais e `migration:generate` sem mudanças; script dos
  cenários 1 a 3 do quickstart com 37 verificações, nenhuma falha. Os scripts de validação passaram a criar fazendas
  pelo painel (`fazenda_teste.py`); o da spec 006 rodou de novo sem falhas.
- Tela a 375 px: troca obrigatória da senha provisória até entrar no painel, "Trocar minha senha" no menu,
  "Redefinir senha" em Usuários (a tela sobe até a senha provisória), "Nova fazenda", "Redefinir senha do dono" e
  "Trocar minha senha" no painel (link ajustado para aparecer na barra verde); login com `autoComplete`.
- Dev: backup `backup_antes_publicacao.dump`; rebuild aplicou a migration; só mudou `migrations` (+1).

## Registro do incremento 2 (T014–T022, T030–T032)

- Backend: rota pública `/saude` e `trust proxy` só com `TRUST_PROXY=1`; 530 testes (88 suítes), lint zero.
- Ensaio de produção local (`DOMINIO=localhost`, banco vazio, projeto `controle-fazenda-prod`):
  - `https://localhost/api/saude` ok; `http://` → 308 para `https://`; `/api/docs` 404; HSTS, `nosniff`,
    `X-Frame-Options DENY` e `Referrer-Policy` presentes, sem cabeçalho `Server`;
  - só o Caddy com portas publicadas (banco, backend e site sem porta no host);
  - site construído com a API em `/api`; administrador criado com `npm run admin:criar` dentro do container;
    fazenda, dono, pasto e 12 animais criados pelo HTTPS;
  - autoheal: backend congelado (`docker kill --signal=STOP`) reiniciado sozinho em 116 s, de volta em 120 s.
- Backup: dump, cópia ao remoto (pasta local no papel do bucket) e guarda de 7 dias / 28 dias conferida com
  arquivos antigos simulados, no servidor e no remoto. Corrigidos no ensaio: limpeza do remoto antes de existir
  `semanais/`, aviso de configuração do rclone e listagem de pastas.
- Restauração: do remoto para um banco novo e vazio em 24 s, 53 tabelas com contagens iguais. O script ganhou
  `RESTAURAR_EM` (conferir backup sem tocar no banco em uso), depois que um primeiro teste restaurou por engano
  no banco principal do ensaio, sem perda (mesmo backup, contagens conferidas).
- Não ensaiado: apagar o volume do banco (a verificação de segurança barrou a remoção; a restauração em banco
  vazio cobre o mesmo caminho), reinício do Docker inteiro, bucket real e domínio real (ficam para o dia da
  publicação, no roteiro).
- Dev: rebuild com a rota `/saude`; sem migration nova.

