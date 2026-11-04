# Research: Módulo Financeiro

Decisões técnicas do plano, cada uma com o porquê e o que foi descartado.

## R1. Dinheiro em centavos inteiros

- **Decision**: todo valor em reais é guardado como **centavos inteiros** (`integer`; R$ 1.250,00
  = `125000`). Somas em relatórios usam `bigint` no SQL e voltam como número. A API recebe e
  devolve centavos (`valorCentavos`); o frontend converte na digitação e na exibição
  (`formatarReais`). Preço por arroba também em centavos.
- **Rationale**: sem erro de arredondamento de ponto flutuante (SC-004 exige conta exata);
  `numeric` do Postgres volta como texto no TypeORM e espalharia conversões.
- **Alternatives considered**: `numeric(12,2)` (rejeitado pelo motivo acima); `float` (erro de
  arredondamento).

## R2. Onde fica o código e como fala com o pacote inicial

- **Decision**: tudo em `backend/src/modulos/financeiro/` e `frontend/src/modulos/financeiro/`.
  O Financeiro **importa** o pacote inicial (animal, pasto, pesagem, configuração); o pacote
  inicial **não** importa o Financeiro — regra já garantida pelo teste de fronteira da fase 0.
  Para isso, a lógica de saída do rebanho que hoje está dentro de `AnimalService.alterarStatus`
  vira uma função reutilizável `registrarSaidaDoRebanho(manager, ...)` em
  `backend/src/animal/saida-do-rebanho.ts`, e ganha a inversa `voltarAoRebanho(manager, ...)`
  (cancelamento da venda). O cadastro de animal vira `criarAnimal(manager, ...)`, chamado pelo
  `AnimalService` e pela compra do Financeiro, cada um na sua transação.
- **Rationale**: decisão D6 (cada módulo funciona sozinho) e FR-024 da spec 002; reaproveita as
  mesmas regras (pasto, exposições, estação do touro) em vez de copiar.
- **Alternatives considered**: eventos entre módulos (rejeitado: complexidade sem ganho com um
  backend só); o pacote inicial chamar o Financeiro (rejeitado: quebra a fronteira).

## R3. "Vendido" pelo caminho do pacote inicial (FR-016a)

- **Decision**: `AnimalService.alterarStatus` consulta o `AcessoModulosService` (infraestrutura
  da fase 0, que o pacote inicial pode usar): com o Financeiro **ATIVO**, status `VENDIDO` é
  recusado com 409 `{ codigo: 'VENDA_PELO_FINANCEIRO' }`. O frontend, com o módulo ativo, troca a
  opção "Vendido" por um atalho para a tela de venda (dono) ou pela mensagem "A venda é
  registrada pelo dono, no Financeiro" (funcionário).
- **Rationale**: a regra fica no backend (constituição, princípio II) e o pacote inicial não
  conhece o Financeiro, só a situação dos módulos.

## R4. Venda de animais numa transação só

- **Decision**: `VendaService.registrar` abre uma transação e, em ordem: confere que todos os
  animais estão ativos e são da fazenda (`SELECT ... FOR UPDATE`), calcula arrobas e valor
  (função pura `calcularVenda`), grava a venda e os itens, grava a pesagem de venda de quem teve
  peso informado, chama `registrarSaidaDoRebanho` para cada animal (status, pasto, exposições) e
  lança a receita em "Venda de animais". Qualquer erro desfaz tudo (FR-014). O item guarda o
  `pastoAnteriorId` para o cancelamento devolver o animal ao mesmo pasto (FR-015).
- **Rationale**: SC-003; o lock evita vender o mesmo animal em duas vendas simultâneas.

## R5. Cálculo da venda

- **Decision**: função pura `calcularVenda({ itens: [{pesoKg, kgPorArroba}], forma, precoArrobaCentavos?, valorTotalCentavos? })`:
  - por arroba: arrobas do item = peso ÷ kg da arroba da categoria (15 kg se não configurado),
    arredondado a 2 casas; valor do item = arrobas × preço, arredondado ao centavo; total = soma
    dos itens;
  - por valor total: total informado; a parte de cada item é proporcional ao peso (sem peso em
    algum item: partes iguais); a diferença de arredondamento vai para o último item, para a soma
    bater exatamente com o total.
  O preço médio da arroba do relatório usa só itens com peso: soma dos valores ÷ soma das arrobas.
