# Feature Specification: Módulo Nutrição

**Feature Branch**: `005-modulo-nutricao`

**Created**: 2026-11-04

**Status**: Draft

**Input**: User description: "Módulo Nutrição, terceiro módulo pago (decisões D2, D4 e D6; seção 6 de docs/modulos/Planejamento-modulos.md). Liberado por fazenda pelo painel do administrador e protegido pelo bloqueio da fase 0 (spec 002): ativo lança e consulta, desativado fica só consulta, não contratado vê a vitrine. Usa animais, pastos e categorias do pacote inicial e o mesmo jeito de escolher grupos do Manejo em lote. Escopo: insumos e estoque (cadastro, entradas, baixas, estoque atual, alerta de estoque baixo); silo (tipo, toneladas ensiladas, fechamento e abertura, consumo diário e previsão de duração); dietas e fornecimento (dieta por categoria ou lote, fornecimento diário dando baixa no estoque, custo de alimentação por animal por dia e por lote). Valores em reais só para o dono; o funcionário lança entradas, baixas e fornecimento sem ver dinheiro. Fora do escopo: integração compra → despesa no Financeiro, formulação por exigência nutricional, pesagem de cocho e balança. Substitui as rotas de exemplo da Nutrição da fase 0. Pensado para o celular e para o curral."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Insumos e estoque (Priority: P1)

O dono cadastra o que a fazenda usa para alimentar o gado — silagem, ração, sal mineral, núcleo, feno, concentrado — e quem chega com a carga anota a entrada: "Ração 22%, 40 sacos". Quando sai alguma coisa que não foi para o cocho (perda, estrago), alguém dá baixa com o motivo. A qualquer hora, o sistema mostra quanto tem de cada insumo e avisa quando algum está abaixo do mínimo.

**Why this priority**: sem saber o que tem no depósito, não dá para planejar compra nem fornecimento; é a base de todo o módulo.

**Independent Test**: numa fazenda com a Nutrição ativa, cadastrar "Sal mineral" com mínimo de 5 sacos, lançar entrada de 20 sacos, dar baixa de 16 por perda e conferir o estoque de 4 sacos com o alerta de estoque baixo.

**Acceptance Scenarios**:

1. **Given** a Nutrição ativa, **When** o dono cadastra "Ração 22%" com unidade base kg, a unidade "saco" = 25 kg e estoque mínimo de 250 kg, **Then** o insumo aparece na lista com estoque zero e em alerta.
2. **Given** o insumo cadastrado, **When** o funcionário lança a entrada de 40 sacos comprados em 04/11, sem preço, **Then** o estoque mostra "1.000 kg · 40 sacos", o alerta some e a entrada fica "aguardando preço" para o dono.
3. **Given** 40 sacos em estoque, **When** alguém dá baixa de 2 sacos por perda (molhou), **Then** o estoque fica em 38 e a baixa aparece no histórico com o motivo e quem lançou.
4. **Given** uma entrada lançada errada, **When** alguém a cancela com motivo, **Then** o estoque é recalculado e a entrada fica no histórico marcada como cancelada.
5. **Given** a Nutrição desativada (só consulta), **When** alguém abre o estoque, **Then** vê tudo mas não lança.

---

### User Story 2 - Dietas e fornecimento do dia (Priority: P1)

O dono cria os lotes de alimentação (ex.: "Vacas em lactação", "Bezerras desmamadas") escolhendo os animais — com o filtro por pasto e categoria para marcar vários de uma vez — e monta a dieta de cada lote: por exemplo, para as vacas em lactação, 25 kg de silagem, 4 kg de ração 22% e 0,15 kg de sal mineral por animal por dia. Na hora do trato, quem está no curral abre o fornecimento do dia, escolhe o lote, vê quanto de cada insumo vai dar (quantidade por animal × número de animais), ajusta se precisar e confirma; o estoque baixa sozinho.

**Why this priority**: é o uso diário do módulo; o fornecimento dá a baixa que mantém o estoque certo e o consumo que alimenta o silo e o custo.

**Independent Test**: criar um lote de 20 animais com uma dieta de 3 insumos, fazer o fornecimento do dia, conferir as quantidades sugeridas (dieta × 20) e o estoque de cada insumo baixado; tentar fornecer mais do que tem e ver o aviso.

**Acceptance Scenarios**:

