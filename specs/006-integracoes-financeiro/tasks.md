---

description: "Tarefas da feature 006: integrações dos módulos com o Financeiro"
---

# Tasks: Integrações dos módulos com o Financeiro

**Input**: Design documents from `/specs/006-integracoes-financeiro/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/api.md, quickstart.md

**Tests**: incluídos (constituição, princípio V). Jest com repositórios simulados.

**Organization**: tarefas agrupadas por história da spec (US1 a US3).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: pode rodar em paralelo (arquivos diferentes, sem dependência pendente)
- **[Story]**: história da spec (US1 a US3)

## Convenções

- Nenhum módulo pago importa outro: a ligação é só pelos ganchos de `common/ganchos-modulos.ts` (R1).
- O Financeiro age só com ele e o módulo de origem ATIVOS no momento; o gancho roda na transação de
  quem emite (erro desfaz tudo).
- Migration nova: primeiro na cópia (backup novo, contagens, `migration:generate` vazio); depois no dev.
- Ao terminar cada fase: testes, tipos e lint do backend e do frontend.

---

## Phase 1: Setup

- [X] T001 Backup novo do dev (`~/backup_antes_integracoes.dump`), recriar `controle_fazenda_copia` e anotar as contagens

---

## Phase 2: Foundational

- [X] T002 [P] Testes de backend/src/common/ganchos-modulos.spec.ts (registrar, emitir em ordem, erro sobe, limpar) e implementar backend/src/common/ganchos-modulos.ts com os eventos `leiteRecebido`, `leiteRecebimentoDesfeito`, `nutricaoCompraValorada`, `nutricaoEntradaCancelada` (R1)
- [X] T003 [P] `OrigemLancamento` + `LEITE`, `NUTRICAO`; colunas `origemId uuid` nulo e `origemCaminho varchar(200)` nulo e índice `(origem, origem_id)` em backend/src/modulos/financeiro/entities/lancamento.entity.ts; `lancarNaTransacao` aceita origemId e origemCaminho
- [X] T004 [P] Entidade `RecebimentoLeite` (`recebimentos_leite`: mes char(7), data, litros decimal(10,1), totalCalculadoCentavos int, valorRecebidoCentavos int, observacao varchar(200) nula, auditoria e cancelamento; único parcial `(fazenda_id, mes) WHERE cancelado = false`) em backend/src/modulos/leite/entities/recebimento-leite.entity.ts
- [X] T005 [P] Coluna `categoriaDespesaId uuid` nula em backend/src/modulos/nutricao/entities/insumo.entity.ts
- [X] T006 Gerar a migration `Integracoes`; aplicar na cópia (contagens iguais, `migration:generate` vazio) e depois no dev
- [X] T007 [P] Testes do ouvinte do Financeiro em backend/src/modulos/financeiro/ganchos-financeiro.spec.ts: só age com Financeiro e origem ATIVOS; `leiteRecebido` lança receita em VENDA_LEITE com origem LEITE; `nutricaoCompraValorada` usa a categoria do insumo se for de despesa, ativa e da fazenda/padrão, senão RACAO_SAL ou OUTRAS_DESPESAS pelo tipo; desfeito/cancelada cancela o lançamento da origem (nada se não houver)
- [X] T008 Implementar backend/src/modulos/financeiro/ganchos-financeiro.ts (registra no `onModuleInit`; `FinanceiroModule` importa `AcessoModule`) até T007 passar; `buscarEditavel` recusa LEITE e NUTRICAO com a mensagem de onde corrigir

**Checkpoint**: tabelas, ganchos e ouvinte prontos

---

## Phase 3: User Story 1 - Recebimento do leite vira receita (P1) 🎯 MVP

- [X] T009 [P] [US1] Testes do `RecebimentosService` em backend/src/modulos/leite/recebimentos.service.spec.ts: previsto do mês (litros, total, entregas sem preço); confirmar com entrega sem preço → 400 `ENTREGAS_SEM_PRECO`; data futura ou antes do mês → 400; mês já recebido → 409; valor padrão = total; emite `leiteRecebido` na transação; desfazer com motivo emite `leiteRecebimentoDesfeito`; outra fazenda → 404
- [X] T010 [US1] Implementar `RecebimentosService` e `RecebimentosController` (`@Roles(DONO)`; rotas do contrato) até T009 passar; teste de papéis do Leite com as rotas novas
- [X] T011 [US1] Trava `MES_RECEBIDO` (409) no `EntregasService` (criar, editar — mês antigo e novo —, cancelar, preço, preço do mês) com teste em entregas.service.spec.ts
- [X] T012 [US1] Tela: caixa "Recebimento do mês" em frontend/src/modulos/leite/RecebimentoDoMes.tsx usada por Entregas.tsx (dono): previsto, entregas sem preço, data e valor recebido, confirmar, diferença, desfazer com motivo; mensagem de mês travado nas ações das entregas

---

## Phase 4: User Story 2 - Compras da Nutrição viram despesa (P1) 🎯 MVP

- [X] T013 [P] [US2] Testes em backend/src/modulos/nutricao/integracao.spec.ts: entrada de COMPRA com valor emite `nutricaoCompraValorada` com categoria do insumo, descrição "Insumo — quantidade unidade (fornecedor)" e caminho; produção própria não emite; informar preço emite; cancelar entrada de compra emite `nutricaoEntradaCancelada`; tudo em transação
- [X] T014 [US2] Implementar a emissão em `MovimentosService` (entrada e cancelar) e `CustoService.informarPreco`, com transações, até T013 passar
- [X] T015 [US2] `categoriaDespesaId` no `EditarInsumoDto` e na lista do dono (`InsumosService`)
- [X] T016 [US2] Tela: "Categoria no Financeiro" na página do insumo (dono, Financeiro ativo), com as categorias de despesa do Financeiro, em frontend/src/modulos/nutricao/InsumoDetalhe.tsx

**Checkpoint**: MVP — leite e compras caem no Financeiro

---

## Phase 5: User Story 3 - Ver de onde veio cada lançamento (P2)

- [X] T017 [US3] Filtro `origem` em `GET /lancamentos` e `origem`/`origemCaminho` na resposta (`LancamentosService`), com teste
- [X] T018 [US3] Tela de lançamentos do Financeiro: rótulo da origem, link para a tela de origem, filtro por origem e o aviso de duplicidade uma vez por sessão (R6) em frontend/src/modulos/financeiro/Lancamentos.tsx

---

## Phase 6: Polish

- [X] T019 [P] Atualizar docs/modulos/Planejamento-modulos.md (fase 3 e seção 5.4 concluídas; cabeçalho com o estado atual) e backend/src/modulos/README.md (ganchos entre módulos)
- [X] T020 Rodar o quickstart completo na cópia e registrar neste arquivo

---

## Dependencies & Execution Order

- Setup → Foundational → US1 e US2 (independentes entre si) → US3 → Polish

## Implementation Strategy

1. Fases 1 e 2, com a migration na cópia antes do dev
2. US1 e US2 (MVP) → parar e validar; o dono testa e aprova o commit
3. US3 e Polish → quickstart → commit

## Registro do MVP (T001–T016)

- Backend: 509 testes passando (84 suítes); lint sem avisos novos. Frontend: `tsc -b` e `eslint src` sem problemas.
- Cópia (`controle_fazenda_copia`): migration `Integracoes1793838296702` aplicada com contagens iguais e
  `migration:generate` sem mudanças; script dos cenários 1, 2 e 3.2–3.3 do quickstart com 28 verificações, nenhuma falha.
- Tela a 375 px: recebimento do mês confirmado, desfeito e confirmado de novo pela tela de Entregas; categoria no
  Financeiro trocada e salva na página do insumo.
- Ajuste achado na validação: a tela de Entregas passa a abrir o mês do `?mes=AAAA-MM` (o link do lançamento).
- Dev: backup `backup_dev_antes_integracoes.dump`; rebuild aplicou a migration; só mudaram `migrations` (+1) e a
  tabela nova `recebimentos_leite`.

## Registro da US3 e do acabamento (T017–T020)

- `GET /lancamentos?origem=` filtra por origem (valor inválido → 400) e cada lançamento traz `origemCaminho`;
  teste novo em `lancamentos.service.spec.ts` (510 testes, 84 suítes).
- Tela de lançamentos: filtro "Origem", rótulo da origem na linha, link "Ver no Leite"/"Ver na Nutrição" e o aviso
  de duplicidade uma vez por sessão (some ao reabrir a tela). Conferido a 375 px, sem rolagem lateral; o link abre
  as entregas do mês recebido.
- Quickstart completo na cópia: 31 verificações, nenhuma falha.
- Documentação: `docs/modulos/Planejamento-modulos.md` (fase 3 e 5.4 concluídas, cabeçalho atualizado) e
  `backend/src/modulos/README.md` (ganchos dos módulos).

