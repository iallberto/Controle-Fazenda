---

description: "Tarefas da feature 004: módulo Leite"
---

# Tasks: Módulo Leite

**Input**: Design documents from `/specs/004-modulo-leite/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/api.md, quickstart.md

**Tests**: incluídos (constituição, princípio V). Jest com repositórios simulados, `*.spec.ts`
ao lado do arquivo; regras em funções puras testadas sem banco.

**Organization**: tarefas agrupadas por história da spec (US1 a US5).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: pode rodar em paralelo (arquivos diferentes, sem dependência pendente)
- **[Story]**: história da spec (US1 a US5)
- Caminhos relativos à raiz do repositório

## Convenções que valem para todas as tarefas

- Todo controller do Leite com `@Modulo(ModuloPago.LEITE)`, cada controller no seu arquivo
  `.controller.ts` (teste de marcação); rotas de preço com `@Roles(PapelUsuario.DONO)`.
- O pacote inicial **não importa** `modulos/leite`: fala com ele só pelos ganchos (research R1).
- Registro de outra fazenda → 404; ids de rota com `ParseUUIDPipe`; datas `AAAA-MM-DD`, nunca
  futuras onde o data-model diz; litros com uma casa decimal; dinheiro em centavos inteiros.
- Migration nova: **primeiro na cópia** (`controle_fazenda_copia`, recriada a partir de um
  `pg_dump` novo do dev), contagens e `migration:generate` vazio; só depois no dev.
- Telas: celular primeiro, toque ≥ 44 px, `Aviso`, sem rolagem lateral.
- Ao terminar cada fase: `npm test`, `npx tsc --noEmit`, `npm run lint` (backend); `tsc -b`,
  `eslint src` (frontend).

---

## Phase 1: Setup (Shared Infrastructure)

- [X] T001 Fazer um backup novo do dev (`pg_dump -Fc` em `~/backup_antes_leite.dump`), recriar `controle_fazenda_copia` a partir dele e anotar as contagens por tabela no scratchpad
- [X] T002 [P] Remover backend/src/modulos/leite/exemplo.controller.ts e tirá-lo do `LeiteModule` (FR-003); ajustar o teste de marcação se precisar
- [X] T003 [P] Mover `GraficoMensal` e `GraficoLinha` de frontend/src/modulos/financeiro/graficos/ para frontend/src/components/graficos/ e ajustar os imports do Financeiro (R11)

---

## Phase 2: Foundational (Blocking Prerequisites)

- [X] T004 [P] Testes do registro de ganchos: registrar, emitir na ordem, erro de um gancho propaga, `limpar()` para testes; em backend/src/common/ganchos-rebanho.spec.ts
- [X] T005 Implementar backend/src/common/ganchos-rebanho.ts (objeto do módulo, sem DI) com os eventos `partoRegistrado`, `partoAlterado`, `saidaDoRebanho`, `tratamentoGravado` e seus tipos (R1), até T004 passar
- [X] T006 Emitir os ganchos no pacote inicial, dentro da transação e com o `manager`: `PartoService.create` e `update` (backend/src/parto/parto.service.ts), `registrarSaidaDoRebanho` (backend/src/animal/saida-do-rebanho.ts), `TratamentoService.create` e `update` (backend/src/tratamento/tratamento.service.ts; o create passa a usar transação), `ManejoLoteService.tratamentoEmLote` por animal (backend/src/manejo-lote/manejo-lote.service.ts); acrescentar um teste de emissão em cada spec existente
- [X] T007 [P] Coluna `leiteira boolean default false` em backend/src/raca/entities/raca.entity.ts e no DTO; `RACAS_PADRAO` ganha Holandesa 280, Girolando 285, Jersey 279, Gir 290 com `leiteira: true` (as de corte `false`) em backend/src/raca/raca.service.ts; o dono marca `leiteira` nas raças da fazenda (FR-004a, FR-030); teste no raca.service.spec.ts
- [X] T008 [P] Coluna `vacaDeLeite` enum `PELA_RACA | SIM | NAO` default `PELA_RACA` em backend/src/animal/entities/animal.entity.ts (sem alterar DTOs do pacote inicial)
- [X] T009 [P] Entidades do Leite em backend/src/modulos/leite/entities/: `ConfiguracaoLeite` (fazendaId PK, modo POR_VACA/TANQUE, ordenhasPorDia 1–3, prazoSecagemDias 30–90, janelaSecarDias 1–60), `Lactacao` (inicio, origem PARTO/MANUAL, partoId nulo, fim nulo, motivoFim SECAGEM/SAIDA/NOVO_PARTO nulo; único parcial `(animal_id) WHERE fim IS NULL`), `Ordenha` (data, turno smallint, tipo VACA/TANQUE, animalId/lactacaoId nulos, litros decimal(7,1), descarte; únicos parciais do data-model; índice `(fazenda_id, data)`)
- [X] T010 [P] Entidades em backend/src/modulos/leite/entities/: `ProdutoLeite` (nome varchar(80), carenciaLeiteDias smallint 0–120, ativo), `CarenciaLeite` (tratamentoId único, animalId, produtoId, data, carenciaDias, dataFim), `Secagem` (lactacaoId, data, observacao varchar(200) nulo, cancelamento), `EntregaLeite` (data, litros decimal(8,1), precoLitroCentavos int nulo, observacao varchar(200) nulo, cancelamento), `AnaliseLeite` (mes char(7), entregaId nulo, ccsMil/cbtMil int nulos, gordura/proteina decimal(4,2) nulos, cancelamento); todas com auditoria
- [X] T011 Gerar a migration `Leite` em backend/src/database/migrations/ (8 tabelas + `racas.leiteira` + `animais.vaca_de_leite`, com `UPDATE racas SET leiteira = true` nas 4 leiteiras padrão se já existirem); aplicar na cópia (contagens iguais, `migration:generate` vazio) e depois no dev
- [X] T012 [P] Testes das funções de domínio em backend/src/modulos/leite/dominio/: `ehVacaDeLeite` (SIM, NAO, PELA_RACA com raça leiteira, sem raça, macho), `calcularDel`, `secagemPlanejada` (parto previsto − prazo; sem previsão → null), `carenciaAte(carencias, data)` (maior dataFim que cobre a data), `turnoPelaHora(hora, ordenhasPorDia)`, `validarLitros` (0–80, acima exige confirmação)
- [X] T013 Implementar as funções de domínio até T012 passar, em backend/src/modulos/leite/dominio/
- [X] T014 Registrar entidades e serviços no `LeiteModule` (importando o que precisar do pacote inicial: animal, parto, reprodução, tratamento) em backend/src/modulos/leite/leite.module.ts; `ConfiguracaoLeiteService` (cria com padrão na primeira leitura) e `ConfiguracaoLeiteController` (`GET`, `PATCH` só dono)
- [X] T015 [P] Criar frontend/src/modulos/leite/api.ts com os tipos do contrato e as funções de cada rota
- [X] T016 Fazer `RotaDeModulo` abrir `LeiteRotas` quando o Leite estiver ATIVO ou SO_CONSULTA, mantendo a vitrine para não contratado, em frontend/src/modulos/vitrine/RotaDeModulo.tsx; `LeiteInicio` com atalhos (Ordenha, Vacas, A secar, Entregas, Produção) e a tela `ConfiguracaoLeite` (dono)

**Checkpoint**: tabelas, ganchos e regras de domínio prontos

---

## Phase 3: User Story 1 - Lactação e ordenha do dia (Priority: P1) 🎯 MVP

**Goal**: lactação começa no parto da vaca de leite ou à mão; ordenha por vaca ou tanque

**Independent Test**: quickstart.md, cenários 1 e 2

- [X] T017 [P] [US1] Testes dos ganchos de lactação: parto de vaca de leite com Leite ATIVO ou SO_CONSULTA abre lactação (vivo e natimorto); vaca de corte ou Leite não contratado não abre; lactação aberta é encerrada no dia anterior com NOVO_PARTO; `partoAlterado` move o início; `saidaDoRebanho` encerra com SAIDA; em backend/src/modulos/leite/ganchos-leite.spec.ts
- [X] T018 [US1] Implementar backend/src/modulos/leite/ganchos-leite.ts (registra no `onModuleInit` do `LeiteModule`, usa `AcessoModulosService`) até T017 passar
- [X] T019 [P] [US1] Testes do `LactacoesService` e `VacasService`: início manual (data futura → 400; não é vaca de leite → 400; já em lactação → 409; sobreposta → 400); lista de vacas com situação e DEL; `vacaDeLeite` só dono e devolve `partoRecente` (parto há menos de 305 dias, FR-004b); outra fazenda → 404; em backend/src/modulos/leite/lactacoes.service.spec.ts e vacas.service.spec.ts
- [X] T020 [US1] Implementar `LactacoesService`/`LactacoesController` (`POST /lactacoes`) e `VacasService`/`VacasController` (`GET /vacas`, `GET /vacas/:animalId`, `PATCH /vacas/:animalId/vaca-de-leite` dono) até T019 passar
- [X] T021 [P] [US1] Testes do `OrdenhasService`: upsert substitui; litros > 80 sem `confirmarAcima` → 400; data futura → 400; turno acima de `ordenhasPorDia` → 400; vaca sem lactação aberta na data → 400; tanque; turno devolve vacas em lactação por brinco com DEL e litros anteriores; totais do dia `paraTanque`/`descartado`; em backend/src/modulos/leite/ordenhas.service.spec.ts
- [X] T022 [US1] Implementar `OrdenhasService` e `OrdenhasController` (`GET /ordenhas/turno`, `PUT /ordenhas/vaca`, `PUT /ordenhas/tanque`, `GET /ordenhas/dia`) até T021 passar (descarte vem da US2; até lá, false)
- [X] T023 [US1] Tela da ordenha em frontend/src/modulos/leite/Ordenha.tsx (R12): data e turno (padrão pela hora), uma vaca por vez em destaque com brinco grande, nome, DEL e litros anteriores, campo `inputmode="decimal"` com foco automático, "Gravar e próxima", "Pular", confirmação acima de 80 L, lista do turno com lançada/pulada/faltando; modo tanque com campo único; lista vazia mostra "Incluir vaca em lactação"; só consulta sem botões
- [X] T024 [P] [US1] Telas `Vacas.tsx` (em lactação / secas, DEL) e `VacaLeite.tsx` (situação, lactação atual, histórico) em frontend/src/modulos/leite/
- [X] T025 [US1] Bloco do Leite na página do animal em frontend/src/modulos/leite/BlocoLeiteDoAnimal.tsx usado por frontend/src/pages/AnimalDetalhe.tsx (fêmea, Leite ativo ou só consulta): situação e DEL; dono escolhe "vaca de leite" (pela raça/sim/não) com oferta de iniciar na data do parto recente; "Iniciar lactação" com data
- [X] T026 [US1] Marca "Leiteira" nas raças da fazenda na tela de raças do pacote inicial (frontend/src/pages/Configuracao.tsx ou onde as raças são editadas)

**Checkpoint**: vacas entram em lactação e a ordenha do dia é lançada

---

## Phase 4: User Story 2 - Carência de medicamentos (Priority: P1) 🎯 MVP

**Goal**: produtos com carência; tratamento exige produto cadastrado com o Leite ativo; leite da vaca vira descarte

**Independent Test**: quickstart.md, cenário 3

- [X] T027 [P] [US2] Testes do `ProdutosService`: cria; nome repetido sem acento → 409; carência fora de 0–120 → 400; desativa; mudar carência não altera `carencias_leite` existentes; em backend/src/modulos/leite/produtos.service.spec.ts
- [X] T028 [US2] Implementar `ProdutosService` e `ProdutosController` (`GET`, `POST`, `PATCH /produtos`) até T027 passar
- [X] T029 [P] [US2] Testes do gancho `tratamentoGravado`: Leite ATIVO + fêmea + produto sem cadastro → 422 `PRODUTO_SEM_CADASTRO` e nada gravado; produto com carência cria `CarenciaLeite` com `dataFim` = data + dias copiados; carência 0 não cria; correção troca ou remove a carência e recalcula `descarte` das ordenhas da vaca no intervalo afetado; macho ou Leite não ATIVO → nada; em backend/src/modulos/leite/ganchos-leite.spec.ts
- [X] T030 [US2] Implementar a carência no gancho (backend/src/modulos/leite/ganchos-leite.ts) e o `descarte` calculado no `OrdenhasService` ao gravar (vaca em carência na data), até T029 passar; `GET /carencias` (vacas em descarte hoje) em `CarenciasController`
- [X] T031 [US2] Modo tanque com carência (FR-012a): `GET /ordenhas/turno` no modo TANQUE devolve só as vacas em carência; `PUT /ordenhas/vaca` aceita essas vacas no modo TANQUE (sempre descarte); teste no ordenhas.service.spec.ts
- [X] T032 [US2] Faixa "Leite descarte até DD/MM" na Ordenha antes do campo, no modo por vaca e no modo tanque (vacas em carência primeiro), e totais do dia separados (frontend/src/modulos/leite/Ordenha.tsx)
- [X] T033 [US2] Produto do cadastro no tratamento: com o Leite ativo e animal fêmea, frontend/src/pages/NovoTratamento.tsx e o tratamento de frontend/src/pages/ManejoLote.tsx sugerem os produtos do cadastro; no 422 abrem frontend/src/modulos/leite/CadastroRapidoProduto.tsx (nome preenchido, carência) e repetem o envio
- [X] T034 [P] [US2] Tela `Produtos.tsx` (lista, novo, editar, desativar) em frontend/src/modulos/leite/ e lista "Leite em descarte" em frontend/src/pages/Manejo.tsx via frontend/src/modulos/leite/AvisoDescarte.tsx

**Checkpoint**: MVP — lactação, ordenha e carência

---

## Phase 5: User Story 3 - Secagem (Priority: P2)

**Goal**: secagem planejada, vacas a secar, registrar e cancelar secagem

**Independent Test**: quickstart.md, cenário 4

- [X] T035 [P] [US3] Testes do `SecagensService`: registrar encerra a lactação (data futura ou antes do início → 400; sem lactação aberta → 400); cancelar com motivo reabre (lactação mais nova → 409); "a secar" usa `previsoesParto` da reprodução, prazo e janela da configuração, atrasadas primeiro, média de 7 dias; em backend/src/modulos/leite/secagens.service.spec.ts
- [X] T036 [US3] Implementar `SecagensService` e `SecagensController` (`GET /secagens/a-secar`, `POST /secagens`, `POST /secagens/:id/cancelar`) até T035 passar; secagem planejada também em `GET /vacas` e `GET /vacas/:animalId`
- [X] T037 [US3] Tela `ASecar.tsx` em frontend/src/modulos/leite/ e botão "Registrar secagem" (com data) e "Cancelar secagem" em `VacaLeite.tsx` e no bloco do animal

**Checkpoint**: secagem controlada; a ordenha só tem quem dá leite

---

## Phase 6: User Story 4 - Entregas e análises (Priority: P2)

**Goal**: entregas com litros e preço (dono), análises mensais, comparação com o tanque

**Independent Test**: quickstart.md, cenário 5

- [X] T038 [P] [US4] Testes do `EntregasService` e `AnalisesService`: litros ≤ 0 → 400; data futura → 400; total do mês × leite para o tanque e diferença; preço por entrega e do mês (só não canceladas); valor arredondado ao centavo; resposta ao funcionário sem campos de dinheiro; análise sem nenhum valor → 400; cancelamento com motivo; em backend/src/modulos/leite/entregas.service.spec.ts e analises.service.spec.ts
- [X] T039 [US4] Implementar `EntregasService`/`EntregasController` e `AnalisesService`/`AnalisesController` (rotas do contrato; `POST /entregas/:id/preco` e `/entregas/preco-do-mes` dono; preço no `POST /entregas` vindo de funcionário → 403) até T038 passar
- [X] T040 [P] [US4] Teste de papéis em backend/src/modulos/leite/papeis.spec.ts: rotas de preço exigem DONO; `PATCH /configuracao` e `vaca-de-leite` exigem DONO; as demais aceitam os dois papéis
- [X] T041 [US4] Telas `Entregas.tsx` (mês, lista, total × tanque, preço para o dono) e `Analises.tsx` (mês a mês) em frontend/src/modulos/leite/

**Checkpoint**: conferência com o laticínio e qualidade

---

## Phase 7: User Story 5 - Relatórios e curva (Priority: P3)

**Goal**: produção diária e mensal, curva e lactações encerradas

**Independent Test**: quickstart.md, cenário 6

- [ ] T042 [P] [US5] Testes do `ProducaoService`: diário (máx. 92 dias) com paraTanque, descartado, vacas em lactação no dia e média; mensal (padrão 12, máx. 36); curva da vaca com DEL; lactações encerradas com dias e total; em backend/src/modulos/leite/producao.service.spec.ts
- [ ] T043 [US5] Implementar `ProducaoService` e `ProducaoController` (`GET /producao/diaria`, `/producao/mensal`, `GET /vacas/:animalId/curva`, `GET /lactacoes/encerradas`) com SQL agregado (R10) até T042 passar
- [ ] T044 [US5] Tela `Producao.tsx` (gráfico diário e mensal com tabela, usando frontend/src/components/graficos/) e curva da vaca em `VacaLeite.tsx`; modo tanque avisa que não há dados por vaca

**Checkpoint**: todas as histórias funcionando

---

## Phase 8: Polish & Cross-Cutting Concerns

- [ ] T045 [P] Atualizar docs/modulos/Planejamento-modulos.md (seção 4 concluída) e backend/src/modulos/README.md (ganchos do rebanho)
- [ ] T046 Medir os relatórios com um ano de ordenhas de 100 vacas na cópia (< 2 s, SC-006) e a ordenha de 30 vacas em 375 px (SC-001)
- [ ] T047 Rodar o quickstart completo na cópia, em fazenda de teste, e registrar o resultado neste arquivo

---

## Dependencies & Execution Order

- **Setup (1)** → **Foundational (2)** → histórias
- **US1 (3)** depende da fase 2; **US2 (4)** depende da US1 (ordenha e ganchos)
- **US3 (5)** depende da US1; **US4 (6)** só da fase 2 (compara com a ordenha, se houver)
- **US5 (7)** depende da US1 e da US3 para ter dados; as rotas funcionam com tabelas vazias
- **Polish (8)** por último

### Parallel Opportunities

- T002/T003; T007–T010 (colunas e entidades); T004 e T012 (testes)
- T017, T019, T021 (testes US1); T024 com T023
- T027/T029 (testes US2); T034
- T038/T040 (testes US4)

---

## Parallel Example: Phase 2

```text
Task: "T007 Coluna leiteira e raças leiteiras padrão"
Task: "T008 Coluna vacaDeLeite"
Task: "T009 Entidades ConfiguracaoLeite, Lactacao, Ordenha"
Task: "T010 Entidades ProdutoLeite, CarenciaLeite, Secagem, EntregaLeite, AnaliseLeite"
```

---

## Implementation Strategy

### MVP First (US1 + US2)

1. Setup e fase 2, com a migration validada na cópia antes do dev
2. US1 (lactação e ordenha) e US2 (carência): o uso diário no curral e o erro mais caro evitado
3. **Parar e validar**: quickstart, cenários 1 a 3; o dono testa e aprova o commit

### Incremental Delivery

1. MVP → teste → commit
2. US3 (secagem) + US4 (entregas) → teste → commit
3. US5 (relatórios) + fase 8 → quickstart completo → commit

## Registro do MVP (T001–T034, 2026-11-04)

- Migration `Leite1793813977122`: 8 tabelas, `racas.leiteira` e `animais.vaca_de_leite`;
  aplicada primeiro na cópia (contagens antigas idênticas, `migration:generate` sem mudanças) e
  depois no dev. As 4 raças leiteiras padrão (Holandesa 280, Girolando 285, Jersey 279, Gir 290)
  são criadas pelo `RacaService` ao iniciar.
- Ganchos do rebanho (R1) em `common/ganchos-rebanho.ts`, emitidos por parto (registro e
  correção), saída do rebanho, tratamento (criação e correção) e tratamento em lote; o `create`
  do tratamento passou a usar transação.
- Desvios: T012/T013 numa só `dominio/regras.ts`; T026 — o pacote inicial não tem tela de raças,
  então a marca "leiteira" das raças da fazenda ficou na Configuração do Leite (dono); a tela
  "Ordenha do dia" (`OrdenhaDia.tsx`) foi acrescentada para o total por vaca (FR-013); o cadastro
  rápido virou o hook `useProdutoComCarencia` + `CadastroRapidoProduto`, usado no tratamento
  individual, no Manejo e no Manejo em lote; os gráficos movidos ficaram genéricos (séries e
  formatação por parâmetro) e `meses.ts` foi para `utils/`.
- 416 testes no backend (69 novos). Validação na cópia, em fazendas de teste: 47 verificações pela
  API (lactação no parto da vaca de leite e não na Nelore; parto antes da liberação não abre;
  oferta do parto recente ao marcar "sim"; início manual com DEL; 409/400; ordenha substitui,
  confirmação acima de 80 L, data futura, turno, vaca sem lactação; 422 `PRODUTO_SEM_CADASTRO`
  sem gravar nada, inclusive no lote; carência copiada, descarte e recálculo na correção; modo
  tanque; saída encerra a lactação; 403 do funcionário em "vaca de leite" e configuração; 404 de
  outra fazenda; só consulta lê e não lança, e o parto ainda abre lactação) e, nas telas em
  375 px: início, ordenha (gravar e próxima com foco, faixa de descarte, confirmação de 95 L),
  cadastro rápido do produto repetindo o tratamento, "Leite em descarte" no Manejo, bloco do
  Leite na página do animal, vacas, produtos, configuração e ordenha do dia, sem rolagem lateral.

## Registro de US3 e US4 (T035–T041, 2026-11-04)

- Sem migration nova: as tabelas de secagem, entregas e análises já vieram na `Leite`.
- Secagem: `SecagensService` usa `SituacaoService.previsoesParto` da reprodução (o
  `LeiteModule` importa o `ReproducaoModule`) e `ConfiguracaoLeiteService.valores` (lê sem gravar
  o padrão). A secagem planejada também aparece na lista e no detalhe da vaca; o detalhe traz o
  `secagemId` da lactação encerrada por secagem, para o cancelamento.
- Entregas: a resposta ao funcionário não tem nenhum campo de dinheiro (nem preço, nem valor, nem
  total); preço no `POST /entregas` vindo do funcionário → 403; preço por entrega e do mês só dono.
  Análises: pelo menos um valor; de uma entrega, só da fazenda e do mesmo mês.
- Correção encontrada na tela: os litros digitados com ponto de milhar ("1.050,5") eram recusados;
  `litrosDeTexto` passou a aceitar "1.050,5", "12,5" e "12.5".
- 436 testes no backend (20 novos: secagem, entregas, análises e o teste de papéis do Leite, que
  exige DONO só no preço, na configuração e em "vaca de leite"). Validação na cópia, em fazendas de
  teste: 36 verificações pela API (secagem planejada pela idade gestacional do toque com a
  Holandesa de 280 dias, atrasada primeiro, janela de 15 e de 80 dias, média de 7 dias; registrar
  e cancelar a secagem, 400/409; entregas e preço do mês com a conta em centavos; funcionário sem
  dinheiro e 403 no preço; análises; 404 de outra fazenda; só consulta) e, nas telas em 375 px,
  "A secar", registrar e cancelar a secagem na vaca, entregas do dono (lançar, preço do mês
  R$ 2,60 sobre 3.471 L = R$ 9.024,60) e do funcionário (sem nenhum R$), e análises, sem rolagem
  lateral.

