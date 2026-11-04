# Feature Specification: Módulo Financeiro

**Feature Branch**: `003-modulo-financeiro`

**Created**: 2026-11-04

**Status**: Draft (respostas de 2026-11-04 aplicadas)

**Input**: User description: "Módulo Financeiro, o primeiro módulo pago (decisões D2, D4 e D6; seção 5 de docs/modulos/Planejamento-modulos.md). Liberado por fazenda pelo painel do administrador e protegido pelo bloqueio da fase 0 (spec 002): ativo lança e consulta, desativado fica só consulta, não contratado vê a vitrine. Escopo: lançamentos de receitas e despesas com categorias padrão e personalizadas; venda de animais (animal ou lote, peso, arrobas, preço por arroba ou valor total, comprador) que muda o animal para Vendido e gera a receita no mesmo passo; gráficos e relatórios de receita × despesa, lucro, vendas e custo por categoria. Fora do escopo: integrações com Leite e Nutrição, contas a pagar e a receber, conciliação bancária e notas fiscais. Substitui as rotas de exemplo do Financeiro da fase 0. Pensado para o celular."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Lançar receitas e despesas (Priority: P1)

O dono anota o dinheiro que entra e sai da fazenda: a compra de ração, o salário do peão, a venda de leite avulsa, o conserto da cerca. Cada lançamento tem data, valor, se é receita ou despesa, categoria e uma descrição curta; quando fizer sentido, aponta um animal ou um pasto. As categorias mais comuns já vêm prontas, e a fazenda cria as suas.

**Why this priority**: é o coração do módulo; sem lançamentos não há relatório nem lucro.

**Independent Test**: numa fazenda com o Financeiro ativo, lançar uma despesa de ração e uma receita avulsa, conferir que aparecem na lista do mês com o saldo certo, e criar uma categoria nova usada num terceiro lançamento.

**Acceptance Scenarios**:

1. **Given** o Financeiro ativo, **When** o dono lança "Ração, R$ 1.250,00, despesa, 03/11/2026", **Then** o lançamento aparece na lista de novembro e o saldo do mês diminui R$ 1.250,00.
2. **Given** as categorias padrão, **When** o dono cria a categoria "Combustível" (despesa), **Then** ela aparece na escolha de categoria dos próximos lançamentos.
3. **Given** um lançamento errado, **When** o dono o cancela informando o motivo, **Then** ele sai dos totais e continua na lista marcado como cancelado.
4. **Given** o Financeiro desativado (só consulta), **When** o dono abre a lista, **Then** vê os lançamentos e os totais, mas não há botão de lançar, editar ou cancelar.

---

### User Story 2 - Vender animais (Priority: P1)

O dono registra a venda de um animal ou de um lote: data, comprador, peso de cada animal (ou o peso total do lote) e o preço — por arroba ou o valor total. O sistema calcula as arrobas pelo peso de referência das Configurações, mostra o valor antes de confirmar e, no mesmo passo, marca os animais como Vendidos (saem do pasto e do rebanho) e lança a receita na categoria "Venda de animais".

**Why this priority**: a venda de animais é a principal receita da fazenda de corte e hoje é anotada fora do sistema; juntar a saída do rebanho com o dinheiro evita lançar duas vezes.

**Independent Test**: vender um lote de 3 garrotes a R$ 300,00 a arroba, conferir o valor calculado, depois conferir que os 3 animais estão como Vendidos, fora do pasto, e que a receita apareceu no mês com o total da venda.

**Acceptance Scenarios**:

1. **Given** um garrote de 450 kg e o peso de referência de 15 kg por arroba, **When** o dono registra a venda a R$ 300,00 a arroba, **Then** o sistema mostra 30 arrobas e R$ 9.000,00 antes de confirmar.
2. **Given** a venda confirmada, **Then** o sistema lembra de retirar o brinco só dos animais que embarcarem, e o animal fica Vendido com a data e o comprador, sai do pasto, encerra exposições a touro (se for fêmea) e a receita de R$ 9.000,00 aparece em "Venda de animais".
3. **Given** um lote de 3 animais, **When** o dono informa o valor total de R$ 25.000,00, **Then** uma única receita é lançada e cada animal fica ligado à venda.
4. **Given** uma venda registrada por engano, **When** o dono a cancela informando o motivo, **Then** a receita sai dos totais e os animais voltam a ser Ativos no pasto de onde saíram; a venda fica no histórico marcada como cancelada.
5. **Given** um animal que não está mais no rebanho (já vendido, morto ou descartado), **When** alguém tenta vendê-lo, **Then** o sistema recusa.

