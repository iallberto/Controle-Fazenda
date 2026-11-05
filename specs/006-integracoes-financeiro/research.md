# Research: Integrações dos módulos com o Financeiro

Decisões técnicas do plano, cada uma com o porquê e o que foi descartado.

## R1. Como um módulo pago avisa o Financeiro sem importá-lo (ganchos entre módulos)

- **Decision**: um segundo registro de ganchos, `backend/src/common/ganchos-modulos.ts`, no mesmo
  formato do `ganchos-rebanho.ts` (objeto do módulo, `registrar`/`emitir`/`limpar`, ganchos
  chamados com o `manager` dentro da transação de quem emite). O Leite e a Nutrição **emitem**; o
  Financeiro **registra** os seus no `onModuleInit`. Eventos:
  - `leiteRecebido({ fazendaId, recebimentoId, mes, data, litros, valorCentavos, caminho, usuarioId })`;
  - `leiteRecebimentoDesfeito({ fazendaId, recebimentoId, motivo, usuarioId })`;
  - `nutricaoCompraValorada({ fazendaId, entradaId, insumoNome, tipoInsumo, categoriaId, data,
    descricao, valorCentavos, caminho, usuarioId })`;
  - `nutricaoEntradaCancelada({ fazendaId, entradaId, motivo, usuarioId })`.
  O Financeiro só age se ele **e** o módulo de origem estiverem ATIVOS na fazenda
  (`AcessoModulosService`, FR-001); erro no gancho desfaz a operação de origem (FR-004).
- **Rationale**: o teste de fronteira da fase 0 continua valendo (nenhum módulo pago importa outro);
  cada módulo funciona sozinho (FR-002) — sem o Financeiro, o evento não tem ouvinte.
- **Alternatives considered**: pasta `modulos/integracoes` importando os três (o Leite precisaria
  importá-la e, por tabela, o Financeiro); eventos assíncronos (perderiam a atomicidade);
  reaproveitar `ganchosRebanho` (mistura eventos do rebanho com dinheiro).

## R2. Lançamento gerado: origem e caminho de volta

- **Decision**: `OrigemLancamento` ganha `LEITE` e `NUTRICAO`; `lancamentos` ganha `origem_id uuid`
  (o recebimento ou a entrada de insumo) e `origem_caminho varchar(200)` (rota da tela de origem,
  montada pelo módulo que emite: `/modulos/leite/entregas?mes=AAAA-MM`,
  `/modulos/nutricao/insumos/:id`). `buscarEditavel` passa a recusar também LEITE e NUTRICAO com a
  mensagem de onde corrigir (FR-003). A lista de lançamentos ganha o filtro `origem` (FR-011).
- **Rationale**: o Financeiro não precisa conhecer as entidades dos outros módulos para mostrar o
  link; um índice em `(origem, origem_id)` acha o lançamento para cancelar.

## R3. Recebimento do leite

- **Decision**: tabela do Leite `recebimentos_leite` (mês `AAAA-MM`, data, litros,
  `totalCalculadoCentavos`, `valorRecebidoCentavos`, observação, auditoria e cancelamento = desfazer;
  único parcial por fazenda e mês com `cancelado = false`). Rotas do Leite, só dono (preço e valor,
  FR-002 da spec 004): `GET /recebimentos?mes=`, `POST /recebimentos`, `POST /recebimentos/:id/desfazer`.
  Confirmar: data não futura e ≥ dia 1 do mês; todas as entregas não canceladas do mês com preço
  (senão 400 `ENTREGAS_SEM_PRECO` com a lista, FR-006b); total calculado = Σ valor das entregas;
  numa transação grava o recebimento e emite `leiteRecebido`. Desfazer: marca cancelado e emite
  `leiteRecebimentoDesfeito`.
- **Trava das entregas (FR-007)**: `EntregasService` consulta se há recebimento em vigor no mês da
  entrega (ou da data nova, na correção) e responde 409 `MES_RECEBIDO` em criar, editar, cancelar,
  preço da entrega e preço do mês. Análises não travam.
- **Rationale**: Q1 (receita mensal quando o dono confirma) e clarify (preço obrigatório).

## R4. Compras da Nutrição

- **Decision**: `insumos` ganha `categoria_despesa_id uuid` nulo (sem relação TypeORM com o
  Financeiro, para não importar). A Nutrição emite `nutricaoCompraValorada` quando uma entrada de
  **COMPRA** passa a ter valor: na criação com valor (dono) e ao informar o preço (`CustoService`).
  Emite `nutricaoEntradaCancelada` ao cancelar uma entrada de compra. O Financeiro escolhe a
  categoria: a do insumo, se for de despesa, ativa e da fazenda (ou padrão); senão o padrão pelo
  tipo (`RACAO_SAL` para silagem, ração, sal, núcleo, feno e concentrado; `OUTRAS_DESPESAS` para
  outro). Produção própria e abertura de silo não emitem (escopo Q2).
- **Tela**: a página do insumo (dono, com o Financeiro ativo) mostra "Categoria no Financeiro", com
  as categorias de despesa lidas de `GET /modulos/financeiro/categorias?tipo=DESPESA`.
- **Rationale**: FR-008 a FR-010.

## R5. Transações na origem

- **Decision**: entrada da Nutrição, preço da entrada, cancelamento de movimento e o recebimento do
  Leite passam a rodar em `manager.transaction`, com a emissão do gancho dentro dela (hoje alguns
  usam `save` direto).
- **Rationale**: FR-004 e SC-003 (origem e Financeiro iguais na mesma operação).

## R6. Só daqui para frente e avisos

- **Decision**: nada de importação retroativa (FR-012). Ao abrir os lançamentos do mês com o Leite
  ou a Nutrição ligados, o Financeiro mostra uma vez por sessão o aviso "Receitas do leite e compras
  de insumo agora entram sozinhas — confira lançamentos manuais de Venda de leite e Ração e sal para
  não duplicar" (edge case da spec), guardado em `sessionStorage` com try/catch.

## R7. Papéis e fronteira

- **Decision**: recebimento só do dono (`@Roles(DONO)`); o teste de papéis do Leite ganha as rotas
  novas; o teste de fronteira continua passando (Financeiro não importa Leite nem Nutrição, e vice-
  versa); um teste novo garante que `ganchos-modulos.ts` está em `common/`.
