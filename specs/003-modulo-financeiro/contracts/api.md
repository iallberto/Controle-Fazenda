# API Contracts: Módulo Financeiro

Prefixo `/modulos/financeiro`. Todo controller tem `@Modulo(FINANCEIRO)` (spec 002): `GET` é
consulta (vale em ATIVO e SO_CONSULTA), o resto é lançamento (só ATIVO). Valores em **centavos
inteiros**. Fazenda sempre do token; registro de outra fazenda → 404. Datas `AAAA-MM-DD`.

**Dono** = `@Roles(DONO)`; funcionário recebe 403 nessas rotas (FR-002). Só as rotas de
**uso** aceitam funcionário, e nenhuma delas devolve valor em reais.

---

## Categorias (dono)

| Método e rota | Corpo / query | Resposta |
|---|---|---|
| `GET /categorias` | `?tipo=RECEITA\|DESPESA&incluirInativas=` | padrões + da fazenda, ordenadas por nome |
| `POST /categorias` | `{ tipo, nome }` | 201; 409 nome repetido |
| `PATCH /categorias/:id` | `{ nome?, ativa? }` | só categoria da fazenda; 400 em padrão |

## Lançamentos (dono)

| Método e rota | Corpo / query | Resposta |
|---|---|---|
| `GET /lancamentos` | `?mes=AAAA-MM&tipo=&categoriaId=` | `{ lancamentos[], receitaCentavos, despesaCentavos, saldoCentavos }` do mês (cancelados na lista, fora dos totais) |
| `POST /lancamentos` | `{ tipo, data, valorCentavos, categoriaId, descricao, animalId?, pastoId? }` | 201; 400 valor ≤ 0, tipo ≠ tipo da categoria, animal e pasto juntos |
| `PATCH /lancamentos/:id` | `{ data?, valorCentavos?, categoriaId?, descricao? }` | só origem MANUAL ou USO; 400 se cancelado |
| `POST /lancamentos/:id/cancelar` | `{ motivo }` | só origem MANUAL ou USO; venda e compra mudam pela própria rota |

## Vendas de animais (dono)

| Método e rota | Corpo / query | Resposta |
|---|---|---|
| `GET /vendas/animais-disponiveis` | `?pastoId=&categoria=` | animais ativos com brinco, categoria, pasto, última pesagem e kg da arroba da categoria |
| `POST /vendas/simular` | mesmo corpo do registrar | `{ itens[{ animalId, arrobas, valorCentavos }], arrobasTotal, valorTotalCentavos }` — nada é gravado; `POST` por ser cálculo, conta como lançamento no guard |
| `POST /vendas` | `{ data, comprador, forma, precoArrobaCentavos?, valorTotalCentavos?, observacao?, itens[{ animalId, pesoKg? }] }` | 201 venda com itens e brincos; 400 animal fora do rebanho, peso faltando em POR_ARROBA, lote vazio; 409 animal em outra venda |
| `GET /vendas` | `?de=&ate=` | lista com total, quantidade e situação |
| `GET /vendas/:id` | | venda + itens (brinco, categoria, peso, arrobas, valor) |
| `POST /vendas/:id/cancelar` | `{ motivo }` | cancela receita e devolve animais (FR-015) |
| `GET /vendas/animal/:animalId` | | venda não cancelada do animal ou 404 (página do animal, FR-016) |

## Compras de animais (dono)

| Método e rota | Corpo / query | Resposta |
|---|---|---|
| `POST /compras` | dados do cadastro do animal (os mesmos de `POST /animal`, origem COMPRADO) + `{ valorCentavos (≥ 0), vendedor? }` | 201 animal criado + compra; despesa quando valor > 0 (FR-016b) |
| `GET /compras/sem-valor` | | animais comprados cadastrados por funcionário sem compra (FR-016c): brinco, categoria, data da compra, quem cadastrou |
| `POST /compras/animal/:animalId` | `{ valorCentavos (≥ 0), vendedor? }` | registra a compra de um animal pendente; despesa quando valor > 0 |

## Pendências e resultado (dono)

| Método e rota | Resposta |
|---|---|
| `GET /pendencias` | `{ usosAguardando, comprasSemValor }` (contagens para os avisos) |
| `GET /resultado/mensal?de=AAAA-MM&ate=AAAA-MM` | `{ meses[{ mes, receitaCentavos, despesaCentavos, lucroCentavos }], totais }` (padrão 12 meses, máximo 36) |
| `GET /resultado/despesas-por-categoria?de=&ate=` | `[{ categoria, valorCentavos, percentual }]` do maior ao menor |
| `GET /resultado/vendas?de=&ate=` | `{ totalCentavos, animais, porCategoria[{ categoria, animais, valorCentavos }], arrobaPorMes[{ mes, precoMedioArrobaCentavos, arrobas }] }` |

## Registros de uso (dono e funcionário)

| Método e rota | Quem | Corpo / query | Resposta (**sem valores**) |
|---|---|---|---|
| `GET /usos` | todos | `?situacao=` | registros da fazenda: data, item, quantidade, unidade, categoria, animal/pasto, quem registrou, situação |
| `GET /usos/categorias` | todos | | só nomes das categorias de despesa ativas (para o funcionário escolher) |
| `POST /usos` | todos | `{ data, item, quantidade, unidade, categoriaId, animalId?, pastoId? }` | 201 |
| `POST /usos/:id/valorar` | dono | `{ valorCentavos }` (> 0) | lança a despesa; registro → LANCADO; 400 se não AGUARDANDO |
| `POST /usos/:id/descartar` | dono | `{ motivo }` | registro → DESCARTADO |

---

## Pacote inicial (comportamento novo)

| Rota | Mudança |
|---|---|
| `PATCH /animal/:id/status` | com o Financeiro ATIVO, `status: VENDIDO` → **409** `{ codigo: 'VENDA_PELO_FINANCEIRO', message: 'Com o Financeiro ativo, a venda é registrada no Financeiro' }` (FR-016a); morto e descartado sem mudança |

## Removido

- `GET` e `POST /modulos/financeiro/exemplo` (rotas de exemplo da fase 0, FR-003).
