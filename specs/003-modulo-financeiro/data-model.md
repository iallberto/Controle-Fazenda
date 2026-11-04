# Data Model: Módulo Financeiro

Valores em reais sempre como **centavos inteiros** (research R1). Todas as tabelas novas via
migration `Financeiro`. Entidades com `RegistroAuditado` (criado/atualizado por e em) e, quando
podem ser corrigidas, `Cancelamento` (cancelado, quando, por quem, motivo) — mesmos tipos usados
na reprodução.

## CategoriaFinanceira — `categorias_financeiras`

| Campo | Tipo | Regras |
|---|---|---|
| id | uuid | |
| fazendaId | uuid, nulo | nulo = categoria padrão do sistema |
| tipo | enum `RECEITA` \| `DESPESA` | |
| nome | varchar(60) | único por fazenda + tipo, sem acento e sem maiúscula (padrões incluídas) |
| codigo | varchar, nulo | só nas padrão: `VENDA_ANIMAIS`, `VENDA_LEITE`, `OUTRAS_RECEITAS`, `RACAO_SAL`, `MEDICAMENTOS`, `MAO_DE_OBRA`, `MANUTENCAO`, `COMBUSTIVEL_ENERGIA`, `COMPRA_ANIMAIS`, `OUTRAS_DESPESAS` |
| ativa | boolean | padrão true; desativar some da escolha, não dos lançamentos antigos |

Padrões: inseridas pela migration, não podem ser renomeadas, desativadas nem apagadas. Da
fazenda: o dono cria, renomeia e desativa; não há exclusão de categoria usada (FR-006).

## Lancamento — `lancamentos`

| Campo | Tipo | Regras |
|---|---|---|
| id | uuid | |
| fazendaId | uuid | |
| tipo | enum `RECEITA` \| `DESPESA` | igual ao tipo da categoria |
| data | date | pode ser futura |
| valorCentavos | integer | > 0 |
| categoriaId | uuid → categorias_financeiras | padrão ou da própria fazenda, ativa ao lançar |
| descricao | varchar(200) | |
| animalId | uuid, nulo | animal da fazenda |
| pastoId | uuid, nulo | pasto da fazenda; no máximo um dos dois |
| origem | enum `MANUAL` \| `VENDA` \| `COMPRA` \| `USO` | |
| vendaId / compraId / registroUsoId | uuid, nulos | um, conforme a origem |
| + auditoria e cancelamento | | |

- Lançamento de origem VENDA ou COMPRA **não** é editado nem cancelado direto: muda pela venda
  ou compra (cancelar a venda cancela o lançamento).
- Totais e gráficos: só `cancelado = false` (FR-020).

## VendaAnimais — `vendas_animais`

| Campo | Tipo | Regras |
|---|---|---|
| id | uuid | |
| fazendaId | uuid | |
| data | date | |
| comprador | varchar(120) | obrigatório |
| forma | enum `POR_ARROBA` \| `VALOR_TOTAL` | |
| precoArrobaCentavos | integer, nulo | obrigatório e > 0 em POR_ARROBA |
| valorTotalCentavos | integer | > 0; calculado em POR_ARROBA |
| observacao | varchar(200), nulo | |
| + auditoria e cancelamento | | |

## ItemVenda — `itens_venda`

| Campo | Tipo | Regras |
|---|---|---|
| id | uuid | |
| vendaId | uuid → vendas_animais | |
| animalId | uuid → animais | ativo e da fazenda no momento da venda; um animal em no máximo uma venda não cancelada |
| categoriaNaVenda | enum CategoriaAnimal | para o relatório por categoria |
| pesoKg | decimal(6,2), nulo | obrigatório em POR_ARROBA |
| arrobas | decimal(7,2), nulo | peso ÷ kg da arroba da categoria |
| valorCentavos | integer | parte do total (research R5); soma = total da venda |
| pastoAnteriorId | uuid, nulo | para o cancelamento devolver ao mesmo pasto |
| pesagemId | uuid, nulo | pesagem de venda gravada |

Transições da venda: `REGISTRADA → CANCELADA` (dono, com motivo). Ao cancelar: lançamento
cancelado; animais voltam a ATIVO no `pastoAnteriorId` (nova permanência com a data do
cancelamento); exposições não são reabertas; a pesagem de venda fica.

## CompraAnimal — `compras_animais`

| Campo | Tipo | Regras |
|---|---|---|
| id | uuid | |
| fazendaId | uuid | |
| animalId | uuid → animais | único: uma compra por animal |
| valorCentavos | integer | ≥ 0; 0 = sem valor, não lança |
| vendedor | varchar(120), nulo | |
| lancamentoId | uuid, nulo | despesa gerada quando valor > 0 |
| + auditoria | | |

**Compras sem valor** (derivado, não é tabela): animais da fazenda com `origem = COMPRADO`,
criados por usuário de papel FUNCIONARIO, com `criadoEm` ≥ início do primeiro período do
Financeiro da fazenda, e sem `CompraAnimal`.

## RegistroUso — `registros_uso`

| Campo | Tipo | Regras |
|---|---|---|
| id | uuid | |
| fazendaId | uuid | |
| data | date | |
| item | varchar(120) | |
| quantidade | decimal(10,2) | > 0 |
| unidade | varchar(20) | ex.: sacos, litros, frascos, kg |
| categoriaId | uuid → categorias_financeiras | tipo DESPESA |
| animalId / pastoId | uuid, nulos | no máximo um |
| situacao | enum `AGUARDANDO` \| `LANCADO` \| `DESCARTADO` | |
| lancamentoId | uuid, nulo | quando LANCADO |
| motivoDescarte | varchar(200), nulo | quando DESCARTADO |
| + auditoria | | quem registrou aparece na lista |

Transições: `AGUARDANDO → LANCADO` (dono informa o valor) ou `AGUARDANDO → DESCARTADO` (dono,
com motivo). Depois disso, o funcionário não altera (FR-025).

## Pacote inicial (sem mudança de tabela)

- `animais.status = VENDIDO`, `dataStatus`, `motivoStatus` (o comprador vai no motivo).
- `pesagens`: a pesagem de venda é uma pesagem comum, com observação "Pesagem de venda".
- `movimentacoes_pasto`: saída fechada na venda; nova entrada ao cancelar.
