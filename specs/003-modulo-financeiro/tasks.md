---

description: "Tarefas da feature 003: módulo Financeiro"
---

# Tasks: Módulo Financeiro

**Input**: Design documents from `/specs/003-modulo-financeiro/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/api.md, quickstart.md

**Tests**: incluídos (constituição, princípio V). Jest com repositórios simulados, `*.spec.ts`
ao lado do arquivo; cálculos em funções puras testadas sem banco.

**Organization**: tarefas agrupadas por história da spec (US1 a US4).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: pode rodar em paralelo (arquivos diferentes, sem dependência pendente)
- **[Story]**: história da spec (US1 a US4)
- Caminhos relativos à raiz do repositório

## Convenções que valem para todas as tarefas

- Valores em reais sempre em **centavos inteiros** na API e no banco (research R1).
- Todo controller do Financeiro com `@Modulo(ModuloPago.FINANCEIRO)`; os de valores com
  `@Roles(PapelUsuario.DONO)` na classe; só os de uso aceitam funcionário e nunca devolvem valor.
- Registro de outra fazenda → 404; ids de rota com `ParseUUIDPipe`.
- Migration nova: **primeiro na cópia** (`controle_fazenda_copia`, recriada a partir de um
  `pg_dump` novo do dev), contagens e `migration:generate` vazio; só depois no dev.
- Telas: celular primeiro, toque ≥ 44 px, `Aviso`, `formatarReais`.
- Ao terminar cada fase: `npm test`, `npx tsc --noEmit`, `npm run lint` (backend); `tsc -b`,
  `eslint src` (frontend).

---

## Phase 1: Setup (Shared Infrastructure)

- [X] T001 Fazer um backup novo do dev (`pg_dump -Fc` em `~/backup_antes_financeiro.dump`), recriar `controle_fazenda_copia` a partir dele e anotar as contagens por tabela no scratchpad
- [X] T002 [P] Criar `formatarReais(centavos)` ("R$ 1.250,00") e `centavosDeTexto(texto)` (aceita "1250", "1.250,00", "1250,5") em frontend/src/utils/formatadores.ts
- [X] T003 [P] Remover backend/src/modulos/financeiro/exemplo.controller.ts e tirá-lo do `FinanceiroModule` (FR-003); ajustar o teste de marcação se precisar

---

## Phase 2: Foundational (Blocking Prerequisites)

- [X] T004 [P] Entidade `CategoriaFinanceira` (`categorias_financeiras`: fazendaId nulo = padrão, tipo RECEITA/DESPESA, nome varchar(60), codigo nulo, ativa) em backend/src/modulos/financeiro/entities/categoria-financeira.entity.ts
- [X] T005 [P] Entidade `Lancamento` (`lancamentos`: tipo, data, valorCentavos int, categoriaId, descricao varchar(200), animalId/pastoId nulos, origem MANUAL/VENDA/COMPRA/USO, vendaId/compraId/registroUsoId nulos, auditoria e cancelamento) em backend/src/modulos/financeiro/entities/lancamento.entity.ts
- [X] T006 [P] Entidades `VendaAnimais` (`vendas_animais`) e `ItemVenda` (`itens_venda`, com categoriaNaVenda, pesoKg decimal(6,2), arrobas decimal(7,2), valorCentavos, pastoAnteriorId, pesagemId) em backend/src/modulos/financeiro/entities/
- [X] T007 [P] Entidades `CompraAnimal` (`compras_animais`, animalId único) e `RegistroUso` (`registros_uso`, situação AGUARDANDO/LANCADO/DESCARTADO) em backend/src/modulos/financeiro/entities/
- [X] T008 Gerar a migration `Financeiro` em backend/src/database/migrations/ e acrescentar o `INSERT` das 10 categorias padrão com os códigos do data-model.md; aplicar na cópia (contagens iguais, `migration:generate` vazio) e depois no dev
- [X] T009 [P] Testes de `calcularVenda` (R5): por arroba (450 kg, 15 kg/@, R$ 300,00 → 30,00 @ e 900000 centavos); lote com pesos diferentes; categoria sem referência usa 15 kg; valor total dividido por peso com a soma exata; valor total sem pesos em partes iguais; preço médio da arroba; em backend/src/modulos/financeiro/dominio/calculo-venda.spec.ts
- [X] T010 Implementar `calcularVenda` até T009 passar, em backend/src/modulos/financeiro/dominio/calculo-venda.ts
- [X] T011 [P] Testes de `registrarSaidaDoRebanho` (status, data, motivo, fecha permanência, tira do pasto, encerra exposições) e `voltarAoRebanho` (ATIVO, limpa data e motivo, nova permanência no pasto informado) em backend/src/animal/saida-do-rebanho.spec.ts
- [X] T012 Extrair de `AnimalService.alterarStatus` a função `registrarSaidaDoRebanho(manager, ...)` e criar `voltarAoRebanho(manager, ...)` em backend/src/animal/saida-do-rebanho.ts até T011 passar; `alterarStatus` passa a usar a função (testes atuais do animal continuam passando)
- [X] T013 Extrair o cadastro de `AnimalService.create` para `criarAnimal(manager, fazendaId, usuarioId, dto)` em backend/src/animal/criar-animal.ts, usado pelo service (testes atuais continuam passando)
- [X] T014 Registrar as entidades no `FinanceiroModule` (importando o que precisar do pacote inicial, nunca o contrário) em backend/src/modulos/financeiro/financeiro.module.ts
- [X] T015 [P] Criar frontend/src/modulos/financeiro/api.ts com os tipos do contrato e as funções de cada rota
- [X] T016 Fazer `RotaDeModulo` abrir `FinanceiroInicio` (com sub-rotas) quando o Financeiro estiver ATIVO ou SO_CONSULTA, mantendo a vitrine para não contratado, em frontend/src/modulos/vitrine/RotaDeModulo.tsx e frontend/src/App.tsx; `FinanceiroInicio` mostra ao dono saldo do mês e atalhos, e ao funcionário só "Registrar uso"

**Checkpoint**: tabelas, cálculo e funções do pacote inicial prontos

---

## Phase 3: User Story 1 - Lançar receitas e despesas (Priority: P1) 🎯 MVP

**Goal**: lançamentos com categorias, saldo do mês e cancelamento

**Independent Test**: quickstart.md, cenário 1

- [X] T017 [P] [US1] Testes do `CategoriasService`: lista padrões + da fazenda; cria; nome repetido sem acento → 409; padrão não renomeia nem desativa → 400; categoria de outra fazenda → 404; em backend/src/modulos/financeiro/categorias.service.spec.ts
- [X] T018 [P] [US1] Testes do `LancamentosService`: valor ≤ 0 → 400; tipo diferente do da categoria → 400; categoria inativa → 400; animal e pasto juntos → 400; animal de outra fazenda → 404; totais do mês sem cancelados; edição e cancelamento só de MANUAL/USO; cancelado não edita; em backend/src/modulos/financeiro/lancamentos.service.spec.ts
- [X] T019 [US1] Implementar `CategoriasService` e `CategoriasController` (rotas do contrato, dono) até T017 passar
- [X] T020 [US1] Implementar `LancamentosService` e `LancamentosController` (rotas do contrato, dono) até T018 passar
- [X] T021 [P] [US1] Tela `Lancamentos` (mês com setas, filtros de tipo e categoria, receita/despesa/saldo, lista com cancelados riscados, cancelar com motivo; sem botões em só consulta) em frontend/src/modulos/financeiro/Lancamentos.tsx
- [X] T022 [P] [US1] Tela `NovoLancamento` (tipo, valor com teclado numérico, data de hoje, categoria do tipo, descrição, animal ou pasto opcional; edição do mesmo formulário) em frontend/src/modulos/financeiro/NovoLancamento.tsx
- [X] T023 [P] [US1] Tela `Categorias` (padrões travadas, criar, renomear, desativar) em frontend/src/modulos/financeiro/Categorias.tsx

**Checkpoint**: dono lança e acompanha o mês

---

## Phase 4: User Story 2 - Vender animais (Priority: P1) 🎯 MVP

**Goal**: venda com arrobas, saída do rebanho e receita num passo; cancelamento devolve os animais

**Independent Test**: quickstart.md, cenário 2

- [X] T024 [P] [US2] Testes do `VendasService`: registra tudo na mesma transação (venda, itens, pesagem, saída, receita); animal fora do rebanho → 400; animal em outra venda → 409; peso faltando em POR_ARROBA → 400; lote vazio → 400; erro no meio não grava nada; cancelar devolve animais ao pasto anterior e cancela a receita; simular não grava; em backend/src/modulos/financeiro/vendas.service.spec.ts
- [X] T025 [US2] Implementar `VendasService` e `VendasController` (animais disponíveis, simular, registrar com lock dos animais, listar, detalhar, cancelar, venda do animal) até T024 passar (R4)
- [X] T026 [US2] Em `AnimalService.alterarStatus`, recusar VENDIDO com 409 `VENDA_PELO_FINANCEIRO` quando o Financeiro estiver ATIVO (usando `AcessoModulosService`), com teste no spec do animal (FR-016a); morto e descartado inalterados
- [X] T027 [US2] Tela `NovaVenda` em passos (escolher animais com filtro por pasto e categoria; peso de cada um com a última pesagem sugerida; forma e preço; prévia com arrobas e valor; lembrete do brinco com a lista de brincos antes e depois de confirmar — FR-015a) em frontend/src/modulos/financeiro/NovaVenda.tsx, aceitando `?animal=` já escolhido
- [X] T028 [P] [US2] Telas `Vendas` (lista do período) e `VendaDetalhe` (itens, cancelar com motivo) em frontend/src/modulos/financeiro/
- [X] T029 [US2] Na página do animal: dono vê a venda (data, comprador, peso, valor da parte) quando o Financeiro está ativo ou só consulta; funcionário vê só "Vendido em …"; com o Financeiro ativo, a opção "Vendido" leva o dono à `NovaVenda?animal=` e mostra ao funcionário "A venda é registrada pelo dono, no Financeiro" — em frontend/src/pages/AnimalDetalhe.tsx

**Checkpoint**: MVP — lançamentos e vendas

---

## Phase 5: User Story 4 - Registro de uso e compras (Priority: P2)

**Goal**: funcionário registra usos sem valor; compras de animais com valor e pendências para o dono

**Independent Test**: quickstart.md, cenários 3 e 4

- [X] T030 [P] [US4] Testes do `UsosService`: funcionário registra; lista da fazenda sem campo de valor em nenhum item; valorar cria a despesa com descrição "Item — quantidade unidade" e muda para LANCADO; descartar exige motivo; valorar ou descartar só AGUARDANDO; categoria de receita → 400; em backend/src/modulos/financeiro/usos.service.spec.ts
- [X] T031 [P] [US4] Testes do `ComprasService`: compra com valor > 0 cria animal, compra e despesa na mesma transação; 0,00 cria animal e compra sem despesa; compras sem valor = comprados por funcionário depois da primeira liberação e sem compra; informar valor de pendente; animal já com compra → 409; em backend/src/modulos/financeiro/compras.service.spec.ts
- [X] T032 [US4] Implementar `UsosService` e `UsosController` (listar e registrar para todos; valorar e descartar com `@Roles(DONO)` no método) até T030 passar
- [X] T033 [US4] Implementar `ComprasService` e `ComprasController` (usa `criarAnimal`) e `GET /pendencias` até T031 passar
- [X] T034 [P] [US4] Telas `RegistrarUso` (item, quantidade, unidade com sugestões, categoria, data, animal/pasto) e `Usos` (lista da fazenda com quem registrou e situação, sem valores) em frontend/src/modulos/financeiro/
- [X] T035 [P] [US4] Tela `Pendencias` do dono: usos aguardando valor (valorar ou descartar) e compras sem valor (informar valor ou 0,00) em frontend/src/modulos/financeiro/Pendencias.tsx
- [X] T036 [US4] Cadastro de animal: para o dono com o Financeiro ativo e origem "Comprado", campos valor pago (obrigatório, aceita 0,00) e vendedor, enviando para `POST /modulos/financeiro/compras` (FR-016b), em frontend/src/pages/NovoAnimal.tsx
- [X] T037 [US4] Aviso no painel inicial do dono, com o Financeiro ativo e compras sem valor: "Funcionários cadastraram N animais comprados sem valor · informe o valor de compra para o balanço da fazenda", com link para Pendências, a cada login (FR-016c), em frontend/src/pages/Dashboard.tsx

**Checkpoint**: funcionário participa sem ver dinheiro; nenhuma compra fica sem valor sem o dono saber

---

## Phase 6: User Story 3 - Ver o resultado (Priority: P2)

**Goal**: receita × despesa por mês, despesas por categoria e vendas

**Independent Test**: quickstart.md, cenário 5

- [X] T038 [P] [US3] Testes das agregações puras: lucro por mês, totais do período, percentuais somando 100%, preço médio da arroba só com itens com peso, cancelados fora; em backend/src/modulos/financeiro/dominio/resultado.spec.ts
- [X] T039 [US3] Implementar `resultado.ts` e o `ResultadoService`/`ResultadoController` (mensal, despesas por categoria, vendas; período padrão 12 meses, máximo 36) até T038 passar
- [X] T040 [P] [US3] Gráficos em SVG (barras agrupadas receita × despesa com lucro; linha do preço médio da arroba; barras horizontais por categoria), legíveis em 375 px e com a tabela de números abaixo, em frontend/src/modulos/financeiro/graficos/
- [X] T041 [US3] Tela `Resultado` com período e as três seções em frontend/src/modulos/financeiro/Resultado.tsx

**Checkpoint**: todas as histórias funcionando

---

## Phase 7: Polish & Cross-Cutting Concerns

- [X] T042 [P] Teste de papéis: percorre os controllers do Financeiro e exige `@Roles(DONO)` em toda rota, exceto `GET /usos`, `GET /usos/categorias` e `POST /usos` (R7, SC-006), em backend/src/modulos/financeiro/papeis.spec.ts
- [X] T043 [P] Marcar a seção 5 de docs/modulos/Planejamento-modulos.md como concluída, com as decisões do clarify
- [X] T044 Prettier nos arquivos novos do backend; `npm test`, `tsc --noEmit`, `lint`, `tsc -b`, `eslint src`
- [X] T045 Executar o quickstart.md completo em 375 px, em fazenda de teste na cópia, registrando aqui o que não pôde ser verificado

---

## Dependencies & Execution Order

- **Setup (1)** → **Foundational (2)** → histórias
- **US1 (3)** e **US2 (4)** dependem da fase 2; US2 usa a categoria "Venda de animais" e os lançamentos da US1
- **US4 (5)** depende da US1 (lançamentos) e de `criarAnimal` (fase 2)
- **US3 (6)** depende de US1 e US2 para ter dados; as rotas funcionam com tabelas vazias
- **Polish (7)** por último

### Parallel Opportunities

- T004–T007 (entidades); T009 e T011 (testes de domínio e do pacote inicial)
- T017/T018 (testes US1); T021–T023 (telas US1)
- T030/T031 (testes US4); T034/T035 (telas US4)
- T038 e T040

---

## Parallel Example: Phase 2

```text
Task: "T004 Entidade CategoriaFinanceira"
Task: "T005 Entidade Lancamento"
Task: "T006 Entidades VendaAnimais e ItemVenda"
Task: "T007 Entidades CompraAnimal e RegistroUso"
```

---

## Implementation Strategy

### MVP First (US1 + US2)

1. Setup e fase 2, com a migration validada na cópia antes do dev
2. US1 (lançamentos) e US2 (vendas): já cobrem o dinheiro do dia a dia e a principal receita
3. **Parar e validar**: quickstart, cenários 1 e 2; o dono testa e aprova o commit

### Incremental Delivery

1. MVP → teste → commit
2. US4 (usos e compras) → teste → commit
3. US3 (resultado) + fase 7 → quickstart completo → commit

## Registro do MVP (T001–T029, 2026-11-04)

- Migration `Financeiro1793801995961`: 6 tabelas + 10 categorias padrão; aplicada primeiro na
  cópia e depois no dev, com contagens antigas idênticas e `migration:generate` sem mudanças.
- Desvio da T013: em vez de extrair `criarAnimal`, o `AnimalService.create` recebeu um callback
  opcional `depoisDeCriar(manager, animal)` que roda na mesma transação; a compra (US4) usa isso,
  sem o pacote inicial importar o Financeiro.
- T029: o frontend não tinha tela de mudança de status; o bloqueio do "Vendido" com o Financeiro
  ativo fica no backend (409), e a página do animal ganhou o bloco "Venda" (dono: "Vender este
  animal" e os dados da venda; funcionário: só "Vendido em …").
- 328 testes no backend. Validação na cópia: 25 verificações pela API (lançamentos, categorias,
  venda por arroba e por valor total, cancelamento devolvendo ao pasto, 409 do pacote inicial,
  403 do funcionário, 404 de outra fazenda) e, nas telas em 375 px, despesa "1.350,50", venda a
  partir da página do animal com peso sugerido, prévia, lembrete do brinco antes e depois, venda
  na página do animal (dono) e só a data para o funcionário.

## Registro de US4, US3 e acabamento (T030–T045, 2026-11-04)

- 347 testes no backend (19 novos: usos, compras, resultado e o teste de papéis, que percorre
  todas as rotas do Financeiro e exige DONO em todas, menos `GET /usos`, `GET /usos/categorias`
  e `POST /usos`).
- Quickstart na cópia, cenários 3 a 6, pela API (19 verificações): usos sem valor para o
  funcionário, dono valoriza ("Diesel — 40 litros") e descarta; compra com valor e com 0,00;
  2 compras do funcionário pendentes e resolvidas; resultado de 12 meses batendo com os
  lançamentos, percentuais somando 100%, preço médio da arroba conferido à mão
  ((9.000,00 + 9.061,30) ÷ 59,23 @ = R$ 304,93); desativado = só consulta para o dono e sem
  registro de uso para o funcionário.
- Nas telas, em 375 px: aviso de pendências no painel do dono; Pendências com valor da compra
  "2.400,00" e do uso "85,90"; Resultado com 12 barras, categorias e a linha da arroba, sem
  rolagem lateral; campo "Valor pago" no cadastro só para o dono; funcionário registra "Sal
  mineral, 10 sacos" sem ver nenhum R$.
- Não verificado: aparência visual dos gráficos (a janela do Claude estava oculta; as telas foram
  conferidas pelo texto e pela estrutura da página).
- Desvio: o cadastro de compra usa o campo "Procedência" do formulário como vendedor.