---

### User Story 3 - Ver o resultado da fazenda (Priority: P2)

O dono acompanha os números: receita, despesa e lucro de cada mês e do período escolhido, em gráfico de barras; para onde vai o dinheiro (despesas por categoria); e o resultado das vendas de animais — total vendido, quantidade por categoria e o preço médio da arroba ao longo do tempo.

**Why this priority**: transforma os lançamentos em decisão; depende das histórias 1 e 2 para ter dados.

**Independent Test**: com lançamentos e vendas em três meses diferentes, conferir que o gráfico mostra receita e despesa de cada mês, que o lucro do período bate com a soma manual, e que o preço médio da arroba bate com o total vendido dividido pelas arrobas vendidas.

**Acceptance Scenarios**:

1. **Given** lançamentos em setembro, outubro e novembro, **When** o dono abre o resultado do período setembro–novembro, **Then** vê receita, despesa e lucro de cada mês e o total do período.
2. **Given** despesas em várias categorias, **When** o dono abre "Para onde vai o dinheiro", **Then** vê o total de cada categoria em ordem do maior para o menor, com a porcentagem do total.
3. **Given** vendas de animais no período, **When** o dono abre "Vendas de animais", **Then** vê o total vendido, a quantidade por categoria (bezerro, garrote, vaca…) e o preço médio da arroba mês a mês.
4. **Given** lançamentos cancelados, **Then** eles não entram em nenhum total ou gráfico.

---

### User Story 4 - Funcionário registra o que foi usado (Priority: P2)

O funcionário não vê dinheiro, mas é quem sabe o que saiu do depósito, o que foi comprado na cidade e quais animais chegaram. Ele registra o item usado ou trazido — por exemplo "Sal mineral, 10 sacos", "Diesel, 40 litros", "Vacina aftosa, 2 frascos" — com a data, a categoria e, se quiser, o animal ou o pasto. Não informa valor. O dono vê esses registros numa lista "aguardando valor", informa quanto custou e o registro vira uma despesa; ou descarta com motivo, se não for gasto.

**Why this priority**: o dono quer o controle financeiro completo sem expor valores ao funcionário, e quem está no campo é quem lembra do que foi usado.

**Independent Test**: como funcionário, registrar "Diesel, 40 litros, Combustível e energia"; conferir que não aparece nenhum valor em reais para ele; como dono, abrir "Aguardando valor", informar R$ 280,00 e conferir que virou uma despesa no mês, com o item e quem registrou.

**Acceptance Scenarios**:

1. **Given** o Financeiro ativo, **When** o funcionário abre o módulo, **Then** só vê "Registrar uso" e a lista de registros de uso da fazenda (com quem registrou), sem nenhum valor, lançamento, venda ou resultado.
2. **Given** um registro de uso do funcionário, **When** o dono informa o valor, **Then** é lançada uma despesa com a data, a categoria, a descrição do item e a quantidade, ligada ao registro, e o registro passa a "lançado".
3. **Given** um registro que não é gasto (ex.: item doado), **When** o dono o descarta com motivo, **Then** ele sai da lista de pendentes e não vira despesa.
4. **Given** o Financeiro desativado (só consulta), **When** o funcionário tenta registrar um uso, **Then** o sistema recusa.
5. **Given** o funcionário cadastrou 2 animais comprados, **When** o dono entra no sistema, **Then** vê o aviso de 2 compras sem valor; ao informar o valor de cada uma, as despesas são lançadas e o aviso some.

---

### Edge Cases

