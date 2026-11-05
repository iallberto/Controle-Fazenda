# Data Model: Integrações com o Financeiro

Uma migration `Integracoes`, validada primeiro na cópia.

## Financeiro — `lancamentos` (colunas novas)

| Campo | Tipo | Regras |
|---|---|---|
| origem | enum + `LEITE`, `NUTRICAO` | gerados pelos ganchos (R1); não editáveis no Financeiro |
| origemId | uuid, nulo | recebimento do leite ou entrada de insumo |
| origemCaminho | varchar(200), nulo | rota da tela de origem, para o link |

Índice `(origem, origem_id)`.

## Leite — `recebimentos_leite` (nova)

| Campo | Tipo | Regras |
|---|---|---|
| id, fazendaId | uuid | |
| mes | char(7) `AAAA-MM` | um em vigor por fazenda e mês (único parcial `WHERE cancelado = false`) |
| data | date | não futura, ≥ primeiro dia do mês |
| litros | decimal(10,1) | soma das entregas não canceladas do mês |
| totalCalculadoCentavos | integer | Σ litros × preço das entregas |
| valorRecebidoCentavos | integer | > 0; padrão = total calculado |
| observacao | varchar(200), nulo | |
| + auditoria e cancelamento | | cancelar = desfazer o recebimento (motivo obrigatório) |

Diferença = valor recebido − total calculado (na leitura). Mês com recebimento em vigor: entregas
travadas (409 `MES_RECEBIDO`).

## Nutrição — `insumos` (coluna nova)

| Campo | Tipo | Regras |
|---|---|---|
| categoriaDespesaId | uuid, nulo | categoria do Financeiro para as compras; nulo = padrão pelo tipo |

## Eventos entre módulos (`common/ganchos-modulos.ts`)

| Evento | Emissor | O Financeiro faz |
|---|---|---|
| `leiteRecebido` | confirmar recebimento | receita em `VENDA_LEITE`, `origem = LEITE`, `origemId = recebimento` |
| `leiteRecebimentoDesfeito` | desfazer recebimento | cancela o lançamento LEITE do recebimento, se houver |
| `nutricaoCompraValorada` | entrada de compra com valor ou preço informado | despesa na categoria do insumo (ou padrão), `origem = NUTRICAO`, `origemId = entrada` |
| `nutricaoEntradaCancelada` | cancelar entrada de compra | cancela o lançamento NUTRICAO da entrada, se houver |

Todos só com o Financeiro e o módulo de origem ATIVOS no momento (FR-001).
