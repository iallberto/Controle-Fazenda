---

description: "Tarefas da feature 001: cobertura e inseminação no pacote inicial"
---

# Tasks: Cobertura e Inseminação no Pacote Inicial

**Input**: Design documents from `/specs/001-cobertura-inseminacao/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/api.md, quickstart.md

**Tests**: incluídos. A constituição (princípio V) exige teste unitário para toda regra de negócio
nova, inclusive os casos de recusa. Padrão do projeto: Jest com repositórios simulados, arquivo
`*.spec.ts` ao lado do service; funções puras de `dominio/` testadas sem banco.

**Organization**: tarefas agrupadas por história da spec, para cada uma ser implementada e testada
sozinha.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: pode rodar em paralelo (arquivos diferentes, sem dependência pendente)
- **[Story]**: história da spec (US1 a US6)
- Caminhos relativos à raiz do repositório (`backend/src/`, `frontend/src/`)

## Convenções que valem para todas as tarefas

- Toda rota usa a fazenda do token e responde **404** para registro de outra fazenda; ids de rota
  com `ParseUUIDPipe` (constituição, princípio I).
- Toda tabela nova tem `criado_por`, `criado_em`, `atualizado_por`, `atualizado_em`
  (data-model.md).
- Telas novas: celular primeiro, alvos ≥ 44 px, `Aviso` com o que foi gravado, textos pelos
  formatadores (princípio IV).
- Ao terminar cada fase: `npm test`, `npx tsc --noEmit` e `npm run lint` no backend; `tsc -b` e
  `eslint src` no frontend.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: esqueleto do módulo e da navegação

- [X] T001 Criar o módulo vazio `ReproducaoModule` com controller `@Controller('reproducao')` (`@ApiTags`, `@ApiBearerAuth`) em backend/src/reproducao/reproducao.module.ts e backend/src/reproducao/reproducao.controller.ts, e registrá-lo em backend/src/app.module.ts
- [X] T002 [P] Criar o cliente da API com os tipos dos contratos (sem funções ainda) em frontend/src/api/reproducao.ts
- [X] T003 [P] Adicionar ao menu o grupo "Reprodução" (Estações de monta `/reproducao/estacoes`, Diagnóstico `/reproducao/diagnostico`, Inseminação `/reproducao/inseminacao`) e os títulos de aba em frontend/src/components/Layout.tsx, com as rotas protegidas correspondentes em frontend/src/App.tsx apontando para páginas provisórias em frontend/src/pages/reproducao/

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: entidades e regras compartilhadas por várias histórias

**⚠️ CRITICAL**: nenhuma história começa antes desta fase

- [X] T004 Criar a classe embutida de cancelamento (R9) com `cancelado` (bool, padrão falso), `canceladoEm`, `canceladoPorId`, `motivoCancelamento` (varchar(200)) em backend/src/common/cancelamento.ts
- [X] T005 [P] Criar a entidade `EstacaoMonta` (`estacoes_monta`): `fazendaId`; `touroId` → Animal; `pastoId` → Pasto; `dataEntrada` date obrigatório; `dataSaida` date nulo ("nulo = estação aberta"); `motivoEncerramento` varchar nulo com valores `MANUAL`, `TOURO_SAIU_DO_PASTO`, `TOURO_SAIU_DO_REBANHO`; auditoria e cancelamento, em backend/src/reproducao/entities/estacao-monta.entity.ts
- [X] T006 [P] Criar a entidade `ExposicaoMonta` (`exposicoes_monta`): `estacaoId`; `femeaId` → Animal; `dataInicio` date; `dataFim` date nulo; `motivoFim` varchar nulo com `ESTACAO_ENCERRADA`, `SAIU_DO_PASTO`, `SAIU_DO_REBANHO`; auditoria e cancelamento, em backend/src/reproducao/entities/exposicao-monta.entity.ts
- [X] T007 [P] Criar a entidade `ExcecaoEstacao` (`excecoes_estacao_monta`): `estacaoId`, `femeaId`, `motivo` varchar(200) obrigatório, em backend/src/reproducao/entities/excecao-estacao.entity.ts
- [X] T008 [P] Criar a entidade `Semen` (`semens`): `fazendaId`, `nomeTouro` varchar obrigatório, `racaId` → Raca nulo, `central` varchar nulo, `doses` int "≥ 0"; auditoria, em backend/src/reproducao/entities/semen.entity.ts
- [X] T009 [P] Criar a entidade `Inseminacao` (`inseminacoes`): `femeaId`, `data` date, `tipo` enum `IA`/`IATF`, `semenId` → Semen, `aplicadoPorTipo` enum `USUARIO`/`VETERINARIO` com `aplicadoPorUsuarioId`/`aplicadoPorVeterinarioId` nulos; auditoria e cancelamento, em backend/src/reproducao/entities/inseminacao.entity.ts
- [X] T010 [P] Criar a entidade `DiagnosticoGestacao` (`diagnosticos_gestacao`): `femeaId`, `data` date, `resultado` enum `PRENHE`/`VAZIA`/`PERDA`, `metodo` enum `TOQUE`/`ULTRASSOM` nulo ("obrigatório se resultado ≠ PERDA"), `idadeGestacionalDias` int nulo ("> 0; só com PRENHE"), `motivo` varchar nulo ("obrigatório com PERDA"), `feitoPorTipo` + `feitoPorUsuarioId`/`feitoPorVeterinarioId` nulos, `sessaoId` uuid nulo; auditoria e cancelamento, em backend/src/reproducao/entities/diagnostico-gestacao.entity.ts
- [X] T011 Registrar as entidades T005–T010 no `TypeOrmModule.forFeature` de backend/src/reproducao/reproducao.module.ts, subir o backend e conferir que as tabelas foram criadas (depende de T005–T010)
- [X] T012 [P] Escrever testes de aptidão (fêmea ativa Matriz/Novilha, não Prenha, último parto há ≥ 45 dias; recusa macho, Prenha, parida há 20 dias, fora do rebanho) em backend/src/reproducao/dominio/aptidao.spec.ts
- [X] T013 Implementar a função pura `estaApta(femea, ultimoParto, hoje)` (R4, FR-003) em backend/src/reproducao/dominio/aptidao.ts até T012 passar
- [X] T014 Implementar `SituacaoService.listarAptas(fazendaId, filtro)` (ativas do pasto/categoria + último parto de cada uma + `estaApta`) em backend/src/reproducao/situacao.service.ts
- [X] T015 [P] Adicionar formatadores: idade gestacional (dias ↔ "3 meses e 22 dias", 30 dias por mês, R10), status reprodutivo, resultado de diagnóstico, base da previsão (`INSEMINACAO`/`TOQUE`/`ESTACAO` → "pela inseminação"/"estimada pelo toque"/"estimada pela estação") em frontend/src/utils/formatadores.ts

**Checkpoint**: entidades criadas, aptidão testada; as histórias podem começar

---

## Phase 3: User Story 1 - Estação de monta natural (Priority: P1) 🎯 MVP

**Goal**: abrir, alimentar e encerrar estações de monta com um touro, e as exposições terminarem sozinhas quando a fêmea ou o touro sai

**Independent Test**: quickstart.md, cenário 1

### Tests for User Story 1

- [X] T016 [P] [US1] Testes do `EstacaoService`: abre com marcados + exceções com motivo; recusa touro que não é Touro ativo da fazenda (FR-008); recusa touro já em estação aberta (409, FR-005); recusa lista que não bate com as aptas do pasto ("a lista mudou"); inclui fêmeas numa estação aberta (FR-006); encerra recusando saída anterior à entrada (FR-004) e fecha exposições abertas; dono cancela estação e exposições; em backend/src/reproducao/estacao.service.spec.ts
- [X] T017 [P] [US1] Testes do gancho `encerrarExposicoesPorSaida` (implementado como função de `backend/src/reproducao/saida.ts`, testes em backend/src/reproducao/saida.spec.ts): fêmea que muda de pasto tem exposição encerrada com `SAIU_DO_PASTO`; fêmea vendida/morta com `SAIU_DO_REBANHO`; touro que sai do pasto ou do rebanho encerra a estação (`TOURO_SAIU_DO_PASTO`/`TOURO_SAIU_DO_REBANHO`); em backend/src/reproducao/situacao.service.spec.ts

### Implementation for User Story 1

- [X] T018 [P] [US1] Criar os DTOs `AbrirEstacaoDto` (`touroId`, `pastoId`, `dataEntrada`, `femeaIds[]`, `excecoes[{femeaId, motivo}]` com motivo obrigatório, máx. 500 itens), `IncluirFemeasDto`, `EncerrarEstacaoDto`, `EditarEstacaoDto`, `CancelarDto` (`motivo` obrigatório) em backend/src/reproducao/dto/estacao.dto.ts
- [X] T019 [US1] Implementar `EstacaoService` (abrir, incluir fêmeas, encerrar, listar com nº de expostas, detalhar, editar e cancelar) em transação, até T016 passar, em backend/src/reproducao/estacao.service.ts
- [X] T020 [US1] Implementar o gancho `encerrarExposicoesPorSaida(manager, saida)` como função pura sobre a transação (R7; desvio do plano: função em vez de método de serviço, para os módulos de movimentação, lote e animal não dependerem do módulo de reprodução pelo Nest) até T017 passar, em backend/src/reproducao/situacao.service.ts; exportar `SituacaoService` em backend/src/reproducao/reproducao.module.ts
- [X] T021 [US1] Chamar o gancho dentro das transações de saída: `mover` em backend/src/movimentacao-pasto/movimentacao-pasto.service.ts, `pastoEmLote` em backend/src/manejo-lote/manejo-lote.service.ts e `alterarStatus` em backend/src/animal/animal.service.ts (importando `ReproducaoModule` nos módulos), ajustando os specs existentes desses três serviços
- [X] T022 [US1] Adicionar ao controller as rotas de estação do contrato (`GET /estacoes`, `GET /estacoes/:id`, `GET /estacoes/aptas`, `POST /estacoes`, `POST /estacoes/:id/femeas`, `POST /estacoes/:id/encerrar`, e `@Roles(DONO)` em `PATCH /estacoes/:id`, `POST /estacoes/:id/cancelar`, `POST /exposicoes/:id/cancelar`) em backend/src/reproducao/reproducao.controller.ts
- [X] T023 [P] [US1] Implementar as funções de estação no cliente em frontend/src/api/reproducao.ts
- [X] T024 [US1] Criar a lista de estações (abertas e encerradas, touro, pasto, período, nº de expostas, botão "Nova estação") em frontend/src/pages/reproducao/Estacoes.tsx
- [X] T025 [US1] Criar a abertura de estação: touro (só Touros ativos), pasto, data; carregar aptas; todas marcadas; desmarcar pede motivo; confirmar com `Aviso` "Estação aberta com N fêmeas. M ficaram de fora" em frontend/src/pages/reproducao/NovaEstacao.tsx
- [X] T026 [US1] Criar o detalhe da estação: exposições com início, fim e motivo do fim; incluir fêmeas; encerrar com data de saída; editar e cancelar visíveis só para o dono, em frontend/src/pages/reproducao/EstacaoDetalhe.tsx

**Checkpoint**: US1 funciona sozinha (quickstart, cenário 1)

---

## Phase 4: User Story 2 - Diagnóstico de gestação (Priority: P1)

**Goal**: registrar prenhe/vazia vaca a vaca e em lote, e perda de gestação, mantendo o status reprodutivo correto

**Independent Test**: quickstart.md, cenário 2 (sem os itens de previsão) e cenário 6

### Tests for User Story 2

- [X] T027 [P] [US2] Testes do `DiagnosticoService`: prenhe → status Prenha; vazia → Vazia; idade gestacional só com PRENHE (400 caso contrário); recusa macho e animal fora do rebanho (FR-017); lote cria um registro por fêmea com a mesma data, método e quem fez; perda só de Prenha, com motivo, volta para Vazia (FR-016); dono cancela o último diagnóstico e o status é recalculado pelo evento anterior; em backend/src/reproducao/diagnostico.service.spec.ts

### Implementation for User Story 2

- [X] T028 [P] [US2] Criar os DTOs `DiagnosticoDto`, `DiagnosticoLoteDto` (`resultados[{femeaId, resultado, idadeGestacionalDias?}]`, máx. 500), `PerdaDto` (`motivo` obrigatório), `EditarDiagnosticoDto` em backend/src/reproducao/dto/diagnostico.dto.ts
- [X] T029 [US2] Implementar `DiagnosticoService` (registrar, registrar em lote, perda, editar e cancelar pelo dono, `recalcularStatus(manager, femeaId)` a partir do diagnóstico ou parto válido mais recente, R3) até T027 passar, em backend/src/reproducao/diagnostico.service.ts
- [X] T030 [US2] Implementar `SituacaoService.situacao(fazendaId, animalId)` com status, situação derivada (exposta ao touro X desde, inseminada em, prenha, vazia, lactante apta em) e espaço para a previsão (preenchido na US3), em backend/src/reproducao/situacao.service.ts
- [X] T031 [US2] Adicionar ao controller `POST /diagnosticos`, `POST /diagnosticos/lote`, `GET /diagnosticos/grupo`, `POST /perdas`, `GET /animais/:id/situacao`, e `@Roles(DONO)` em `PATCH /diagnosticos/:id` e `POST /diagnosticos/:id/cancelar`, em backend/src/reproducao/reproducao.controller.ts
- [X] T032 [P] [US2] Implementar as funções de diagnóstico e situação no cliente em frontend/src/api/reproducao.ts
- [X] T033 [US2] Criar o diagnóstico em lote: grupo (pasto/categoria); por fêmea, botões Prenhe/Vazia de 44 px e idade gestacional opcional em meses e dias; método e quem fez uma vez só; `Aviso` "N prenhes e M vazias registradas", em frontend/src/pages/reproducao/DiagnosticoLote.tsx
- [X] T034 [US2] Adicionar ao Manejo o bloco "Reprodução" (situação da fêmea e diagnóstico rápido Prenhe/Vazia com idade gestacional opcional) em frontend/src/pages/Manejo.tsx (FR-027)

**Checkpoint**: US1 e US2 funcionam juntas e separadas

---

## Phase 5: User Story 3 - Previsão de parto e vacas a parir (Priority: P2)

**Goal**: cada prenhe com data prevista de parto e a base usada, e o relatório de vacas a parir

**Independent Test**: quickstart.md, cenários 2 (previsão) e 3

### Tests for User Story 3

- [ ] T035 [P] [US3] Testes da previsão de parto (R5, FR-018): com inseminação usa a data dela + gestação; com idade gestacional usa diagnóstico − idade + gestação; sem idade usa o meio da união das exposições anteriores ao diagnóstico (exposição aberta termina no diagnóstico); raça sem gestação usa 285 dias; devolve a base usada; em backend/src/reproducao/dominio/previsao-parto.spec.ts

### Implementation for User Story 3

- [ ] T036 [US3] Implementar a função pura `calcularPrevisaoParto(...)` até T035 passar, em backend/src/reproducao/dominio/previsao-parto.ts
- [ ] T037 [US3] Incluir `previsaoParto: { data, base }` na resposta de `SituacaoService.situacao` em backend/src/reproducao/situacao.service.ts
- [ ] T038 [US3] Implementar `RelatorioService.vacasAParir(fazendaId, dias)` (prenhes com previsão até hoje + dias e atrasadas, com touro/sêmen e pasto; janela limitada a 7–90) e a rota `GET /relatorio/vacas-a-parir` em backend/src/relatorio/relatorio.service.ts e backend/src/relatorio/relatorio.controller.ts, com teste em backend/src/relatorio/relatorio.service.spec.ts
- [ ] T039 [US3] Criar o relatório "Vacas a parir" (janela 7/15/30/60/90 dias, atrasados destacados, base da previsão) em frontend/src/pages/relatorios/RelatorioVacasAParir.tsx e incluí-lo em `TIPOS` de frontend/src/pages/Relatorios.tsx

**Checkpoint**: previsão visível no Manejo e no relatório

---

## Phase 6: User Story 4 - Parto ligado à cobertura (Priority: P2)

**Goal**: o parto reconhece a cobertura, preenche o pai quando só há um candidato, aceita novilha e ajusta o status da mãe

**Independent Test**: quickstart.md, cenário 4

### Tests for User Story 4

- [ ] T040 [P] [US4] Testes dos candidatos a pai (R6): coberturas cuja concepção estimada cai em `data do parto − gestação ± 21 dias`; ignora canceladas; devolve touros e sêmens; em backend/src/reproducao/dominio/candidatos-pai.spec.ts
- [ ] T041 [P] [US4] Testes novos do `PartoService`: aceita Novilha e a muda para Matriz (FR-031); mãe com cria viva → Lactante, natimorto → Vazia (FR-022); um candidato preenche `paiId` (touro) ou `paiSemenId` (sêmen) nas crias; dois candidatos deixam o pai vazio e gravam os candidatos; dono define o pai só entre os candidatos (FR-021); em backend/src/parto/parto.service.spec.ts

### Implementation for User Story 4

- [ ] T042 [P] [US4] Criar a entidade `PartoCandidatoPai` (`parto_candidatos_pai`: `partoId`, `touroId` nulo, `semenId` nulo, "um dos dois preenchido") em backend/src/reproducao/entities/parto-candidato-pai.entity.ts e registrá-la no módulo
- [ ] T043 [US4] Adicionar `paiSemenId` (uuid → Semen, nulo) em backend/src/animal/entities/animal.entity.ts e `inseminacaoId` (uuid → Inseminacao, nulo) com a relação `candidatos` em backend/src/parto/entities/parto.entity.ts
- [ ] T044 [US4] Implementar a função pura `encontrarCandidatosPai(...)` até T040 passar, em backend/src/reproducao/dominio/candidatos-pai.ts
- [ ] T045 [US4] Alterar `PartoService.create` (novilha → matriz, status da mãe, candidatos, pai das crias, `inseminacaoId`) e adicionar `definirPai` até T041 passar, em backend/src/parto/parto.service.ts; rota `PATCH /parto/:id/pai` com `@Roles(DONO)` em backend/src/parto/parto.controller.ts; `GET /parto` devolvendo candidatos e pai
- [ ] T046 [US4] Permitir escolher Novilha prenhe como mãe e mostrar o pai previsto antes de salvar em frontend/src/pages/NovoParto.tsx
- [ ] T047 [US4] Mostrar o pai das crias e, quando indefinido, os candidatos com o botão "Definir pai" (só dono) em frontend/src/pages/AnimalDetalhe.tsx

**Checkpoint**: ciclo completo cobertura → diagnóstico → parto

---

## Phase 7: User Story 5 - Inseminação artificial (Priority: P3)

**Goal**: cadastro de sêmen com estoque e registro de IA/IATF

**Independent Test**: quickstart.md, cenário 5

### Tests for User Story 5

- [ ] T048 [P] [US5] Testes do `InseminacaoService`: baixa uma dose; sêmen sem dose → 409 (FR-011); recusa fêmea não apta; aplicador validado na fazenda; entrada de doses > 0 (FR-012); dono cancela e a dose volta; dono exclui sêmen nunca usado e recebe 409 se já usado; em backend/src/reproducao/inseminacao.service.spec.ts

### Implementation for User Story 5

- [ ] T049 [P] [US5] Criar os DTOs `SemenDto`, `EntradaDosesDto` (`doses` > 0), `InseminacaoDto`, `EditarInseminacaoDto` em backend/src/reproducao/dto/inseminacao.dto.ts
- [ ] T050 [US5] Implementar `InseminacaoService` com baixa atômica `UPDATE ... SET doses = doses - 1 WHERE id = :id AND doses > 0` (R8) até T048 passar, em backend/src/reproducao/inseminacao.service.ts
- [ ] T051 [US5] Adicionar as rotas de sêmen e inseminação do contrato (`DELETE /semens/:id`, `PATCH /inseminacoes/:id` e `POST /inseminacoes/:id/cancelar` com `@Roles(DONO)`) em backend/src/reproducao/reproducao.controller.ts
- [ ] T052 [P] [US5] Implementar as funções de sêmen e inseminação no cliente em frontend/src/api/reproducao.ts
- [ ] T053 [US5] Criar a tela de sêmen (lista com doses, cadastrar, entrada de doses, excluir só dono) em frontend/src/pages/reproducao/Semens.tsx
- [ ] T054 [US5] Criar a tela de inseminação (fêmea apta, data, IA/IATF, sêmen com doses, aplicado por com o usuário logado preenchido) em frontend/src/pages/reproducao/Inseminacao.tsx, com link para Sêmen

**Checkpoint**: IA/IATF disponível sem atrapalhar quem só usa monta natural

---

## Phase 8: User Story 6 - Indicadores reprodutivos (Priority: P3)

**Goal**: taxa de prenhez, vacas vazias e intervalo entre partos

**Independent Test**: quickstart.md, cenário 7

### Tests for User Story 6

- [ ] T055 [P] [US6] Testes da taxa de prenhez (R12): primeiro diagnóstico não cancelado depois do início da cobertura e em até 300 dias; taxa = prenhes ÷ (prenhes + vazias); sem diagnóstico e "saíram" contadas à parte; em backend/src/reproducao/dominio/taxa-prenhez.spec.ts

### Implementation for User Story 6

- [ ] T056 [US6] Implementar a função pura `calcularTaxaPrenhez(...)` até T055 passar, em backend/src/reproducao/dominio/taxa-prenhez.ts
- [ ] T057 [US6] Implementar `indicadoresReprodutivos` (por estação/touro e por sêmen; intervalo entre partos por matriz e média, FR-029) e `vacasVazias` (FR-030) com as rotas `GET /relatorio/indicadores-reprodutivos` e `GET /relatorio/vacas-vazias` em backend/src/relatorio/relatorio.service.ts e backend/src/relatorio/relatorio.controller.ts, com testes em backend/src/relatorio/relatorio.service.spec.ts
- [ ] T058 [P] [US6] Criar o relatório de indicadores em frontend/src/pages/relatorios/RelatorioIndicadoresReprodutivos.tsx
- [ ] T059 [P] [US6] Criar o relatório de vacas vazias em frontend/src/pages/relatorios/RelatorioVacasVazias.tsx
- [ ] T060 [US6] Incluir os dois relatórios em `TIPOS` de frontend/src/pages/Relatorios.tsx

**Checkpoint**: todas as histórias funcionando

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: histórico consolidado, documentação e validação final

- [ ] T061 Implementar `SituacaoService.historico(fazendaId, animalId)` (exposições, inseminações, diagnósticos, perdas e partos em ordem de data, com flag `cancelado`, FR-023), rota `GET /animais/:id/historico` e teste, em backend/src/reproducao/situacao.service.ts e backend/src/reproducao/reproducao.controller.ts
- [ ] T062 Mostrar a linha do tempo reprodutiva (cancelados riscados, com motivo) em frontend/src/pages/AnimalDetalhe.tsx
- [ ] T063 [P] Formatar com Prettier os arquivos novos de backend/src/reproducao/ e conferir `npm test`, `npx tsc --noEmit`, `npm run lint` (backend) e `tsc -b`, `eslint src` (frontend)
- [ ] T064 [P] Marcar a seção 3 como concluída em docs/modulos/Planejamento-modulos.md
- [ ] T065 Executar o roteiro completo de specs/001-cobertura-inseminacao/quickstart.md no navegador, em largura de celular, numa fazenda de teste isolada, registrando o que não pôde ser verificado

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (1)** → **Foundational (2)** → histórias (3–8) → **Polish (9)**

### User Story Dependencies

- **US1 (P1)**: depende só da fase 2
- **US2 (P1)**: depende só da fase 2 (a situação "exposta" aparece quando US1 existe, mas não é obrigatória)
- **US3 (P2)**: depende de US2 (diagnóstico); usa exposições (US1) e inseminações (US5) quando existirem
- **US4 (P2)**: depende da fase 2 (entidades de cobertura); o teste completo pede US1 e US2
- **US5 (P3)**: depende só da fase 2
- **US6 (P3)**: depende de US1 e US2 para ter dados; os relatórios funcionam com tabelas vazias

### Within Each User Story

- Testes escritos antes e falhando → DTOs → service → rotas → cliente da API → telas
- Commit ao fim de cada história, depois de o dono testar (fluxo da constituição)

### Parallel Opportunities

- Fase 2: T005–T010 (uma entidade por arquivo), T012 e T015
- Em cada história: o teste [P] e os DTOs [P] juntos; o cliente da API [P] junto com as rotas
- US1, US2 e US5 podem andar em paralelo depois da fase 2

---

## Parallel Example: User Story 1

```text
Task: "T016 Testes do EstacaoService em backend/src/reproducao/estacao.service.spec.ts"
Task: "T017 Testes do gancho de saída em backend/src/reproducao/situacao.service.spec.ts"
Task: "T018 DTOs de estação em backend/src/reproducao/dto/estacao.dto.ts"
```

---

## Implementation Strategy

### MVP First (US1 + US2)

1. Fases 1 e 2
2. US1 (estação) e US2 (diagnóstico): as duas P1, que já cobrem o dia a dia da fazenda de
   referência, na monta natural
3. **Parar e validar**: quickstart, cenários 1, 2 e 6; o dono testa e aprova o commit

### Incremental Delivery

1. MVP (US1 + US2) → teste → commit
2. US3 (previsão) + US4 (parto) → teste → commit
3. US5 (inseminação) → teste → commit
4. US6 (indicadores) + fase 9 → quickstart completo → commit

---

## Notes

- [P] = arquivos diferentes, sem dependência pendente
- Cada história é testável sozinha pelo cenário indicado do quickstart
- Nada de excluir registros de reprodução (exceto sêmen nunca usado); correções só pelo dono
- Dados de teste sempre numa fazenda de teste isolada (princípio V)