- Venda de animal sem pesagem registrada: o peso é informado na hora da venda (obrigatório para venda por arroba; opcional para venda por valor total).
- Venda por arroba de um lote com pesos diferentes: as arrobas de cada animal são somadas; o preço por arroba vale para o lote todo.
- Peso de referência da arroba não configurado para a categoria: usa 15 kg, como a página pública do animal.
- Lançamento com valor zero ou negativo: recusado; o tipo (receita ou despesa) é que define o sinal.
- Lançamento com data futura: aceito (ex.: despesa já combinada) e conta no mês da data.
- Categoria padrão não pode ser apagada; categoria personalizada já usada não pode ser apagada, só desativada (some da escolha, continua nos lançamentos antigos).
- Animal comprado cadastrado pelo funcionário: entra sem valor e fica pendente para o dono (FR-016c).
- Animal que não embarcou depois da venda confirmada: o dono cancela a venda e registra de novo só com os que embarcaram (não há tirar um animal de uma venda já confirmada nesta versão).
- Animal marcado como Vendido pelo caminho do pacote inicial (mudança de status): com o Financeiro **ativo**, esse caminho leva à tela de venda do Financeiro (FR-016a); com o módulo só consulta ou não contratado, continua como hoje, sem receita.
- Módulo desativado com vendas e lançamentos: tudo fica visível em só consulta (spec 002, FR-011a).
- Animal de outra fazenda ou animal ligado a lançamento de outra fazenda: recusado (constituição, princípio I).

## Clarifications

### Session 2026-11-04

- Q: Quem acessa o Financeiro? → A: Só o dono vê e lança valores. O funcionário não vê nem informa valores em reais, mas registra os itens usados; o dono informa o valor depois (FR-002, US4, FR-022 a FR-025).
- Q: Cancelar uma venda faz o quê com os animais? → A: Os animais voltam a ser Ativos, no pasto de onde saíram (FR-015). O sistema lembra o dono de só retirar o brinco depois da venda confirmada, e só dos animais que embarcarem no caminhão (FR-015a).
- Q: Com o Financeiro ativo, ainda dá para marcar Vendido pelo caminho de hoje, sem valor? → A: Não; "Vendido" leva à tela de venda do Financeiro. Morto e descartado continuam iguais (FR-016a).
- Q: Cadastrar um animal comprado deve pedir o valor e lançar a despesa? → A: Sim, para o dono: valor pago (obrigatório, aceita 0,00 para não lançar) e vendedor; com valor maior que zero, lança a despesa em "Compra de animais" ligada ao animal (FR-016b). Animal comprado cadastrado pelo funcionário fica pendente de valor, e o dono é avisado ao entrar no sistema (FR-016c).
- Q: O funcionário vê os registros de uso de toda a fazenda ou só os próprios? → A: De toda a fazenda, com quem registrou e a situação, sem valores (FR-023).

## Requirements *(mandatory)*

### Functional Requirements

**Acesso**

- **FR-001**: Todas as telas e ações do Financeiro MUST respeitar a situação do módulo na fazenda (spec 002): ativo lança e consulta, só consulta apenas consulta, não contratado vê a vitrine.
- **FR-002**: Só o dono MUST acessar lançamentos, vendas, resultados e qualquer valor em reais. O funcionário MUST NOT ver nem informar valores: no Financeiro ele só registra os itens usados (US4). Uma chamada do funcionário a qualquer rota com valores MUST ser recusada, mesmo direto pelo sistema.
- **FR-003**: As rotas de exemplo do Financeiro criadas na fase 0 MUST ser removidas.

**Lançamentos**

- **FR-004**: O sistema MUST permitir lançar receita ou despesa com data, valor (maior que zero, em reais com centavos), categoria, descrição (até 200 caracteres) e, opcionalmente, um animal ou um pasto da fazenda.
- **FR-005**: O sistema MUST trazer categorias padrão de receita (Venda de animais, Venda de leite, Outras receitas) e de despesa (Ração e sal, Medicamentos e vacinas, Mão de obra, Manutenção, Combustível e energia, Compra de animais, Outras despesas), iguais para toda fazenda.
- **FR-006**: O dono MUST poder criar, renomear e desativar categorias próprias, de receita ou de despesa; categoria usada MUST NOT ser apagada.
- **FR-007**: O sistema MUST listar os lançamentos por mês, com filtro por tipo e categoria, e mostrar receita, despesa e saldo do mês.
- **FR-008**: Nenhum lançamento MUST ser excluído: o dono corrige (data, valor, categoria, descrição) ou cancela com motivo; o cancelado fica na lista marcado e fora de todos os totais (constituição, princípio III).
- **FR-009**: Todo lançamento MUST guardar quem lançou e quando, e quem alterou ou cancelou por último.

