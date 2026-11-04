# Data Model: Módulo Nutrição

Tudo pela migration `Nutricao`. Tabelas com `RegistroAuditado` e, quando podem ser desfeitas,
`Cancelamento`. Quantidades: lançada `decimal(12,2)`, base `decimal(14,3)`; dinheiro em centavos.

## Insumo — `insumos`

| Campo | Tipo | Regras |
|---|---|---|
| id, fazendaId | uuid | |
| nome | varchar(80) | único na fazenda, sem acento e sem maiúscula |
| tipo | enum `SILAGEM`, `RACAO`, `SAL_MINERAL`, `NUCLEO`, `FENO`, `CONCENTRADO`, `OUTRO` | SILAGEM exige base KG |
| unidadeBase | enum `KG`, `LITRO`, `UNIDADE` | não muda depois de usado |
| unidadeCompraId | uuid → unidades_insumo, nulo | exibição do estoque |
| estoqueMinimoBase | decimal(14,3), nulo | |
| ativo | boolean | desativar some da escolha |

## UnidadeInsumo — `unidades_insumo`

| Campo | Tipo | Regras |
|---|---|---|
| id, insumoId | uuid | |
| nome | varchar(30) | único no insumo |
| fator | decimal(12,4) | > 0; base = 1; não muda depois de usada |
| ativa | boolean | |

Criadas com o insumo: KG → "kg" (1) e "tonelada" (1000); LITRO → "litro" (1); UNIDADE → "unidade" (1).

## MovimentoInsumo — `movimentos_insumo`

| Campo | Tipo | Regras |
|---|---|---|
| id, fazendaId, insumoId | uuid | |
| data | date | não futura |
| tipo | enum `ENTRADA`, `BAIXA` | |
| motivo | enum `COMPRA`, `PRODUCAO`, `SILO` (entradas); `PERDA`, `ESTRAGO`, `DOACAO`, `OUTRO`, `FORNECIMENTO` (baixas) | |
| quantidade, unidadeId, quantidadeBase | | base = quantidade × fator, calculada no servidor |
| valorCentavos | integer, nulo | só ENTRADA; só dono informa e vê |
| aguardandoPreco | boolean | COMPRA lançada sem valor |
| fornecedor | varchar(120), nulo | |
| observacao | varchar(200), nulo | obrigatória em baixa OUTRO |
| siloId | uuid, nulo | entrada da abertura ou baixa de silagem |
| fornecimentoItemId | uuid, nulo | baixa do fornecimento |
| + auditoria e cancelamento | | |

Índices: `(fazenda_id, insumo_id, data)`, `(silo_id)`. Estoque = Σ base (ENTRADA +, BAIXA −) não cancelados.

## Dieta — `dietas` e `itens_dieta`

| Campo | Tipo | Regras |
|---|---|---|
| dietas: id, fazendaId, nome, ativa | | nome único na fazenda |
| itens_dieta: id, dietaId, insumoId, quantidadePorAnimal decimal(12,3), unidadeId | | insumo ativo da fazenda; um item por insumo |

Alterar a dieta = substituir os itens (vale para os próximos fornecimentos; os gravados guardam o que foi dado).

## LoteAlimentacao — `lotes_alimentacao` e `lote_animais`

| Campo | Tipo | Regras |
|---|---|---|
| lotes_alimentacao: id, fazendaId, nome, dietaId nulo, ativo | | nome único na fazenda |
| lote_animais: id, loteId, animalId, entrada date, saida date nula | | único parcial `(animal_id) WHERE saida IS NULL`; animal ativo e da fazenda |

No lote na data D: `entrada ≤ D` e (`saida` nula ou `saida > D`).

## Fornecimento — `fornecimentos` e `itens_fornecimento`

| Campo | Tipo | Regras |
|---|---|---|
| fornecimentos: id, fazendaId, data, loteId, animais int, dietaId nulo | | data não futura; animais = no lote na data |
| + auditoria e cancelamento | | |
| itens_fornecimento: id, fornecimentoId, insumoId, quantidade, unidadeId, quantidadeBase, siloId nulo | | > 0; silo aberto do mesmo insumo |

Cada item gera um `MovimentoInsumo` BAIXA/FORNECIMENTO; cancelar o fornecimento cancela os movimentos.

## Silo — `silos`

| Campo | Tipo | Regras |
|---|---|---|
| id, fazendaId, insumoId | uuid | insumo SILAGEM em KG |
| nome | varchar(60) | único na fazenda |
| tipo | enum `TRINCHEIRA`, `SUPERFICIE`, `BAG` | |
| toneladasEnsiladas | decimal(10,2) | > 0 |
| custoEnsilagemCentavos | integer, nulo | só dono |
| fechamento | date | |
| abertura | date, nula | ≥ fechamento, não futura |
| encerramento | date, nula | ≥ abertura |
| entradaId | uuid, nulo | movimento ENTRADA/SILO da abertura |
| + auditoria | | |

Situação: FECHADO (sem abertura) → ABERTO → ENCERRADO.