0. **Given** a Nutrição ativa, **When** o dono cria o lote "Vacas em lactação" marcando 20 vacas pelo filtro de pasto e categoria, **Then** o lote mostra 20 animais; incluir uma dessas vacas em outro lote tira ela deste.
1. **Given** a dieta "Lactação" com 25 kg de silagem, 4 kg de ração e 0,15 kg de sal por animal por dia, em vigor no lote de 20 animais, **When** o tratador abre o fornecimento de hoje desse lote, **Then** vê 500 kg de silagem, 80 kg de ração e 3 kg de sal sugeridos.
2. **Given** as quantidades sugeridas, **When** o tratador ajusta a silagem para 480 kg e confirma, **Then** o fornecimento é gravado com as quantidades dadas e o estoque de cada insumo baixa na mesma hora.
3. **Given** um insumo com estoque menor que a quantidade do fornecimento, **When** o tratador confirma, **Then** o sistema avisa que o estoque vai ficar negativo e pede confirmação (o trato não espera o cadastro).
4. **Given** um fornecimento lançado errado, **When** alguém o cancela com motivo, **Then** as baixas voltam ao estoque e o fornecimento fica no histórico como cancelado.
5. **Given** um lote sem dieta, **When** o tratador abre o fornecimento, **Then** pode lançar os insumos à mão, do mesmo jeito.

---

### User Story 3 - Silo (Priority: P2)

A fazenda faz silagem e guarda em silos. O dono cadastra cada silo — tipo (trincheira, superfície, bag), toneladas ensiladas e a data de fechamento — e registra quando abriu. Daí em diante, o fornecimento de silagem sai do silo aberto, e o sistema mostra o consumo médio por dia e quantos dias o silo ainda dura.

**Why this priority**: a silagem é o maior volume da dieta e acabar o silo no meio da seca é um prejuízo grande; a previsão permite planejar; depende do fornecimento (US2).

**Independent Test**: cadastrar um silo de 300 t fechado em 15/03 e aberto em 01/10, fornecer silagem por 10 dias somando 30 t, e conferir consumo médio de 3 t/dia, saldo de 270 t e previsão de 90 dias.

**Acceptance Scenarios**:

1. **Given** a Nutrição ativa, **When** o dono cadastra um silo trincheira de 300 t fechado em 15/03, **Then** o silo aparece como fechado, com 300 t, e o estoque de silagem mostra "reserva em silos fechados: 300 t" sem mudar o disponível.
2. **Given** o silo fechado, **When** alguém registra a abertura em 01/10, **Then** o silo passa a aberto, o estoque disponível de silagem sobe 300 t (entrada de produção própria do silo) e a silagem fornecida a partir daí sai dele.
3. **Given** 30 t fornecidas em 10 dias, **When** alguém abre o silo, **Then** vê saldo de 270 t, consumo médio de 3 t/dia (últimos 7 dias com fornecimento) e "dura mais 90 dias, até DD/MM".
4. **Given** dois silos abertos, **When** o tratador fornece silagem, **Then** escolhe de qual silo saiu (o mais antigo vem marcado).
5. **Given** o silo acabou, **When** alguém o encerra, **Then** ele sai da escolha do fornecimento e fica no histórico com o total consumido e a sobra ou falta em relação ao ensilado.

---

### User Story 4 - Custo da alimentação (Priority: P2)

O dono quer saber quanto custa alimentar o gado: o custo por animal por dia e por lote, no dia e no mês, a partir do que foi fornecido e do preço de cada insumo.

**Why this priority**: transforma o controle de estoque em decisão econômica (trocar ração, ajustar dieta); depende de entradas com preço e do fornecimento.

**Independent Test**: com preços nas entradas e um mês de fornecimentos a um lote de 20 animais, conferir que o custo do mês e o custo por animal por dia batem com a conta manual; conferir que o funcionário não vê nenhum valor.

**Acceptance Scenarios**:

1. **Given** fornecimentos de um mês a um lote de 20 animais e preços conhecidos, **When** o dono abre o custo do lote no mês, **Then** vê o total em reais, o custo por animal por dia e o quanto cada insumo pesou no custo.
2. **Given** o custo por lote, **When** o dono compara os lotes, **Then** vê todos lado a lado com o custo por animal por dia.
3. **Given** o funcionário, **When** ele abre qualquer tela da Nutrição, **Then** não vê preço, valor nem custo em reais.
4. **Given** entradas lançadas pelo funcionário sem preço, **When** o dono entra na Nutrição, **Then** vê o aviso "N entradas aguardando preço"; ao informar o preço, o custo médio e o custo dos fornecimentos são atualizados.