**Venda de animais**

- **FR-010**: O sistema MUST permitir registrar a venda de um ou mais animais ativos da fazenda, com data, comprador (nome, até 120 caracteres) e observação opcional.
- **FR-011**: Para cada animal, o sistema MUST aceitar o peso de venda; quando houver pesagem anterior, MUST sugerir a última.
- **FR-012**: O preço MUST ser informado por arroba ou como valor total da venda; por arroba, o valor é a soma das arrobas de cada animal (peso ÷ peso de referência da categoria) vezes o preço; o sistema MUST mostrar arrobas e valor antes de confirmar.
- **FR-013**: Ao confirmar, numa única operação, o sistema MUST: marcar cada animal como Vendido na data da venda, fechar a permanência no pasto, encerrar exposições a touro e a estação do touro (mesmas regras da saída do rebanho), registrar a pesagem de venda quando o peso for informado, e lançar uma receita na categoria "Venda de animais" com o valor total, ligada à venda.
- **FR-014**: Se qualquer parte falhar, nada MUST ser gravado.
- **FR-015**: O dono MUST poder cancelar uma venda com motivo; a receita ligada MUST ser cancelada junto e os animais MUST voltar a Ativo, no pasto em que estavam antes da venda. Exposições a touro encerradas pela venda não são reabertas (o dono inclui a fêmea de novo na estação, se quiser). A pesagem de venda continua registrada.
- **FR-015a**: Antes de confirmar a venda e logo depois, o sistema MUST mostrar o lembrete "Retire o brinco só depois da venda confirmada, e só dos animais que subirem no caminhão", com a lista dos brincos vendidos para conferir no embarque. Um animal que não embarcar MUST continuar com o brinco, porque cancelar a venda devolve o animal ao rebanho com o mesmo número.
- **FR-016a**: Com o Financeiro ativo, escolher "Vendido" na mudança de status do animal MUST levar o dono à tela de venda do Financeiro, com o animal já escolhido; o sistema MUST recusar marcar Vendido por esse caminho (sem valor) enquanto o módulo estiver ativo. O funcionário vê a mensagem "A venda é registrada pelo dono, no Financeiro". Morto e descartado não mudam. Com o módulo só consulta ou não contratado, o caminho de hoje continua.
- **FR-016b**: Com o Financeiro ativo, o cadastro de um animal de origem "Comprado" feito pelo dono MUST pedir o valor pago (obrigatório; 0,00 quando o dono não quiser lançar) e, opcionalmente, o vendedor. Valor maior que zero MUST lançar, na mesma operação do cadastro, uma despesa na categoria "Compra de animais", na data da compra, ligada ao animal; 0,00 não lança nada. Cancelar a despesa não apaga o animal. O funcionário cadastra o animal comprado sem esses campos.
- **FR-016c**: Animal comprado cadastrado pelo funcionário, com o Financeiro ativo, MUST ficar na lista do dono "Compras sem valor". Toda vez que o dono entrar no sistema, enquanto houver pendentes, MUST ver o aviso "Funcionários cadastraram N animais comprados sem valor · informe o valor de compra para o balanço da fazenda", com link para a lista. Para cada um, o dono informa o valor (lança a despesa como na FR-016b) ou 0,00 (sai da lista sem lançar). Animal comprado cadastrado pelo próprio dono não entra nessa lista.
- **FR-016**: A página do animal MUST mostrar ao dono a venda (data, comprador, peso, valor da parte do animal) quando o Financeiro estiver ativo ou em só consulta; o funcionário vê só que o animal foi vendido e a data, sem comprador nem valor.

**Registro de uso pelo funcionário**

