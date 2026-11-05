# API Contracts: Integrações com o Financeiro

Mudanças nas rotas dos módulos. Valores em centavos; só o dono vê dinheiro.

## Leite — recebimento do mês (dono)

| Método e rota | Corpo / query | Resposta |
|---|---|---|
| `GET /modulos/leite/recebimentos` | `?mes=AAAA-MM` | `{ mes, recebimento: { id, data, litros, totalCalculadoCentavos, valorRecebidoCentavos, diferencaCentavos, observacao } \| null, previsto: { litros, totalCalculadoCentavos, entregasSemPreco[] } }` |
| `POST /modulos/leite/recebimentos` | `{ mes, data, valorRecebidoCentavos?, observacao? }` | 201; 400 `ENTREGAS_SEM_PRECO { entregas[] }`; 400 data futura ou antes do mês; 409 mês já recebido |
| `POST /modulos/leite/recebimentos/:id/desfazer` | `{ motivo }` | cancela; o Financeiro cancela a receita |

**Entregas (comportamento novo)**: com recebimento em vigor no mês, `POST /entregas`,
`PATCH /entregas/:id`, `POST /entregas/:id/cancelar`, `POST /entregas/:id/preco` e
`POST /entregas/preco-do-mes` → **409** `{ codigo: 'MES_RECEBIDO', message: 'O leite deste mês já foi recebido: desfaça o recebimento para corrigir' }`.

## Nutrição — categoria do insumo (dono)

| Método e rota | Corpo | Resposta |
|---|---|---|
| `PATCH /modulos/nutricao/insumos/:id` | `+ { categoriaDespesaId?: uuid \| null }` | a lista de insumos traz `categoriaDespesaId` para o dono |

Entradas de compra com valor e preço informado emitem o evento; cancelar emite o cancelamento.

## Financeiro

| Rota | Mudança |
|---|---|
| `GET /modulos/financeiro/lancamentos` | `?origem=MANUAL\|VENDA\|COMPRA\|USO\|LEITE\|NUTRICAO`; cada lançamento traz `origem`, `origemCaminho` |
| `PATCH /lancamentos/:id`, `POST /lancamentos/:id/cancelar` | LEITE → 400 "Este lançamento veio do Leite: corrija o recebimento"; NUTRICAO → 400 "Este lançamento veio da Nutrição: corrija a entrada do insumo" |