---

### Edge Cases

- Estoque negativo: permitido com confirmação (o trato acontece mesmo que a entrada não tenha sido lançada); o insumo aparece em destaque como "estoque negativo — falta lançar entrada".
- Insumo desativado: some da escolha de entradas, dietas e fornecimento; o histórico continua; não há exclusão de insumo usado.
- Dieta com insumo desativado: o insumo aparece riscado na dieta e não é sugerido no fornecimento.
- Animal vendido, morto ou descartado: sai do lote na data da saída (FR-010b); o fornecimento guarda quantos animais havia no lote naquele dia.
- Fornecimento com data passada: a sugestão usa os animais que estavam no lote naquela data.
- Insumo sem nenhuma entrada com preço: custo zero e aviso "sem preço" no relatório de custo.
- Dois fornecimentos para o mesmo lote no mesmo dia (trato da manhã e da tarde): permitidos, somam no dia.
- Fornecimento com data futura: recusado. Data passada: aceita (lançar o trato de ontem esquecido).
- Silo fechado não entra no estoque disponível: com dois silos fechados e nenhum aberto, o estoque de silagem pode estar zerado e o sistema mostra a reserva (FR-016).
- Silo aberto sem nenhum fornecimento ainda: previsão "sem consumo registrado".
- Silagem fornecida com nenhum silo aberto: a baixa sai do estoque do insumo silagem, sem silo (fazenda que compra silagem pronta).
- Consumo maior que o ensilado: o silo mostra saldo negativo em destaque (as toneladas ensiladas eram estimativa).
- Nutrição desativada com histórico: tudo fica visível em só consulta (spec 002, FR-011a).
- Animal, pasto, insumo ou silo de outra fazenda: recusado (constituição, princípio I).

## Clarifications

### Session 2026-11-04

- Q: Como funcionam as unidades dos insumos? → A: Cada lançamento escolhe a unidade, e o sistema converte por uma tabela de unidades do insumo para a unidade base (FR-004a, FR-004b).
- Q: A dieta é de qual grupo de animais? → A: De um lote de alimentação com nome, criado na Nutrição, com os animais escolhidos — para o módulo ficar completo (FR-010 a FR-010b).
- Q: Onde se informa o preço dos insumos? → A: Em cada entrada, pelo dono; o custo é a média das entradas; entradas do funcionário ficam aguardando preço (FR-021, FR-021a).
- Q: A silagem do silo entra no estoque do insumo? → A: Só quando o silo é aberto (entrada de produção própria na data da abertura); silo fechado aparece à parte, como reserva (FR-016, FR-017).
- Q: Quem pode incluir e tirar animais dos lotes de alimentação? → A: Dono e funcionário mexem nos animais dos lotes; criar ou desativar lote e escolher a dieta é só do dono (FR-002, FR-010a).

## Requirements *(mandatory)*

### Functional Requirements

**Acesso**

- **FR-001**: Todas as telas e ações da Nutrição MUST respeitar a situação do módulo na fazenda (spec 002): ativo lança e consulta, só consulta apenas consulta, não contratado vê a vitrine.
- **FR-002**: Dono e funcionário MUST poder lançar entradas, baixas, fornecimentos e aberturas de silo. Só o dono MUST ver e informar preço, valor e custo em reais; nenhuma resposta ao funcionário traz valor em reais, e uma tentativa do funcionário de informar preço MUST ser recusada. Cadastro e alteração de insumos, dietas e silos, e criar ou desativar lotes de alimentação e escolher a dieta de cada lote, são do dono; incluir, tirar e trocar animais de lote é de dono e funcionário.
- **FR-003**: As rotas de exemplo da Nutrição criadas na fase 0 MUST ser removidas.

**Insumos e estoque**