- **FR-022**: Dono e funcionário MUST poder registrar um item usado ou comprado com data, descrição do item (até 120 caracteres), quantidade e unidade (ex.: sacos, litros, frascos, kg), categoria de despesa e, opcionalmente, animal ou pasto; sem valor em reais.
- **FR-023**: Dono e funcionário MUST ver os registros de uso de toda a fazenda, com quem registrou e a situação (aguardando valor, lançado, descartado); o funcionário, sem nenhum valor.
- **FR-024**: O dono MUST ver os registros aguardando valor e, para cada um, informar o valor (vira uma despesa ligada ao registro, com quem registrou o uso) ou descartar com motivo.
- **FR-025**: Lançada a despesa, o registro de uso MUST NOT ser alterado pelo funcionário; correções de valor seguem as regras dos lançamentos (FR-008).

**Resultado**

- **FR-017**: O sistema MUST mostrar, para um período escolhido (padrão: últimos 12 meses), receita, despesa e lucro de cada mês em gráfico de barras e o total do período.
- **FR-018**: O sistema MUST mostrar as despesas do período por categoria, do maior para o menor, com valor e porcentagem.
- **FR-019**: O sistema MUST mostrar as vendas de animais do período: total vendido, quantidade de animais e valor por categoria animal, e o preço médio da arroba por mês (total vendido por arroba ÷ arrobas vendidas, só vendas por arroba ou com peso informado).
- **FR-020**: Lançamentos e vendas cancelados MUST NOT entrar em nenhum total ou gráfico.

**Celular**

- **FR-021**: Lançar uma despesa MUST caber em uma tela de celular, com o teclado numérico para o valor e a data de hoje já preenchida (constituição, princípio IV).

### Key Entities *(include if feature involves data)*

- **Categoria financeira**: nome, tipo (receita ou despesa), padrão do sistema ou da fazenda, ativa ou não.
- **Lançamento**: fazenda, tipo, data, valor, categoria, descrição, animal ou pasto opcional, venda de origem (quando gerado por venda), auditoria e cancelamento.
- **Venda de animais**: fazenda, data, comprador, forma de preço (por arroba ou total), preço por arroba ou valor total, valor total final, observação, auditoria e cancelamento.
- **Registro de uso**: fazenda, data, item, quantidade, unidade, categoria de despesa, animal ou pasto opcional, quem registrou, situação (aguardando valor, lançado, descartado), lançamento gerado, motivo do descarte.
- **Compra de animal**: o animal comprado, valor pago, vendedor opcional, quem cadastrou, situação (pendente de valor quando cadastrado pelo funcionário, lançada, sem valor) e a despesa gerada.
- **Item da venda**: a venda, o animal, peso, arrobas e a parte do valor que cabe a esse animal.
- **Animal** *(existente)*: passa a Vendido pela venda; o status Vendido continua existindo sem o Financeiro.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: O dono lança uma despesa comum no celular em menos de 30 segundos.
- **SC-002**: A venda de um lote de 10 animais, com peso de cada um, é registrada em menos de 3 minutos.
- **SC-003**: Em 100% das vendas confirmadas, os animais ficam Vendidos e a receita aparece no mesmo instante; em 100% das falhas, nada muda.
- **SC-004**: O lucro do período e o preço médio da arroba conferem com a conta manual em 100% dos casos de teste.
- **SC-005**: Nenhum lançamento ou venda de uma fazenda aparece para outra.
- **SC-006**: Em 100% das tentativas, o funcionário não vê nem recebe nenhum valor em reais do Financeiro.

## Assumptions

- Moeda única: real, com duas casas decimais; sem conversão.
- Lançamento com data futura é aceito e entra no mês da data; separar "previsto" de "realizado" fica para quando houver contas a pagar e a receber.
- Venda de leite, por enquanto, é lançada à mão na categoria "Venda de leite"; a integração automática vem com o módulo Leite.
- O custo de tratamentos não vira despesa automaticamente nesta versão (planejamento 5.4, opcional).
- O lote da venda é escolhido animal por animal, com a ajuda do filtro por pasto e categoria, como no Manejo em lote.
- Comprador é só um nome nesta versão; cadastro de compradores fica para depois.
- Relatórios em tela; exportar para planilha ou PDF fica para depois.
