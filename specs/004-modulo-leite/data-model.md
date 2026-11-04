# Data Model: Módulo Leite

Tudo pela migration `Leite`. Tabelas do Leite com `RegistroAuditado` (criado/atualizado por e em)
e, quando podem ser desfeitas, `Cancelamento` (cancelado, quando, por quem, motivo). Litros com
uma casa decimal; dinheiro em centavos inteiros (como no Financeiro).

## Pacote base (colunas novas)

| Tabela | Campo | Tipo | Regras |
|---|---|---|---|
| racas | leiteira | boolean, default false | padrão: Holandesa 280, Girolando 285, Jersey 279, Gir 290 com `true`; o dono marca as da fazenda |
| animais | vaca_de_leite | enum `PELA_RACA` \| `SIM` \| `NAO`, default `PELA_RACA` | só fêmeas; só o dono altera (rota do Leite) |

**Vaca de leite** = fêmea com `SIM`, ou `PELA_RACA` e raça `leiteira`.

## ConfiguracaoLeite — `configuracoes_leite`

| Campo | Tipo | Regras |
|---|---|---|
| fazendaId | uuid, PK | |
| modo | enum `POR_VACA` \| `TANQUE` | padrão POR_VACA |
| ordenhasPorDia | smallint | 1 a 3, padrão 2 |
| prazoSecagemDias | smallint | 30 a 90, padrão 60 |
| janelaSecarDias | smallint | 1 a 60, padrão 15 |
| + auditoria | | |

## Lactacao — `lactacoes`

| Campo | Tipo | Regras |
|---|---|---|
| id | uuid | |
| fazendaId, animalId | uuid | vaca de leite da fazenda |
| inicio | date | não futura |
| origem | enum `PARTO` \| `MANUAL` | |
| partoId | uuid, nulo | quando PARTO |
| fim | date, nulo | nulo = em lactação; único parcial `(animal_id) WHERE fim IS NULL` |
| motivoFim | enum `SECAGEM` \| `SAIDA` \| `NOVO_PARTO`, nulo | |
| + auditoria | | |

Transições: aberta → encerrada (secagem, saída do rebanho, novo parto). Secagem cancelada reabre
(só se for a lactação mais nova da vaca). Lactações não se sobrepõem.

## Ordenha — `ordenhas`

| Campo | Tipo | Regras |
|---|---|---|
| id | uuid | |
| fazendaId | uuid | |
| data | date | não futura |
| turno | smallint | 1 a `ordenhasPorDia` |
| tipo | enum `VACA` \| `TANQUE` | |
| animalId, lactacaoId | uuid, nulos | obrigatórios em VACA; lactação aberta na data |
| litros | decimal(7,1) | VACA: 0 a 80 (acima, só com confirmação); TANQUE: ≥ 0 |
| descarte | boolean | calculado no servidor pela carência (R6); TANQUE sempre false |
| + auditoria | | |

Únicos: `(fazenda_id, data, turno, animal_id) WHERE tipo='VACA'` e
`(fazenda_id, data, turno) WHERE tipo='TANQUE'`. Índice `(fazenda_id, data)`. Gravar = upsert.

## ProdutoLeite — `produtos_leite`

| Campo | Tipo | Regras |
|---|---|---|
| id | uuid | |
| fazendaId | uuid | |
| nome | varchar(80) | único por fazenda, comparado sem acento e sem maiúscula |
| carenciaLeiteDias | smallint | 0 a 120; 0 = sem carência |
| ativo | boolean | desativar some da escolha; não há exclusão |
| + auditoria | | |

## CarenciaLeite — `carencias_leite`

| Campo | Tipo | Regras |
|---|---|---|
| id | uuid | |
| fazendaId, animalId | uuid | |
| tratamentoId | uuid → tratamentos, único | |
| produtoId | uuid → produtos_leite | |
| data | date | data do tratamento |
| carenciaDias | smallint | copiada do produto no dia (FR-015a) |
| dataFim | date | data + carenciaDias |

Criada, trocada ou removida pelo gancho `tratamentoGravado` (R6). Carência 0 não cria linha. Vaca
em carência no dia D: existe linha com `data ≤ D ≤ dataFim`.

## Secagem — `secagens`

| Campo | Tipo | Regras |
|---|---|---|
| id | uuid | |
| fazendaId, lactacaoId | uuid | lactação aberta |
| data | date | ≥ início da lactação, não futura |
| observacao | varchar(200), nulo | |
| + auditoria e cancelamento | | |

## EntregaLeite — `entregas_leite`

| Campo | Tipo | Regras |
|---|---|---|
| id | uuid | |
| fazendaId | uuid | |
| data | date | não futura |
| litros | decimal(8,1) | > 0 |
| precoLitroCentavos | integer, nulo | > 0; só o dono informa e vê |
| observacao | varchar(200), nulo | |
| + auditoria e cancelamento | | |

Valor da entrega = litros × preço, arredondado ao centavo (calculado na leitura, só para o dono).

## AnaliseLeite — `analises_leite`

| Campo | Tipo | Regras |
|---|---|---|
| id | uuid | |
| fazendaId | uuid | |
| mes | char(7) `AAAA-MM` | obrigatório (de uma entrega: o mês da entrega) |
| entregaId | uuid, nulo | entrega da fazenda |
| ccsMil, cbtMil | integer, nulos | ≥ 0 |
| gordura, proteina | decimal(4,2), nulos | 0 a 20 |
| + auditoria e cancelamento | | pelo menos um dos quatro valores |