- **FR-004**: O dono MUST poder cadastrar insumos com nome (único na fazenda, sem acento e sem maiúscula), tipo (silagem, ração, sal mineral, núcleo, feno, concentrado, outro), unidade base (kg, litro ou unidade), tabela de unidades (FR-004a) e estoque mínimo opcional. Insumo usado MUST NOT ser excluído, só desativado.
- **FR-004a**: Cada insumo MUST ter uma tabela de unidades com o fator de conversão para a unidade base (ex.: saco = 25 kg, tonelada = 1.000 kg, fardo = 18 kg); tonelada vem pronta para insumos em kg. Cada lançamento (entrada, baixa, item de dieta, fornecimento) MUST escolher uma unidade da tabela; o sistema guarda a quantidade lançada, a unidade e a quantidade convertida para a base, e o estoque é sempre calculado na unidade base. O estoque MUST ser mostrado na base e, quando houver, na unidade de compra preferida do insumo (ex.: "1.000 kg · 40 sacos").
- **FR-004b**: Mudar o fator de uma unidade já usada MUST NOT alterar lançamentos antigos (cada um guardou a quantidade convertida); unidade usada só é desativada.
- **FR-005**: O sistema MUST registrar entradas com data (não futura), insumo, quantidade (maior que zero), origem (compra ou produção própria), fornecedor opcional e observação; o preço segue a FR-021.
- **FR-006**: O sistema MUST registrar baixas avulsas com data, insumo, quantidade e motivo (perda, estrago, doação, outro), além das baixas feitas pelo fornecimento (FR-012).
- **FR-007**: O estoque de cada insumo MUST ser a soma das entradas menos a soma das baixas não canceladas; o sistema MUST mostrar o estoque atual de todos os insumos, com destaque para os abaixo do mínimo e os negativos.
- **FR-008**: Entradas, baixas e fornecimentos MUST ser cancelados com motivo, nunca excluídos; todo registro guarda quem lançou e quem alterou ou cancelou por último (constituição, princípio III).
- **FR-009**: O sistema MUST mostrar o histórico de movimentações de cada insumo (entradas, baixas e fornecimentos), mais novo primeiro.

**Dietas e fornecimento**

- **FR-010**: O dono MUST poder montar dietas com nome e a lista de insumos com a quantidade por animal por dia (com unidade, FR-004a). Cada **lote de alimentação** tem uma dieta em vigor; a mesma dieta pode servir a vários lotes. Dieta pode ser desativada; alterá-la vale para os fornecimentos seguintes.
- **FR-010a**: O dono MUST poder criar **lotes de alimentação** com nome (único na fazenda); dono e funcionário MUST poder escolher os animais, usando o filtro por pasto e categoria do Manejo em lote para marcar vários de uma vez, e incluir ou tirar animais depois. Um animal MUST estar em no máximo um lote de alimentação por vez; incluir num lote tira do anterior. O lote guarda o histórico de entradas e saídas de animais.
- **FR-010b**: Animal que sai do rebanho (venda, morte, descarte) MUST sair do lote na data da saída, sozinho. Lote vazio continua existindo até o dono desativá-lo.
- **FR-011**: O fornecimento MUST mostrar, para a data (padrão hoje) e o lote escolhidos, os insumos da dieta com a quantidade sugerida = quantidade por animal × número de animais no lote na data, e permitir ajustar cada quantidade, tirar ou acrescentar insumos antes de confirmar.
- **FR-012**: Ao confirmar, numa única operação, o sistema MUST gravar o fornecimento (data, lote, número de animais, dieta usada, insumos e quantidades dadas) e dar baixa de cada insumo no estoque; se alguma parte falhar, nada é gravado.
- **FR-013**: Se a quantidade fornecida deixar algum insumo com estoque negativo, o sistema MUST avisar e pedir confirmação antes de gravar.
- **FR-014**: Cancelar um fornecimento MUST devolver as quantidades ao estoque (e ao silo, se for o caso).
- **FR-015**: O fornecimento MUST caber numa tela de celular, com o lote lembrado do último trato e o teclado numérico nas quantidades (constituição, princípio IV).

**Silo**

- **FR-016**: O dono MUST poder cadastrar silos com nome, tipo (trincheira, superfície, bag), toneladas ensiladas (estimativa), data de fechamento, o insumo de silagem a que pertence e, opcionalmente, o custo da ensilagem em reais (só dono). Silo fechado é **reserva**: aparece à parte no estoque ("em silos fechados: 300 t") e não entra no estoque disponível do insumo.
- **FR-017**: O sistema MUST registrar a abertura do silo (data não futura, não antes do fechamento) e o encerramento (silo acabou). A abertura MUST lançar, na mesma operação, uma entrada de produção própria no insumo de silagem com as toneladas ensiladas, na data da abertura, ligada ao silo (com o custo da ensilagem, se informado); cancelar a abertura cancela essa entrada.
- **FR-018**: A silagem fornecida MUST sair de um silo aberto do mesmo insumo, escolhido no fornecimento (o aberto há mais tempo vem marcado); sem silo aberto, sai só do estoque do insumo.
- **FR-019**: Para cada silo aberto, o sistema MUST mostrar o consumido, o saldo (ensilado − consumido), o consumo médio por dia (média dos últimos 7 dias com fornecimento) e a previsão de duração em dias e a data em que acaba.

