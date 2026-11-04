# Research: Módulo Nutrição

Decisões técnicas do plano, cada uma com o porquê e o que foi descartado.

## R1. Unidades: base do insumo e tabela de conversão

- **Decision**: `insumos.unidade_base` (`KG`, `LITRO`, `UNIDADE`) e tabela `unidades_insumo`
  (insumoId, nome, `fator decimal(12,4)` para a base, ativa). Ao criar um insumo em kg, a unidade
  "kg" (fator 1) e "tonelada" (1.000) são criadas; em litro, "litro" (1); em unidade, "unidade"
  (1). O dono acrescenta as outras (saco 25, fardo 18). `insumos.unidade_compra_id` aponta a
  preferida para exibir o estoque nas duas unidades. Todo lançamento guarda `quantidade`,
  `unidadeId` e `quantidadeBase` (= quantidade × fator, 3 casas), calculada no servidor.
  Fator de unidade usada não muda (FR-004b): mudar = desativar e criar outra.
- **Rationale**: Q1 (cada lançamento escolhe a unidade); lançamentos antigos ficam como foram.
- **Alternatives considered**: guardar só a quantidade e converter na leitura (um fator mudado
  mudaria o passado).

## R2. Estoque como livro de movimentos

- **Decision**: uma tabela `movimentos_insumo` com `tipo ENTRADA | BAIXA`, `motivo` (`COMPRA`,
  `PRODUCAO`, `SILO`, `PERDA`, `ESTRAGO`, `DOACAO`, `OUTRO`, `FORNECIMENTO`), quantidade/unidade/
  base, `siloId` (abertura ou baixa de silagem), `fornecimentoItemId`, `valorCentavos` (só
  entrada), `aguardandoPreco`, fornecedor, observação, auditoria e cancelamento. Estoque =
  `SUM(CASE ENTRADA THEN base ELSE -base END)` dos não cancelados, agrupado por insumo, num SQL só.
- **Rationale**: FR-005 a FR-009 e SC-002 (estoque = entradas − baixas − fornecimentos) com uma
  soma; histórico do insumo é a própria tabela; cancelar = marcar.
- **Alternatives considered**: saldo gravado no insumo (pode dessincronizar); tabelas separadas
  para entrada e baixa (estoque e histórico precisariam de união).

## R3. Preço e custo médio

- **Decision**: preço é o **valor total da entrada** em centavos (`valorCentavos`), só do dono.
  Entrada de compra do funcionário → `aguardandoPreco = true` e sem valor; o dono informa depois
  (`POST /entradas/:id/preco`). Produção própria: valor opcional; sem valor, não entra no médio
  nem fica aguardando. Custo médio do insumo na data D = soma dos valores ÷ soma das bases das
  entradas com valor, não canceladas, com data ≤ D (função pura `custoMedio`). Custo do
  fornecimento = Σ base × custo médio na data, calculado na leitura (FR-021a): informar um preço
  atrasado corrige os custos passados.
- **Rationale**: Q3; mesmo fluxo do Financeiro (pendência do funcionário que o dono completa).

## R4. Lotes de alimentação

- **Decision**: `lotes_alimentacao` (nome único na fazenda sem acento, `dietaId` nulo, ativo) e
  `lote_animais` (loteId, animalId, `entrada`, `saida` nula; único parcial `(animal_id) WHERE
  saida IS NULL`). Incluir um animal fecha a participação aberta em outro lote com `saida = data`
  e abre a nova. Animais no lote na data D = `entrada ≤ D` e (`saida` nula ou `saida > D`).
  Saída do rebanho: gancho `saidaDoRebanho` (R1 da spec 004) registrado pela Nutrição fecha a
  participação com `saida = data` — sempre, com o módulo em qualquer situação, para o histórico
  ficar certo. Incluir só animais ativos e da fazenda. A tela usa o filtro do Manejo em lote
  (`GET /manejo-lote/grupo`) para marcar vários de uma vez.
