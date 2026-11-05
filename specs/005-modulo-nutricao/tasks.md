---

description: "Tarefas da feature 005: módulo Nutrição"
---

# Tasks: Módulo Nutrição

**Input**: Design documents from `/specs/005-modulo-nutricao/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/api.md, quickstart.md

**Tests**: incluídos (constituição, princípio V). Jest com repositórios simulados, `*.spec.ts`
ao lado do arquivo; regras em funções puras testadas sem banco.

**Organization**: tarefas agrupadas por história da spec (US1 a US4).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: pode rodar em paralelo (arquivos diferentes, sem dependência pendente)
- **[Story]**: história da spec (US1 a US4)
- Caminhos relativos à raiz do repositório

## Convenções que valem para todas as tarefas

- Todo controller da Nutrição com `@Modulo(ModuloPago.NUTRICAO)`, um por arquivo `.controller.ts`;
  rotas **dono** do contrato com `@Roles(PapelUsuario.DONO)`; respostas ao funcionário sem
  `valorCentavos`, `custo*` nem `custoEnsilagemCentavos` (research R7).
- A Nutrição importa só o pacote inicial e os ganchos; não importa Leite nem Financeiro.
- Registro de outra fazenda → 404; ids com `ParseUUIDPipe`; datas não futuras onde o data-model
  diz; quantidades lançadas com `unidadeId`, base calculada no servidor; dinheiro em centavos.
- Migration nova: **primeiro na cópia** (`controle_fazenda_copia`, recriada de um `pg_dump` novo
  do dev), contagens e `migration:generate` vazio; só depois no dev.
- Telas: celular primeiro, toque ≥ 44 px, `Aviso`, sem rolagem lateral.
- Ao terminar cada fase: `npm test`, `npx tsc --noEmit`, `npm run lint` (backend); `tsc -b`,
  `eslint src` (frontend).

---

## Phase 1: Setup (Shared Infrastructure)

- [X] T001 Backup novo do dev (`pg_dump -Fc` em `~/backup_antes_nutricao.dump`), recriar `controle_fazenda_copia` a partir dele e anotar as contagens por tabela no scratchpad
- [X] T002 [P] Remover backend/src/modulos/nutricao/exemplo.controller.ts e tirá-lo do `NutricaoModule` (FR-003); ajustar o teste de marcação se precisar

---

## Phase 2: Foundational (Blocking Prerequisites)

- [X] T003 [P] Entidades `Insumo` (`insumos`: nome varchar(80), tipo enum SILAGEM/RACAO/SAL_MINERAL/NUCLEO/FENO/CONCENTRADO/OUTRO, unidadeBase enum KG/LITRO/UNIDADE, unidadeCompraId nulo, estoqueMinimoBase decimal(14,3) nulo, ativo) e `UnidadeInsumo` (`unidades_insumo`: nome varchar(30) único no insumo, fator decimal(12,4), ativa) em backend/src/modulos/nutricao/entities/
- [X] T004 [P] Entidade `MovimentoInsumo` (`movimentos_insumo`: data, tipo ENTRADA/BAIXA, motivo COMPRA/PRODUCAO/SILO/PERDA/ESTRAGO/DOACAO/OUTRO/FORNECIMENTO, quantidade decimal(12,2), unidadeId, quantidadeBase decimal(14,3), valorCentavos int nulo, aguardandoPreco, fornecedor varchar(120) nulo, observacao varchar(200) nulo, siloId nulo, fornecimentoItemId nulo, auditoria e cancelamento; índices `(fazenda_id, insumo_id, data)` e `(silo_id)`) em backend/src/modulos/nutricao/entities/movimento-insumo.entity.ts
- [X] T005 [P] Entidades `Dieta`/`ItemDieta` (`dietas`, `itens_dieta`: quantidadePorAnimal decimal(12,3), unidadeId), `LoteAlimentacao`/`LoteAnimal` (`lotes_alimentacao`, `lote_animais`: entrada, saida nula; único parcial `(animal_id) WHERE saida IS NULL`), `Fornecimento`/`ItemFornecimento` (`fornecimentos`: data, loteId, animais int, dietaId nulo, cancelamento; `itens_fornecimento`: quantidade, unidadeId, quantidadeBase, siloId nulo) e `Silo` (`silos`: nome varchar(60), tipo TRINCHEIRA/SUPERFICIE/BAG, toneladasEnsiladas decimal(10,2), custoEnsilagemCentavos nulo, fechamento, abertura nula, encerramento nula, entradaId nulo) em backend/src/modulos/nutricao/entities/
- [X] T006 Gerar a migration `Nutricao` em backend/src/database/migrations/; aplicar na cópia (contagens iguais, `migration:generate` vazio) e depois no dev
- [X] T007 [P] Testes das funções de domínio em backend/src/modulos/nutricao/dominio/regras.spec.ts: `paraBase` (quantidade × fator, 3 casas), `unidadesPadrao(base)`, `situacaoEstoque` (NORMAL/BAIXO/NEGATIVO), `noLoteNaData`, `sugestao` (dieta × animais, convertida para a unidade do item), `custoMedio` (entradas com valor até a data), `previsaoSilo` (saldo, média dos últimos 7 dias com baixa, dias e data), `custoPorAnimalDia` (animais-dia contando um por dia de fornecimento)
- [X] T008 Implementar as funções até T007 passar, em backend/src/modulos/nutricao/dominio/regras.ts
- [X] T009 [P] Teste do gancho: `saidaDoRebanho` fecha a participação aberta do animal com `saida = data`; sem lote, nada; em backend/src/modulos/nutricao/ganchos-nutricao.spec.ts
- [X] T010 Implementar backend/src/modulos/nutricao/ganchos-nutricao.ts (registra no `onModuleInit`) até T009 passar; DTOs em backend/src/modulos/nutricao/dto/nutricao.dto.ts; `NutricaoModule` com os providers
- [X] T011 [P] Criar frontend/src/modulos/nutricao/api.ts (tipos do contrato e funções) e `NutricaoContext`
- [X] T012 `RotaDeModulo` abre `NutricaoRotas` com a Nutrição ATIVA ou SO_CONSULTA (vitrine para não contratado), em frontend/src/modulos/vitrine/RotaDeModulo.tsx; `NutricaoInicio` com atalhos (Fornecer, Estoque, Lançar entrada) e avisos

**Checkpoint**: tabelas, regras e gancho prontos

---

## Phase 3: User Story 1 - Insumos e estoque (Priority: P1) 🎯 MVP

**Goal**: insumos com unidades, entradas, baixas, estoque e alerta

**Independent Test**: quickstart.md, cenário 1 (itens 1 a 3)

- [X] T013 [P] [US1] Testes do `InsumosService`: cria com unidades padrão; nome repetido sem acento → 409; SILAGEM só em KG → 400; unidade nova (fator > 0, nome único) e desativar; fator não muda; estoque por insumo com situação e reserva em silos fechados; outra fazenda → 404; em backend/src/modulos/nutricao/insumos.service.spec.ts
- [X] T014 [US1] Implementar `InsumosService` e `InsumosController` (rotas de insumos do contrato; estoque num SQL só) até T013 passar
- [X] T015 [P] [US1] Testes do `MovimentosService`: entrada converte para a base; COMPRA sem valor → aguardando preço; valor vindo do funcionário → 403; baixa OUTRO sem observação → 400; data futura → 400; insumo ou unidade inativos → 400; cancelar avulsa com motivo; cancelar movimento de fornecimento ou silo → 400; histórico do insumo; em backend/src/modulos/nutricao/movimentos.service.spec.ts
- [X] T016 [US1] Implementar `MovimentosService` e `MovimentosController` (`POST /entradas`, `POST /baixas`, `POST /movimentos/:id/cancelar`, `GET /insumos/:id/movimentos`) até T015 passar
- [X] T017 [US1] Telas `Estoque.tsx` (lista com "1.000 kg · 40 sacos", alertas BAIXO/NEGATIVO, reserva em silo), `NovoInsumo.tsx` (dono: nome, tipo, base, mínimo, unidades), `InsumoDetalhe.tsx` (unidades, histórico, cancelar) e `Movimento.tsx` (entrada ou baixa: insumo, unidade da tabela, quantidade com teclado numérico; valor só para o dono) em frontend/src/modulos/nutricao/

**Checkpoint**: estoque confiável

---

## Phase 4: User Story 2 - Dietas, lotes e fornecimento (Priority: P1) 🎯 MVP

**Goal**: lotes com animais, dietas e fornecimento que dá baixa no estoque

**Independent Test**: quickstart.md, cenário 2

- [X] T018 [P] [US2] Testes do `DietasService` e `LotesService`: dieta com itens (um por insumo, insumo ativo, unidade do insumo); substituir itens; lote com nome único; incluir animais (ativos, da fazenda) tira do lote anterior com `saida = data`; remover; animais no lote na data; funcionário inclui e tira, dono cria e escolhe a dieta; em backend/src/modulos/nutricao/lotes.service.spec.ts e dietas.service.spec.ts
- [X] T019 [US2] Implementar `DietasService`/`DietasController` e `LotesService`/`LotesController` (rotas do contrato) até T018 passar
- [X] T020 [P] [US2] Testes do `FornecimentosService`: sugestão = dieta × animais no lote na data (com data passada, os animais daquela data); gravar cria itens e uma baixa por item na mesma transação e guarda os animais; estoque negativo → 409 `ESTOQUE_NEGATIVO` e grava com `confirmarNegativo`; data futura → 400; lote ou insumo de outra fazenda → 404; cancelar cancela os movimentos; em backend/src/modulos/nutricao/fornecimentos.service.spec.ts
- [X] T021 [US2] Implementar `FornecimentosService` e `FornecimentosController` (`GET /fornecimentos/sugestao`, `POST /fornecimentos`, `GET /fornecimentos`, `POST /fornecimentos/:id/cancelar`) até T020 passar
- [X] T022 [US2] Telas `Lotes.tsx` (lista, novo lote do dono, dieta do lote) e `LoteDetalhe.tsx` (animais do lote; incluir pelo filtro de pasto e categoria via `GET /manejo-lote/grupo`, marcar e confirmar; remover) em frontend/src/modulos/nutricao/
- [X] T023 [US2] Tela `Dietas.tsx` (dono: dieta com itens insumo + quantidade por animal + unidade) em frontend/src/modulos/nutricao/
- [X] T024 [US2] Tela `Fornecimento.tsx` (lote lembrado do último trato em `localStorage`, data hoje, animais do dia, quantidades sugeridas editáveis com teclado numérico, tirar ou acrescentar insumo, confirmação do estoque negativo no 409, histórico do dia com cancelar) em frontend/src/modulos/nutricao/

**Checkpoint**: MVP — estoque e trato do dia

---

## Phase 5: User Story 3 - Silo (Priority: P2)

**Goal**: silo como reserva, abertura que lança a entrada, saldo e previsão

**Independent Test**: quickstart.md, cenário 3

- [X] T025 [P] [US3] Testes do `SilosService`: cadastro (insumo SILAGEM em KG, nome único); abrir lança ENTRADA/SILO de toneladas × 1000 kg com o custo da ensilagem, data ≥ fechamento e não futura; cancelar abertura só sem baixas; encerrar; saldo, média dos últimos 7 dias e previsão; fornecimento de silagem com `siloId` de silo aberto do mesmo insumo; em backend/src/modulos/nutricao/silos.service.spec.ts
- [X] T026 [US3] Implementar `SilosService` e `SilosController` (rotas do contrato) até T025 passar; o fornecimento valida e grava o `siloId` (silo aberto do insumo) e a sugestão marca o aberto há mais tempo
- [X] T027 [US3] Tela `Silos.tsx` (lista com situação, saldo, média e "dura mais N dias, até DD/MM"; dono cadastra; abrir e encerrar) e escolha do silo no item de silagem do `Fornecimento.tsx`

**Checkpoint**: silagem controlada

---

## Phase 6: User Story 4 - Preço e custo (Priority: P2)

**Goal**: preço das entradas pelo dono, pendências e custo por lote e por animal-dia

**Independent Test**: quickstart.md, cenários 1 (item 4) e 4

- [X] T028 [P] [US4] Testes: `GET /entradas/aguardando-preco` e `POST /entradas/:id/preco` (só COMPRA, valor > 0); `GET /pendencias`; `GET /custo` (custo médio na data, total por lote, animais-dia com um por dia, custo por animal-dia, parte de cada insumo, insumos sem preço); funcionário sem nenhum campo de dinheiro em todas as respostas; em backend/src/modulos/nutricao/custo.service.spec.ts
- [X] T029 [US4] Implementar preço da entrada, `PendenciasController` e `CustoService`/`CustoController` até T028 passar
- [X] T030 [P] [US4] Teste de papéis em backend/src/modulos/nutricao/papeis.spec.ts: as rotas **dono** do contrato exigem DONO; as demais aceitam os dois papéis
- [X] T031 [US4] Telas `Custo.tsx` (dono: período, lotes lado a lado com custo por animal-dia, barras de insumo por lote, insumos sem preço) e `AguardandoPreco.tsx` (lista e informar valor) em frontend/src/modulos/nutricao/; `AvisoPrecoPendente.tsx` no início da Nutrição e em frontend/src/pages/Dashboard.tsx (dono, Nutrição ativa)

**Checkpoint**: todas as histórias

---

## Phase 7: Polish & Cross-Cutting Concerns

- [ ] T032 [P] Atualizar docs/modulos/Planejamento-modulos.md (seção 6 concluída) e backend/src/modulos/README.md
- [ ] T033 Medir na cópia: 30 insumos e um ano de tratos de 10 lotes (estoque e custo do mês < 2 s, SC-006)
- [ ] T034 Rodar o quickstart completo na cópia, em fazenda de teste, e registrar o resultado neste arquivo

---

## Dependencies & Execution Order

- **Setup (1)** → **Foundational (2)** → histórias
- **US1 (3)** só da fase 2; **US2 (4)** usa insumos e movimentos da US1
- **US3 (5)** depende da US2 (fornecimento de silagem); **US4 (6)** da US1 e da US2
- **Polish (7)** por último

### Parallel Opportunities

- T003–T005 (entidades); T007 e T009 (testes); T011
- T013/T015 (testes US1); T018/T020 (testes US2); T022/T023
- T025, T028 e T030

---

## Implementation Strategy

### MVP First (US1 + US2)

1. Setup e fase 2, com a migration validada na cópia antes do dev
2. US1 (estoque) e US2 (lotes, dietas e trato): o uso diário do depósito e do cocho
3. **Parar e validar**: quickstart, cenários 1 e 2; o dono testa e aprova o commit

### Incremental Delivery

1. MVP → teste → commit
2. US3 (silo) + US4 (preço e custo) → teste → commit
3. Fase 7 → quickstart completo → commit

## Registro do MVP (T001–T024, 2026-11-04)

- Migration `Nutricao1793834436181`: 10 tabelas; aplicada primeiro na cópia (contagens antigas
  idênticas, `migration:generate` sem mudanças) e depois no dev. Pacote inicial sem mudança de
  código: a Nutrição só registra o gancho `saidaDoRebanho`.
- Desvios: o estoque mínimo do insumo é informado na unidade base (`estoqueMinimo`), não com
  `unidadeMinimoId`; os itens da dieta e da sugestão do trato vêm em ordem de nome do insumo
  (a ordem de gravação não é garantida); `RotaDeModulo` deixou de ter a página de espera e as
  funções de exemplo da fase 0, porque os três módulos têm telas; a escolha do silo no trato e a
  validação do silo aberto já entraram no fornecimento (a US3 completa o cadastro e a abertura).
- 475 testes no backend (32 novos da Nutrição). Validação na cópia, em fazendas de teste: 30
  verificações pela API (não contratada → 403; exemplo removido; papéis no cadastro de insumo, lote
  e dieta; kg e tonelada prontos, saco de 25 kg; 409 nome repetido; silagem só em kg; 40 sacos =
  1.000 kg aguardando preço; funcionário com valor → 403 e sem custo nas respostas; baixa por perda e
  OUTRO sem observação; cancelar entrada recalcula; entrada futura; 20 vacas pelo filtro do Manejo em
  lote, troca de lote tira do anterior; sugestão 500/80/3 kg; 409 `ESTOQUE_NEGATIVO` e gravação com
  confirmação; trato futuro; cancelar devolve ao estoque; animal morto sai do lote; 404 de outra
  fazenda; só consulta) e, nas telas em 375 px (funcionário): trato com 19 animais e sugestão, aviso
  de estoque negativo com "Lançar mesmo assim", estoque "794 kg · 31,76 saco" e negativo em
  destaque, lote com o filtro de pasto e categoria, entrada sem campo de valor — sem nenhum R$ e sem
  rolagem lateral.

## Registro de US3 e US4 (T025–T031, 2026-11-04)

- Sem migration nova: silos e preço usam as tabelas da `Nutricao`.
- Silo: abrir lança a entrada `SILO` de toneladas × 1000 kg com o custo da ensilagem como valor;
  toneladas e custo só mudam com o silo fechado; cancelar a abertura só sem silagem fornecida
  (409); encerrar é do dono. A lista traz consumido, saldo, média dos últimos 7 dias com baixa e
  previsão.
- Custo: `CustoService` (rotas só do dono) com preço da entrada, aguardando preço, pendências e
  custo por lote (custo médio na data, animais-dia contando um por dia, parte de cada insumo com a
  unidade base); a lista de tratos traz o custo de cada um só para o dono. Aviso de entradas
  aguardando preço no início da Nutrição e no painel inicial (dono, Nutrição ativa).
- Correção feita na tela: as quantidades do relatório de custo vinham sem unidade; agora vêm com a
  unidade base do insumo.
- 487 testes no backend (12 novos: silos, custo e o teste de papéis da Nutrição). Validação na
  cópia, em fazenda de teste: 19 verificações pela API (403 do funcionário no cadastro e
  encerramento do silo, no preço, nas pendências e no custo; silo de insumo que não é silagem →
  400; reserva de 30 t e disponível zero; abrir antes do fechamento → 400; abrir lança 30.000 kg e
  custo médio R$ 0,20/kg; 10 dias de 300 kg → saldo 27 t, média 300 kg/dia, 90 dias; cancelar
  abertura com silagem fornecida → 409; trato com silo fechado → 400; ração sem preço listada; com
  R$ 3.200,00 nos 40 sacos, custo do lote R$ 1.240,00 em 100 animais-dia = R$ 12,40 por animal-dia,
  ração 51,6% e silagem 48,4%; custo de cada trato só para o dono; silo encerrado no histórico) e,
  nas telas em 375 px (dono): aviso de preço pendente no painel, silos com reserva e encerrado,
  custo do mês com barras por insumo, informar preço pela lista — sem rolagem lateral.