**Custo**

- **FR-020**: O custo de cada fornecimento MUST ser a soma, por insumo, da quantidade dada × o custo unitário do insumo na data.
- **FR-021**: O preço MUST ser informado pelo dono em cada entrada de compra (valor total da entrada, em reais). Entrada lançada pelo funcionário fica "aguardando preço", e o dono vê a lista e um aviso enquanto houver pendentes; o dono informa o preço depois. Entrada de produção própria pode ter custo informado ou ficar sem custo.
- **FR-021a**: O custo unitário de cada insumo na data MUST ser o **custo médio** das entradas com preço até aquela data (soma dos valores ÷ soma das quantidades na unidade base); entradas aguardando preço não entram no médio até receberem preço, e o custo do fornecimento é recalculado na leitura.
- **FR-022**: O dono MUST ver o custo da alimentação por lote e por período (padrão mês atual): total em reais, custo por animal por dia (total ÷ animais-dia fornecidos) e a parte de cada insumo; e a comparação entre lotes.

### Key Entities *(include if feature involves data)*

- **Insumo**: fazenda, nome, tipo, unidade base, unidade de compra preferida, estoque mínimo, ativo; o estoque é calculado das movimentações.
- **Unidade do insumo**: insumo, nome (saco, tonelada, fardo…), fator para a unidade base, ativa.
- **Lote de alimentação**: fazenda, nome, dieta em vigor, ativo, animais com data de entrada e de saída.
- **Entrada de insumo**: insumo, data, quantidade lançada, unidade, quantidade na base, origem (compra ou produção), fornecedor, valor em reais (só dono) ou aguardando preço, auditoria e cancelamento.
- **Baixa de insumo**: insumo, data, quantidade, motivo (perda, estrago, doação, outro, ou fornecimento), silo de onde saiu (silagem), auditoria e cancelamento.
- **Dieta**: fazenda, nome, ativa, itens (insumo, quantidade por animal por dia e unidade).
- **Fornecimento**: fazenda, data, lote, número de animais, dieta usada, itens (insumo, quantidade dada, silo), custo calculado (só dono), auditoria e cancelamento.
- **Silo**: fazenda, nome, tipo, insumo de silagem, toneladas ensiladas, fechamento, abertura, encerramento.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: O tratador lança o fornecimento do dia de um lote com dieta pronta, no celular, em menos de 30 segundos.
- **SC-002**: Em 100% dos casos de teste, o estoque de cada insumo é igual a entradas − baixas − fornecimentos não cancelados.
- **SC-003**: A previsão de duração do silo e o custo por animal por dia conferem com a conta manual em 100% dos casos de teste.
- **SC-004**: Em 100% das tentativas, o funcionário não vê nem recebe nenhum valor em reais da Nutrição.
- **SC-005**: Nenhum dado da Nutrição de uma fazenda aparece para outra.
- **SC-006**: O estoque e o custo do mês de uma fazenda com 30 insumos e um ano de fornecimentos diários abrem em menos de 2 segundos.

## Assumptions

- Quantidades com até duas casas decimais (ex.: 0,15 kg de sal por animal); a quantidade convertida para a base guarda até três.
- O sistema não acompanha o consumo individual de cada animal: o custo por animal é o do lote dividido pelos animais-dia.
- Lote de alimentação é da Nutrição e não muda o pasto do animal; mover de pasto continua no pacote inicial.
- Sobras de cocho, balança e formulação por exigência nutricional (proteína, energia) ficam fora desta versão.
- A integração automática entrada com preço → despesa no Financeiro fica para a fase de integrações (D6); até lá, a compra é lançada à mão no Financeiro, se a fazenda quiser.
- Pasto (capim) não é insumo: a Nutrição trata só do que é fornecido no cocho ou no saleiro.
- Relatórios em tela; exportar para planilha fica para depois.