- **Rationale**: Q2 (lote com nome) e clarify (funcionário move animais, dono cria lotes).

## R5. Fornecimento numa transação

- **Decision**: `fornecimentos` (data, loteId, `animais` no dia, dietaId nulo, auditoria e
  cancelamento) e `itens_fornecimento` (insumoId, quantidade, unidadeId, base, siloId). Confirmar
  grava tudo e um movimento BAIXA/FORNECIMENTO por item, na mesma transação. A sugestão é calculada
  no servidor (`GET /fornecimentos/sugestao?loteId&data`): item da dieta × animais no lote na data.
  Se algum insumo ficar negativo, o servidor responde **409** `{ codigo: 'ESTOQUE_NEGATIVO',
  insumos[] }` e só grava com `confirmarNegativo: true` (FR-013). Cancelar marca o fornecimento e
  os movimentos.
- **Rationale**: FR-011 a FR-015, SC-001, SC-002.

## R6. Silo

- **Decision**: `silos` (nome, tipo, insumoId do tipo SILAGEM com base KG, `toneladasEnsiladas
  decimal(10,2)`, `custoEnsilagemCentavos` nulo, fechamento, abertura, encerramento, `entradaId`).
  Abrir = transação que grava a abertura e um movimento ENTRADA/SILO de `toneladas × 1000` kg com o
  custo da ensilagem como valor (Q do clarify: só na abertura). Silo fechado = reserva mostrada no
  estoque. Fornecimento de silagem: item escolhe o silo aberto (padrão: o aberto há mais tempo),
  e a baixa leva `siloId`. Saldo = ensilado − baixas do silo; consumo médio = média dos últimos 7
  dias com baixa do silo; previsão = saldo ÷ média (função pura `previsaoSilo`). Cancelar a
  abertura só sem baixas do silo.
- **Rationale**: FR-016 a FR-019, SC-003.

## R7. Papéis

- **Decision**: `@Roles(DONO)` em: insumos e unidades (escrita), dietas (escrita), silos (cadastro,
  edição, encerramento), lotes (criar, renomear, desativar, dieta), preço de entrada e custo. Dono
  e funcionário: entradas, baixas, fornecimento, abertura de silo, incluir/tirar animais de lote e
  todas as leituras. As leituras passam por `semValores()` para o funcionário (sem `valorCentavos`,
  custos, `custoEnsilagemCentavos`); `POST /entradas` com valor vindo do funcionário → 403. Teste
  de papéis como no Leite.
- **Rationale**: FR-002 e SC-004.

## R8. Relatório de custo

- **Decision**: `GET /custo?de&ate&loteId?` calcula no servidor: fornecimentos não cancelados do
  período com itens, custo médio por insumo na data (entradas com valor até a data, carregadas uma
  vez por insumo e acumuladas em ordem), total por lote, animais-dia (soma de `animais` dos dias com
  fornecimento, um por dia — dois tratos no dia não dobram) e custo por animal por dia. Insumo sem
  preço: custo zero e aviso.
- **Rationale**: FR-020 a FR-022, SC-003, SC-006.

## R9. Pendências e avisos

- **Decision**: `GET /pendencias` (dono) devolve `{ entradasAguardandoPreco, insumosAbaixoDoMinimo }`;
  o início da Nutrição mostra os avisos ao dono e o painel inicial mostra o aviso de entradas
  aguardando preço, como as compras sem valor do Financeiro.

## R10. Fronteira e exemplos da fase 0

- **Decision**: tudo em `backend/src/modulos/nutricao/` e `frontend/src/modulos/nutricao/`; importa
  só o pacote inicial (animal, pasto) e os ganchos; não importa Leite nem Financeiro. O
  `exemplo.controller.ts` da Nutrição sai, e `RotaDeModulo` abre as telas da Nutrição. A
  integração compra → despesa fica para a fase de integrações.