- **Rationale**: FR-012, FR-019 e SC-004 (conta exata, testável sem banco).

## R6. Categorias padrão por migration

- **Decision**: categorias padrão são linhas com `fazendaId` nulo, inseridas pela migration do
  Financeiro, cada uma com um `codigo` fixo (`VENDA_ANIMAIS`, `COMPRA_ANIMAIS`, `VENDA_LEITE`…)
  para o sistema achar as que usa sozinho. As da fazenda têm `fazendaId` e `codigo` nulo. Nome
  único por fazenda e tipo (comparado sem acento e sem maiúscula).
- **Rationale**: FR-005 e FR-006; o mesmo padrão das raças (padrão + da fazenda).

## R7. Papéis: valores só para o dono (FR-002)

- **Decision**: todo controller do Financeiro tem `@Modulo(FINANCEIRO)`. Os de valores
  (lançamentos, categorias, vendas, compras, resultado, pendências) têm `@Roles(DONO)` na
  classe. O de registro de uso aceita os dois papéis e **nunca** devolve valor: o DTO de
  resposta do registro de uso não tem campo de dinheiro, nem para o dono (o valor fica no
  lançamento gerado). Um teste confere que toda rota do Financeiro, exceto as de uso, exige DONO.
- **Rationale**: SC-006 e princípio II (bloqueio no backend).

## R8. Compras de animais (FR-016b, FR-016c)

- **Decision**: rota do Financeiro `POST /modulos/financeiro/compras` (dono) recebe os dados do
  cadastro do animal + `valorCentavos` (obrigatório, aceita 0) + `vendedor?`; numa transação cria o
  animal com `criarAnimal`, grava a `CompraAnimal` e, se valor > 0, lança a despesa em "Compra de
  animais". A tela de cadastro do pacote inicial, para o dono com o Financeiro ativo e origem
  "Comprado", usa essa rota. As **compras sem valor** não precisam de gancho no pacote inicial:
  são os animais de origem "Comprado" criados por um **funcionário** depois da primeira
  liberação do Financeiro e sem `CompraAnimal` — uma consulta. O dono informa o valor (cria a
  `CompraAnimal`, com ou sem despesa) e o animal sai da lista.
- **Rationale**: nenhuma mudança no fluxo do funcionário; a pendência é derivada, não pode
  ficar dessincronizada.

## R9. Registro de uso (US4)

- **Decision**: tabela própria `registros_uso` com situação `AGUARDANDO`, `LANCADO` ou
  `DESCARTADO`. Valorizar = criar o lançamento de despesa (descrição "Item — quantidade unidade",
  categoria e data do registro) e ligar ao registro, na mesma transação. Descartar exige motivo.
- **Rationale**: FR-022 a FR-025.

## R10. Avisos ao dono

- **Decision**: `GET /modulos/financeiro/pendencias` (dono) devolve `{ usosAguardando, comprasSemValor }`.
  O painel inicial do dono, com o Financeiro ativo, mostra o aviso das compras sem valor a cada
  login (mesmo mecanismo do aviso de vencimento da spec 002) e um link para "Pendências".
- **Rationale**: FR-016c.

## R11. Gráficos sem biblioteca nova

- **Decision**: gráfico de barras (receita × despesa por mês) e de linha (preço médio da arroba)
  feitos em SVG próprio, num componente pequeno em `frontend/src/modulos/financeiro/graficos/`,
  com rótulos de valor e tabela abaixo para leitura no celular. Despesas por categoria como
  barras horizontais em CSS.
- **Rationale**: constituição VI (sem dependência nova para três gráficos simples); acessível
  porque a tabela traz os mesmos números.
- **Alternatives considered**: Recharts/Chart.js (dependência grande para pouco uso).

## R12. Relatórios

- **Decision**: agregações em SQL agrupando por mês da data do lançamento (`to_char(data,
  'YYYY-MM')`), sempre `cancelado = false` e fazenda do token. Período padrão: os 12 meses até o
  mês atual; máximo 36 meses.
- **Rationale**: FR-017 a FR-020; volume pequeno por fazenda.

## R13. Rotas de exemplo da fase 0

- **Decision**: o `ExemploController` do Financeiro sai (FR-003). O teste de marcação continua
  valendo para os controllers novos. A página de espera do frontend deixa de ser usada para o
  Financeiro: com o módulo ativo ou só consulta, `/modulos/financeiro` abre a tela do módulo.
