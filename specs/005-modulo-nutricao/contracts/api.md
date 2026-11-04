# API Contracts: Módulo Nutrição

Prefixo `/modulos/nutricao`. Todo controller com `@Modulo(NUTRICAO)`: `GET` é consulta, o resto é
lançamento. Fazenda do token; registro de outra fazenda → 404. Datas `AAAA-MM-DD`; dinheiro em
centavos; quantidades com `unidadeId`.

**Papéis (FR-002)**: rotas marcadas **dono** exigem DONO. Respostas ao funcionário não têm
`valorCentavos`, `custo*` nem `custoEnsilagemCentavos`.

## Insumos

| Método e rota | Corpo / query | Resposta |
|---|---|---|
| `GET /insumos` | `?incluirInativos=` | insumos com unidades, estoque na base e na unidade de compra, mínimo, alerta (BAIXO, NEGATIVO), reserva em silos fechados; dono: custo médio atual |
| `POST /insumos` (dono) | `{ nome, tipo, unidadeBase, estoqueMinimo?, unidadeMinimoId? }` | 201 com as unidades padrão |
| `PATCH /insumos/:id` (dono) | `{ nome?, estoqueMinimo?, unidadeMinimoId?, unidadeCompraId?, ativo? }` | |
| `POST /insumos/:id/unidades` (dono) | `{ nome, fator }` | 201; 409 nome repetido |
| `PATCH /insumos/:id/unidades/:unidadeId` (dono) | `{ ativa }` | fator não muda |
| `GET /insumos/:id/movimentos` | `?de=&ate=` | histórico (entradas, baixas, fornecimentos), mais novo primeiro |

## Entradas e baixas

| Método e rota | Corpo / query | Resposta |
|---|---|---|
| `POST /entradas` | `{ insumoId, data, quantidade, unidadeId, motivo: COMPRA\|PRODUCAO, fornecedor?, observacao?, valorCentavos? }` | 201; valor do funcionário → 403; COMPRA sem valor → aguardando preço |
| `POST /baixas` | `{ insumoId, data, quantidade, unidadeId, motivo: PERDA\|ESTRAGO\|DOACAO\|OUTRO, observacao? }` | 201; OUTRO sem observação → 400 |
| `POST /movimentos/:id/cancelar` | `{ motivo }` | entrada ou baixa avulsa; de fornecimento/silo → 400 (cancela pela origem) |
| `GET /entradas/aguardando-preco` (dono) | | entradas de compra sem valor |
| `POST /entradas/:id/preco` (dono) | `{ valorCentavos }` | |
| `GET /pendencias` (dono) | | `{ entradasAguardandoPreco, insumosAbaixoDoMinimo }` |

## Dietas e lotes

| Método e rota | Corpo / query | Resposta |
|---|---|---|
| `GET /dietas` | | dietas com itens e os lotes que as usam |
| `POST /dietas` (dono) | `{ nome, itens[{ insumoId, quantidadePorAnimal, unidadeId }] }` | 201 |
| `PUT /dietas/:id` (dono) | `{ nome, itens[] }` | substitui itens |
| `PATCH /dietas/:id` (dono) | `{ ativa }` | |
| `GET /lotes` | `?incluirInativos=` | lotes com dieta e número de animais hoje |
| `GET /lotes/:id` | `?data=` | lote com os animais (brinco, categoria, pasto) na data |
| `POST /lotes` (dono) | `{ nome, dietaId? }` | 201 |
| `PATCH /lotes/:id` (dono) | `{ nome?, dietaId?, ativo? }` | |
| `POST /lotes/:id/animais` | `{ animalIds[], data? }` | inclui (tira de outro lote); 400 animal inativo |
| `POST /lotes/:id/animais/remover` | `{ animalIds[], data? }` | fecha a participação |

## Fornecimento

| Método e rota | Corpo / query | Resposta |
|---|---|---|
| `GET /fornecimentos/sugestao` | `?loteId=&data=` | `{ lote, animais, dieta, itens[{ insumoId, nome, unidade, quantidade, estoqueBase, silos[] }] }` |
| `POST /fornecimentos` | `{ loteId, data, itens[{ insumoId, quantidade, unidadeId, siloId? }], confirmarNegativo? }` | 201; 409 `ESTOQUE_NEGATIVO { insumos[] }` sem confirmação |
| `GET /fornecimentos` | `?de=&ate=&loteId=` | lista; dono: custo de cada |
| `POST /fornecimentos/:id/cancelar` | `{ motivo }` | devolve ao estoque |

## Silos

| Método e rota | Corpo / query | Resposta |
|---|---|---|
| `GET /silos` | | silos com situação, consumido, saldo, média 7 dias, previsão (dias e data) |
| `POST /silos` (dono) | `{ nome, tipo, insumoId, toneladasEnsiladas, fechamento, custoEnsilagemCentavos? }` | 201 |
| `PATCH /silos/:id` (dono) | `{ nome?, toneladasEnsiladas?, custoEnsilagemCentavos? }` | |
| `POST /silos/:id/abrir` | `{ data }` | lança a entrada de produção própria |
| `POST /silos/:id/cancelar-abertura` | `{ motivo }` | só sem baixas do silo |
| `POST /silos/:id/encerrar` (dono) | `{ data }` | |

## Custo (dono)

| Método e rota | Resposta |
|---|---|
| `GET /custo?de=&ate=&loteId=` | `{ lotes[{ loteId, nome, totalCentavos, animaisDia, porAnimalDiaCentavos, insumos[{ nome, base, totalCentavos, percentual }] }], insumosSemPreco[] }` |

## Pacote inicial

- Gancho `saidaDoRebanho`: a Nutrição fecha a participação do animal no lote (R4).

## Removido

- `GET` e `POST /modulos/nutricao/exemplo` (fase 0).
