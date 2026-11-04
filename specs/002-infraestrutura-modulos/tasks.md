---

description: "Tarefas da feature 002: infraestrutura de módulos (fase 0)"
---

# Tasks: Infraestrutura de Módulos (Fase 0)

**Input**: Design documents from `/specs/002-infraestrutura-modulos/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/api.md, quickstart.md

**Tests**: incluídos. A constituição (princípio V) exige teste unitário para toda regra nova,
inclusive as recusas. Padrão do projeto: Jest com repositórios simulados, `*.spec.ts` ao lado do
arquivo; funções puras testadas sem banco. As migrations são validadas numa cópia do banco.

**Organization**: tarefas agrupadas por história da spec (US1 a US4).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: pode rodar em paralelo (arquivos diferentes, sem dependência pendente)
- **[Story]**: história da spec (US1 a US4)
- Caminhos relativos à raiz do repositório (`backend/src/`, `frontend/src/`)

## Convenções que valem para todas as tarefas

- **Nunca** rodar migration pela primeira vez no banco original: sempre antes na cópia
  (`controle_fazenda_copia`), conferindo contagens (research R2).
- A partir da T008, toda mudança de entidade vem com migration gerada por
  `npm run migration:generate`; o `synchronize` não volta.
- Rotas da fazenda usam a fazenda do token; rotas do administrador nunca devolvem dados de
  rebanho (FR-021).
- Telas novas: celular primeiro, alvos ≥ 44 px, `Aviso`, textos em português simples.
- Ao terminar cada fase: `npm test`, `npx tsc --noEmit` e `npm run lint` no backend; `tsc -b` e
  `eslint src` no frontend.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: segurança dos dados e esqueleto

- [X] T001 Fazer o backup do banco de dev com `pg_dump -Fc` para `~/backup_antes_fase0.dump` (fora do repositório) e restaurá-lo no banco `controle_fazenda_copia`, anotando a contagem de linhas de cada tabela num arquivo do scratchpad (quickstart, pré-requisitos)
- [X] T002 Criar `backend/src/database/data-source.ts` (DataSource com as mesmas variáveis `DB_*` do `AppModule`, entidades `dist/**/*.entity.js`, migrations `dist/database/migrations/*.js`, `synchronize: false`) e os scripts `migration:generate`, `migration:run`, `migration:revert` e `migration:show` em backend/package.json, rodando sobre `dist/` (research R1)
- [X] T003 [P] Criar as pastas `backend/src/modulos/{acesso,admin,leite,financeiro,nutricao}` e `frontend/src/modulos/{vitrine,admin}` com um `README.md` curto em `backend/src/modulos/` explicando a regra de isolamento (FR-024, R13)

---

## Phase 2: User Story 1 - Banco que evolui sem perder dados (Priority: P1) 🎯 base de tudo

**Goal**: estrutura do banco só por migrations, sem perder nenhum registro

**Independent Test**: quickstart.md, cenário 1

- [X] T004 [US1] Gerar a migration `Inicial` em backend/src/database/migrations/ contra um banco vazio temporário (`controle_fazenda_vazio`), cobrindo todas as tabelas, enums, índices e chaves atuais
- [X] T005 [US1] Adicionar ao início do `up` da `Inicial` a checagem de baseline: se a tabela `fazendas` já existe, retornar sem DDL (R2); o `down` derruba tudo só se for chamado de propósito, com comentário de alerta
- [X] T006 [US1] Em backend/src/app.module.ts: `synchronize: false`, `migrations` apontando para `dist/database/migrations/*.js` e `migrationsRun: true`; remover `DB_SYNCHRONIZE` de docker-compose.yml e de backend/.env (se houver), atualizando o comentário
- [X] T007 [US1] Validar na cópia: subir o backend apontando para `controle_fazenda_copia`, conferir a `Inicial` registrada em `migrations`, contagens idênticas às da T001 e `migration:generate` sem mudanças (SC-001)
- [X] T008 [US1] Validar do zero: subir contra um banco vazio novo, conferir que a estrutura é criada, registrar uma fazenda de teste e rodar `npm test` (SC-002); apagar o banco vazio
- [X] T009 [US1] Só depois de T007 e T008: subir no banco de dev original, conferir contagens e `migration:generate` vazio; registrar o resultado no fim deste arquivo

**Checkpoint**: banco controlado por migrations, dados intactos

---

## Phase 3: Foundational (Blocking Prerequisites for US2, US3 e US4)

**Purpose**: tabelas da fase 0 e a regra de situação dos módulos

- [X] T010 [P] Criar o enum `ModuloPago` (`LEITE`, `FINANCEIRO`, `NUTRICAO`) e a entidade `ModuloFazenda` (`modulos_fazenda`: fazendaId, modulo, dataInicio, dataTermino nula, liberadoPorId, liberadoEm, desativadoPorId, desativadoEm; índice (fazenda_id, modulo)) em backend/src/modulos/acesso/entities/
- [X] T011 [P] Criar as entidades `Administrador` (`administradores`: nome, email único, senhaHash, ativo, criadoEm) e `TentativaLoginAdmin` (`admin_tentativas_login`: email, sucesso, ip nulo, criadoEm; índice (email, criado_em)) em backend/src/modulos/admin/entities/
- [X] T012 [P] Criar a entidade `SuspensaoFazenda` (`fazenda_suspensoes`: fazendaId, motivo varchar(200), suspensaPorId, suspensaEm, reativadaPorId nulo, reativadaEm nulo) em backend/src/modulos/admin/entities/ e adicionar `suspensa` (boolean, padrão false) em backend/src/fazenda/entities/fazenda.entity.ts
- [X] T013 Gerar a migration `Modulos` em backend/src/database/migrations/ a partir de T010–T012 e aplicá-la primeiro na cópia, depois no dev (contagens iguais; tabelas novas vazias)
- [X] T014 [P] Testes da situação de um módulo (R3): ATIVO com início ≤ hoje e sem término; ATIVO no próprio dia do término; SO_CONSULTA depois do término ou desativado; NAO_CONTRATADO sem período ou com início futuro; `diasParaVencer`; em backend/src/modulos/acesso/situacao-modulo.spec.ts
- [X] T015 Implementar a função pura `situacaoDoModulo(periodos, hoje)` até T014 passar, em backend/src/modulos/acesso/situacao-modulo.ts

**Checkpoint**: tabelas criadas por migration e regra de situação testada

---

## Phase 4: User Story 3 - Bloqueio dos módulos não contratados (Priority: P1)

**Goal**: rotas de módulo pago recusam fazenda sem o módulo; desativado fica só consulta

**Independent Test**: quickstart.md, cenário 3 (liberando por SQL na fazenda de teste, antes de existir o painel)

### Tests for User Story 3

- [X] T016 [P] [US3] Testes do `ModuloGuard`: rota sem `@Modulo` passa; ATIVO passa em GET e POST; SO_CONSULTA passa em GET e recusa POST com `MODULO_SO_CONSULTA`; NAO_CONTRATADO recusa GET com `MODULO_NAO_CONTRATADO`; forma explícita no método vence o método HTTP; em backend/src/modulos/acesso/modulo.guard.spec.ts
- [X] T017 [P] [US3] Testes do `AcessoModulosService`: devolve os três módulos em ordem; usa o cache por 60 s; `limparCache(fazendaId)` força nova consulta; em backend/src/modulos/acesso/acesso-modulos.service.spec.ts
- [X] T018 [P] [US3] Teste de marcação: todo controller exportado em `backend/src/modulos/{leite,financeiro,nutricao}` tem metadado `@Modulo` com o módulo da própria pasta (FR-009), em backend/src/modulos/acesso/marcacao-modulos.spec.ts

### Implementation for User Story 3

- [X] T019 [US3] Criar o decorator `@Modulo(modulo, tipo?)` e o `ModuloGuard` (403 com `codigo` e mensagem do contrato) em backend/src/modulos/acesso/ até T016 passar
- [X] T020 [US3] Implementar `AcessoModulosService` (situação dos três módulos por fazenda com `situacaoDoModulo`, cache em memória de 60 s, `limparCache`) e o `AcessoModule` exportando-o, em backend/src/modulos/acesso/, até T017 passar
- [X] T021 [US3] Registrar o `ModuloGuard` como `APP_GUARD` depois do `RolesGuard` e importar o `AcessoModule` em backend/src/app.module.ts
- [X] T022 [P] [US3] Criar `LeiteModule` com `ExemploController` (`GET` e `POST /modulos/leite/exemplo`, `@Modulo(ModuloPago.LEITE)`, comentário "remover quando o módulo real existir") em backend/src/modulos/leite/
- [X] T023 [P] [US3] Criar `FinanceiroModule` com o mesmo `ExemploController` em backend/src/modulos/financeiro/
- [X] T024 [P] [US3] Criar `NutricaoModule` com o mesmo `ExemploController` em backend/src/modulos/nutricao/
- [X] T025 [US3] Adicionar `GET /fazenda/modulos` (dono e funcionário) usando `AcessoModulosService`, em backend/src/fazenda/fazenda.controller.ts, com teste no spec do controller ou do service; registrar os três módulos de exemplo em backend/src/app.module.ts; conferir T018 passando

**Checkpoint**: bloqueio provado pelas rotas de exemplo

---

## Phase 5: User Story 2 - Administrador libera, desativa e suspende (Priority: P1)

**Goal**: painel do dono do software, separado das fazendas

**Independent Test**: quickstart.md, cenários 2, 3 (pelo painel) e 5

### Tests for User Story 2

- [X] T026 [P] [US2] Testes do `AdminAuthService`: login certo emite token com `aud: 'admin'`; senha errada → 401 e tentativa gravada; 5 falhas seguidas em 15 min → 429 mesmo com a senha certa; falha antiga fora da janela não conta; administrador inativo → 401; em backend/src/modulos/admin/admin-auth.service.spec.ts
- [X] T027 [P] [US2] Testes do `AdminFazendasService`: listar com busca e sem dados de rebanho; liberar (400 término < início; 409 com período vigente ou futuro; permite novo período depois de desativado ou vencido); desativar (400 se já desativado); suspender (motivo obrigatório; 400 se já suspensa; não altera módulos); reativar; cada ação limpa o cache e grava quem fez; em backend/src/modulos/admin/admin-fazendas.service.spec.ts
- [X] T028 [P] [US2] Testes da suspensão no acesso da fazenda: `JwtStrategy` recusa token com `aud: 'admin'` e usuário de fazenda suspensa (403 `ACESSO_SUSPENSO`); `AuthService.login` recusa fazenda suspensa; em backend/src/auth/strategies/jwt.strategy.spec.ts e backend/src/auth/auth.service.spec.ts
- [X] T029 [P] [US2] Teste da página pública de fazenda suspensa: situação `FAZENDA_SUSPENSA` só com fazenda, brinco, raça, sexo e categoria (FR-028), em backend/src/consulta-publica/consulta-publica.service.spec.ts

### Implementation for User Story 2

- [X] T030 [US2] Criar a estratégia `jwt-admin` (valida `aud: 'admin'` e o administrador ativo), o `AdminJwtGuard` e o decorator `@AreaAdmin()`, e ajustar backend/src/auth/guards/jwt-auth.guard.ts para entregar rotas `@AreaAdmin` ao guard do administrador; emitir os tokens de fazenda com `aud: 'fazenda'` e fazer a `JwtStrategy` recusar `aud: 'admin'` (R6)
- [X] T031 [US2] Implementar `AdminAuthService` e `AdminAuthController` (`POST /admin/auth/login`, público, com tentativas gravadas e bloqueio) em backend/src/modulos/admin/ até T026 passar
- [X] T032 [US2] Criar o comando backend/src/database/criar-admin.ts (pergunta nome, e-mail e senha sem eco; senha ≥ 12 com letras e números; recusa e-mail repetido ou redefine a senha com confirmação) e o script `admin:criar` em backend/package.json, rodando sobre `dist/` (FR-022)
- [X] T033 [US2] Implementar `AdminFazendasService` e `AdminFazendasController` (rotas de fazendas, liberar, desativar, suspender, reativar do contrato) e o `AdminModule`, em backend/src/modulos/admin/, até T027 passar; registrar no backend/src/app.module.ts
- [X] T034 [US2] Checar a suspensão na `JwtStrategy` (carregando a fazenda junto do usuário) e no `AuthService.login`, com 403 `ACESSO_SUSPENSO`, até T028 passar, em backend/src/auth/
- [X] T035 [US2] Situação `FAZENDA_SUSPENSA` em backend/src/consulta-publica/consulta-publica.service.ts até T029 passar
- [X] T036 [P] [US2] Frontend da suspensão: interceptor de frontend/src/api/client.ts trata 403 `ACESSO_SUSPENSO` limpando a sessão e indo ao login com aviso; frontend/src/pages/Login.tsx mostra "Acesso suspenso · fale com o suporte"; frontend/src/pages/ConsultaAnimal.tsx mostra a versão reduzida com "Informações completas indisponíveis no momento"
- [X] T037 [P] [US2] Criar `adminClient` (token em `localStorage['adminToken']`, 401 leva a `/admin/login`) e as funções do painel em frontend/src/modulos/admin/api.ts
- [X] T038 [US2] Criar `AdminLogin` (mensagem de bloqueio do 429) e `AdminLayout` (cabeçalho próprio, sair) em frontend/src/modulos/admin/
- [X] T039 [US2] Criar `AdminFazendas` (lista com busca, usuários ativos, selo de suspensa e selos dos módulos) em frontend/src/modulos/admin/AdminFazendas.tsx
- [X] T040 [US2] Criar `AdminFazendaDetalhe` (liberar com início e término opcional, desativar com confirmação, suspender com motivo, reativar, histórico de períodos e suspensões com quem fez) em frontend/src/modulos/admin/AdminFazendaDetalhe.tsx
- [X] T041 [US2] Adicionar as rotas `/admin/login` e `/admin/*` fora do `Layout` das fazendas em frontend/src/App.tsx

**Checkpoint**: módulos liberados e fazendas suspensas pelo painel

---

## Phase 6: User Story 4 - Menu com os módulos e vitrine (Priority: P2)

**Goal**: menu com ativo, só consulta e vitrine; aviso de vencimento para o dono

**Independent Test**: quickstart.md, cenário 4

- [ ] T042 [P] [US4] Criar frontend/src/api/modulos.ts (`buscarModulos`, `consultarExemplo`, `lancarExemplo`) e os rótulos dos módulos e situações em frontend/src/utils/formatadores.ts
- [ ] T043 [US4] Criar `ModulosContext` (carrega `GET /fazenda/modulos` depois do login; expõe a situação de cada módulo e `recarregar`) em frontend/src/contexts/ModulosContext.tsx e usá-lo em frontend/src/main.tsx ou App.tsx
- [ ] T044 [US4] Adicionar o grupo **Módulos** (Leite, Financeiro, Nutrição) com selo "só consulta" ou "disponível" em frontend/src/components/Layout.tsx, para dono e funcionário (Q2 = A)
- [ ] T045 [US4] Criar `RotaDeModulo`, `Vitrine` ("Disponível no módulo X · fale com o suporte") e `TelaDeEspera` (ativo: botão que chama o exemplo; só consulta: aviso "Módulo desativado: só consulta · fale com o suporte para reativar", sem botão de lançar) em frontend/src/modulos/vitrine/ e a rota `/modulos/:modulo` em frontend/src/App.tsx
- [ ] T046 [US4] Aviso de vencimento no topo de frontend/src/pages/Dashboard.tsx: só para o dono, `diasParaVencer` de 0 a 10, "vence hoje" no último dia, volta a cada login (sessionStorage) (FR-016a)
- [ ] T047 [US4] Seção "Módulos contratados" com situação e data de término em frontend/src/pages/Configuracao.tsx (FR-016)

**Checkpoint**: todas as histórias funcionando

---

## Phase 7: Polish & Cross-Cutting Concerns

- [ ] T048 [P] Teste ou checagem de fronteira: nenhum arquivo fora de `backend/src/modulos/` importa de `modulos/leite|financeiro|nutricao`, e módulos pagos não importam uns dos outros (FR-024), em backend/src/modulos/acesso/marcacao-modulos.spec.ts
- [ ] T049 [P] Documentar no backend/README.md: como gerar e aplicar migrations, como criar o administrador e a regra "nunca rodar a primeira vez no banco original"
- [ ] T050 [P] Atualizar a seção 2 de docs/modulos/Planejamento-modulos.md como concluída, com as decisões novas (suspensão de fazenda, só consulta, aviso de vencimento, login do administrador)
- [ ] T051 Formatar com Prettier os arquivos novos do backend e conferir `npm test`, `npx tsc --noEmit`, `npm run lint` (backend) e `tsc -b`, `eslint src` (frontend)
- [ ] T052 Executar o quickstart.md completo, em largura de celular, com fazendas de teste isoladas, registrando aqui o que não pôde ser verificado

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (fase 1)**: sem dependência; T001 antes de qualquer coisa que toque o banco
- **US1 (fase 2)**: depende do setup; **bloqueia tudo** (as tabelas novas vêm por migration)
- **Foundational (fase 3)**: depende da US1
- **US3 (fase 4)**: depende da fase 3
- **US2 (fase 5)**: depende da fase 3; usa o `AcessoModulosService` da US3 para limpar o cache
- **US4 (fase 6)**: depende da US3 (`GET /fazenda/modulos`); o teste completo pede a US2 para liberar pelo painel
- **Polish (fase 7)**: depois de todas

### Within Each User Story

- Testes escritos antes e falhando; depois a implementação até passarem
- Entidades → service → controller → tela

### Parallel Opportunities

- T010, T011 e T012 (entidades em arquivos diferentes)
- T016, T017 e T018 (testes da US3); T022, T023 e T024 (módulos de exemplo)
- T026 a T029 (testes da US2); T036 e T037 (frontend em arquivos diferentes)

---

## Parallel Example: User Story 3

```text
Task: "T022 LeiteModule com ExemploController em backend/src/modulos/leite/"
Task: "T023 FinanceiroModule com ExemploController em backend/src/modulos/financeiro/"
Task: "T024 NutricaoModule com ExemploController em backend/src/modulos/nutricao/"
```

---

## Implementation Strategy

### MVP First (US1 + fase 3 + US3)

1. Setup e US1: migrations com dados intactos. **Parar e conferir com o dono** antes de seguir,
   porque é a única etapa que toca o banco com a fazenda real.
2. Fase 3 e US3: bloqueio funcionando com as rotas de exemplo (liberação por SQL na fazenda de teste).
3. O dono testa e aprova o commit.

### Incremental Delivery

1. US1 → validação na cópia e no dev → commit
2. Fase 3 + US3 → teste → commit
3. US2 (painel, suspensão) → teste → commit
4. US4 + fase 7 → quickstart completo → commit

## Notes

- [P] = arquivos diferentes, sem dependência pendente
- Cada história pode ser verificada sozinha pelo cenário indicado do quickstart
- As rotas de exemplo (T022–T024) saem quando cada módulo real for implementado

## Registro da US1 (T009, 2026-11-04)

- Backup do banco de dev em `~/backup_antes_fase0.dump` (115 KB), restaurado em `controle_fazenda_copia`.
- Migration `Inicial1793794228302`: 23 tabelas, gerada contra um banco vazio; com baseline
  (pula o DDL se `fazendas` já existe) e `CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`.
- Cópia: migration registrada sem DDL, `migration:generate` sem mudanças, contagens das 23 tabelas
  idênticas às de antes.
- Banco vazio: estrutura inteira criada pela migration (23 tabelas + `migrations`), sem diferença
  das entidades; backend subiu nele e registrou uma fazenda de teste; 233 testes passando.
- Banco de dev (com a fazenda real): backend reconstruído aplicou a migration ao subir; contagens
  idênticas (74 animais, 13 usuários, etc.) e `migration:generate` sem mudanças.
- `DB_SYNCHRONIZE` removido de `docker-compose.yml`, `.env`, `backend/.env`, `.env.example` e README.

## Registro da fase 3 e da US3 (2026-11-04)

- Migration `Modulos1793794925470` (4 tabelas novas e `fazendas.suspensa`): aplicada na cópia e no
  dev; contagens antigas idênticas; `migration:generate` sem mudanças.
- 254 testes no backend (21 novos: situação do módulo, guard, cache, marcação, `GET /fazenda/modulos`).
- Validação pela API num backend de teste ligado à **cópia** (liberações por SQL, com um
  administrador de teste inativo): sem módulo → 403 "Módulo não contratado" em GET e POST nos três
  módulos; pacote inicial liberado; ativo → 200/201; início futuro → não contratado; término em
  7 dias → `diasParaVencer` 7; desativado → depois de no máximo 60 s, GET 200 e POST 403 "Módulo
  desativado: só consulta".

## Registro da US2 (2026-11-04)

- 284 testes no backend (30 novos: login do administrador com bloqueio, painel, suspensão na
  estratégia e no login, página pública reduzida, senha forte do comando).
- Desvio da T030: os tokens das fazendas **não** ganharam `aud: 'fazenda'`. Basta que a estratégia
  das fazendas recuse `aud: 'admin'` e a do administrador exija `aud: 'admin'`; assim as sessões
  abertas das fazendas continuaram válidas.
- `liberar` devolve `{ liberado: true }` (a tela recarrega o detalhe), e não o período.
- O comando `admin:criar` lê as respostas por fila de linhas, para funcionar também com pipe.
- Validação pela API e no navegador (375 px), num backend de teste ligado à **cópia** e com um
  administrador de teste criado pelo próprio comando: 31 verificações pela API e, nas telas,
  login do painel, lista com selos, liberar Nutrição, suspender com motivo, login da fazenda
  suspensa recusado, sessão aberta devolvida ao login com o aviso e página pública reduzida.
- O banco de dev continua **sem administrador**: o dono cria o seu com
  `docker compose exec backend npm run admin:criar`.
