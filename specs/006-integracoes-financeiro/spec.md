# Feature Specification: Integrações dos módulos com o Financeiro

**Feature Branch**: `006-integracoes-financeiro`

**Created**: 2026-11-04

**Status**: Draft

**Input**: User description: "Integrações dos módulos com o Financeiro (fase 3; decisão D6 e seção 5.4 de docs/modulos/Planejamento-modulos.md). Quando a fazenda tem o Financeiro e o outro módulo ativos, os lançamentos de dinheiro feitos nos módulos viram receitas e despesas no Financeiro automaticamente: Leite (entregas com preço → receita em "Venda de leite"); Nutrição (entradas de compra com valor → despesa, por padrão "Ração e sal"); opcional: custo de tratamentos e da ensilagem do silo. Corrigir ou cancelar na origem atualiza ou cancela o lançamento no Financeiro; o lançamento gerado não é editado direto no Financeiro. Cada módulo continua funcionando sozinho e um módulo pago não importa outro; só o dono vê valores. Fora do escopo: contas a pagar e a receber, conciliação bancária, notas fiscais."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Recebimento do leite vira receita (Priority: P1)

O laticínio paga uma vez por mês. Quando o dinheiro entra, o dono abre as entregas do mês no Leite e confirma o recebimento: a data em que recebeu e o valor recebido (o sistema já traz o total calculado das entregas com preço; o dono ajusta se o laticínio pagou bonificação ou desconto). Com o Financeiro ativo, a receita do mês aparece sozinha em "Venda de leite", na data do recebimento, igual ao que entrou na conta.

**Why this priority**: a venda do leite é a principal receita da fazenda leiteira; sem a integração, o dono lança o mesmo dinheiro em dois lugares ou o resultado do Financeiro fica errado.

**Independent Test**: numa fazenda com Leite e Financeiro ativos, lançar três entregas com preço, confirmar o recebimento do mês com o valor calculado e conferir a receita no Financeiro; desfazer o recebimento e conferir a receita cancelada.

**Acceptance Scenarios**:

1. **Given** Leite e Financeiro ativos e entregas com preço em outubro somando R$ 9.024,60, **When** o dono confirma o recebimento de outubro em 10/11, **Then** aparece no Financeiro uma receita de R$ 9.024,60 em "Venda de leite", na data 10/11, descrita como "Leite de outubro/2026 — 3.471 L", marcada como vinda do Leite.
2. **Given** o laticínio pagou R$ 9.300,00 (bonificação de qualidade), **When** o dono confirma o recebimento com esse valor, **Then** a receita é de R$ 9.300,00 e o Leite mostra a diferença de R$ 275,40 em relação ao calculado.
3. **Given** um mês com recebimento confirmado, **When** alguém tenta mudar litros, preço ou data de uma entrega desse mês, ou cancelá-la, **Then** o sistema recusa e diz que é preciso desfazer o recebimento do mês antes.
4. **Given** o recebimento confirmado, **When** o dono o desfaz com motivo, **Then** a receita é cancelada no Financeiro e as entregas do mês voltam a poder ser corrigidas.
5. **Given** uma receita vinda do Leite, **When** o dono tenta editá-la ou cancelá-la no Financeiro, **Then** o sistema recusa e indica que a correção é feita no Leite.
6. **Given** a fazenda sem o Financeiro (ou com ele só consulta), **When** o dono confirma o recebimento, **Then** o recebimento fica registrado no Leite e nada é lançado no Financeiro.

---

### User Story 2 - Compras da Nutrição viram despesa (Priority: P1)

O dono tem a Nutrição e o Financeiro. Quando uma entrada de compra de insumo recebe valor — lançada pelo dono já com o valor, ou do funcionário depois que o dono informa o preço — a despesa aparece sozinha no Financeiro. A categoria vem do insumo (por padrão "Ração e sal"; o dono pode escolher outra por insumo).

**Why this priority**: a alimentação é o maior custo da fazenda; com a integração, o resultado do Financeiro mostra esse custo sem trabalho extra.

**Independent Test**: com Nutrição e Financeiro ativos, lançar a compra de 40 sacos de ração por R$ 3.200,00 e conferir a despesa em "Ração e sal" na data da compra; informar o preço de uma entrada do funcionário e conferir a segunda despesa; cancelar a primeira entrada e conferir a despesa cancelada.

**Acceptance Scenarios**:

1. **Given** Nutrição e Financeiro ativos, **When** o dono lança uma compra com valor, **Then** aparece uma despesa com o mesmo valor, na data da compra, na categoria do insumo, com a descrição "Insumo — quantidade unidade".
2. **Given** uma entrada aguardando preço, **When** o dono informa o valor, **Then** a despesa é lançada nessa hora.
3. **Given** a despesa gerada, **When** a entrada é cancelada na Nutrição, **Then** a despesa é cancelada junto.
4. **Given** o dono escolheu "Combustível e energia" para o insumo "Diesel do trator", **When** uma compra de diesel recebe valor, **Then** a despesa vai para essa categoria.
5. **Given** uma despesa vinda da Nutrição, **When** o dono tenta editá-la no Financeiro, **Then** o sistema recusa e indica a Nutrição.

---

### User Story 3 - Ver de onde veio cada lançamento (Priority: P2)

No Financeiro, o dono vê nos lançamentos gerados a origem (Leite ou Nutrição) e um link para o registro de origem (a entrega, a entrada de insumo), e pode filtrar os lançamentos por origem.

**Why this priority**: dá confiança nos números e evita lançar à mão o que já veio sozinho.

**Independent Test**: abrir os lançamentos do mês, filtrar por "Leite" e "Nutrição" e abrir o registro de origem a partir de um lançamento.

**Acceptance Scenarios**:

1. **Given** lançamentos gerados, **When** o dono abre a lista do mês, **Then** cada um mostra a origem e um link para o registro de origem.
2. **Given** o filtro por origem, **When** o dono escolhe "Nutrição", **Then** só aparecem as despesas vindas da Nutrição.

---

### Edge Cases

- Um dos dois módulos desativado (só consulta) ou não contratado: nada novo é lançado; os lançamentos já gerados ficam como estão. Corrigir ou cancelar o registro de origem com o Financeiro só consulta não mexe no Financeiro.
- Integração vale só daqui para frente (FR-012): recebimentos de leite confirmados e compras que receberam valor antes de os dois módulos estarem ativos juntos (ou enquanto um deles esteve desligado) não são lançados depois; se o dono quiser, lança à mão no Financeiro.
- Recebimento confirmado com o Financeiro desligado: fica só no Leite; se o Financeiro voltar a ficar ativo, esse recebimento não é lançado (só daqui para frente).
- Desfazer um recebimento que não gerou receita (Financeiro estava desligado): só desfaz no Leite.
- Mês com entregas sem preço: o recebimento é recusado, com a lista das entregas sem preço; o dono informa o preço (por entrega ou o preço do mês) e confirma de novo (FR-006b).
- Entrada de produção própria com valor e custo da ensilagem do silo: não viram despesa nesta versão.
- Valor zero: não lança.
- O mesmo dinheiro lançado à mão antes no Financeiro: o sistema não detecta duplicidade; ao ligar a integração, o dono vê um aviso para conferir os lançamentos manuais de "Venda de leite" e "Ração e sal".
- Categoria escolhida para o insumo desativada no Financeiro: a despesa vai para "Outras despesas" e o dono é avisado.
- Funcionário: não vê nenhum valor, nem a ligação com o Financeiro.
- Lançamento gerado é de outra fazenda: impossível; cada fazenda só gera os seus (constituição, princípio I).

## Clarifications

### Session 2026-11-04

- Q: A receita do leite é uma por entrega ou uma por mês? → A: Uma por mês, lançada quando o dono confirma o recebimento (US1, FR-006 a FR-007a).
- Q: Quais custos opcionais entram agora? → A: Só o leite e as compras de insumo; o custo de tratamentos fica para depois e, quando vier, usará um preço fixo cadastrado no produto. O custo da ensilagem também fica fora.
- Q: O que acontece com o que foi lançado antes da integração ligar? → A: Só daqui para frente (FR-012).
- Q: Para confirmar o recebimento do mês, as entregas precisam ter preço por litro? → A: Sim, todas as entregas do mês; o valor do litro é sabido pela grande maioria dos donos (FR-006b).

## Requirements *(mandatory)*

### Functional Requirements

**Regras gerais**

- **FR-001**: A integração de um módulo com o Financeiro MUST acontecer só quando os dois estão ativos na fazenda no momento do lançamento; com qualquer um deles só consulta ou não contratado, nada é lançado nem alterado no Financeiro.
- **FR-002**: Cada módulo MUST continuar funcionando sozinho; nenhuma tela ou regra do Leite ou da Nutrição pode depender do Financeiro estar contratado.
- **FR-003**: Todo lançamento gerado MUST guardar a origem (Leite ou Nutrição) e o registro de origem; não pode ser editado nem cancelado direto no Financeiro (mesma regra da venda de animais); a correção é feita na origem e reflete no Financeiro na mesma operação.
- **FR-004**: Se a gravação no Financeiro falhar, a operação na origem MUST falhar também (nada pela metade).
- **FR-005**: Só o dono MUST ver os lançamentos e valores; o funcionário continua sem ver dinheiro em nenhum dos módulos.

**Leite → receita**

- **FR-006**: O dono MUST poder confirmar o **recebimento do leite de um mês** no Leite, com a data do recebimento (não futura e não antes do primeiro dia do mês das entregas), o valor recebido (padrão: o total calculado das entregas com preço do mês) e observação opcional; o sistema guarda o total calculado, os litros e a diferença. Um mês tem no máximo um recebimento em vigor.
- **FR-006b**: Para confirmar o recebimento, todas as entregas não canceladas do mês MUST ter preço por litro; se alguma estiver sem preço, o sistema MUST recusar e mostrar quais são.
- **FR-006a**: Com o Leite e o Financeiro ativos, confirmar o recebimento MUST lançar, na mesma operação, uma receita em "Venda de leite" com o valor recebido, na data do recebimento, descrita como "Leite de mês/ano — litros L".
- **FR-007**: Com o recebimento do mês confirmado, mudar litros, preço ou data de uma entrega do mês, cancelá-la, lançar entrega nova no mês ou mudar o preço do mês MUST ser recusado, com a orientação de desfazer o recebimento antes.
- **FR-007a**: Desfazer o recebimento (dono, com motivo) MUST cancelar a receita gerada, se houver, e liberar as entregas do mês para correção.

**Nutrição → despesa**

- **FR-008**: Entradas de **compra** não canceladas com valor MUST gerar uma despesa com o valor da entrada, na data da entrada, na categoria do insumo e com a descrição "Insumo — quantidade unidade (fornecedor)".
- **FR-009**: O dono MUST poder escolher, por insumo, a categoria de despesa do Financeiro (padrão: "Ração e sal" para silagem, ração, sal mineral, núcleo, feno e concentrado; "Outras despesas" para outro).
- **FR-010**: Informar o valor de uma entrada aguardando preço MUST lançar a despesa nessa hora; cancelar a entrada MUST cancelar a despesa.

**Origem no Financeiro**

- **FR-011**: A lista de lançamentos do Financeiro MUST mostrar a origem de cada lançamento gerado, com link para o registro de origem, e permitir filtrar por origem (manual, venda de animais, compra de animais, uso, Leite, Nutrição).

**Histórico**

- **FR-012**: A integração MUST valer só para o que acontece com os dois módulos ativos: recebimentos confirmados e compras que recebem valor antes disso não são lançados depois.

### Key Entities *(include if feature involves data)*

- **Lançamento** *(existente, Financeiro)*: ganha as origens Leite e Nutrição e a referência ao registro de origem.
- **Recebimento do leite** *(novo, Leite)*: mês, data do recebimento, litros, total calculado, valor recebido, diferença, observação, receita gerada (quando houver), auditoria e cancelamento (desfazer).
- **Entrega ao laticínio** *(existente, Leite)*: fica travada enquanto o mês tiver recebimento em vigor.
- **Entrada de insumo** *(existente, Nutrição)*: passa a saber qual despesa gerou.
- **Insumo** *(existente, Nutrição)*: ganha a categoria de despesa escolhida pelo dono.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Em 100% dos casos de teste, a receita de "Venda de leite" gerada é igual ao valor recebido confirmado no Leite, na data do recebimento.
- **SC-002**: Em 100% dos casos de teste, o total das despesas vindas da Nutrição no mês é igual ao valor das compras com valor do mês.
- **SC-003**: Em 100% das correções e cancelamentos na origem, o Financeiro fica igual à origem na mesma operação.
- **SC-004**: Com um dos dois módulos desligado, nenhum lançamento é criado ou alterado.
- **SC-005**: O funcionário não vê nenhum valor em reais em nenhuma tela.
- **SC-006**: O dono nunca precisa lançar à mão no Financeiro o leite vendido ou a compra de insumo.

## Assumptions

- A venda de leite ao laticínio e a compra de insumos são as integrações desta versão (planejamento 5.4); as integrações não substituem os lançamentos manuais, que continuam existindo para o resto.
- Depois: custo dos tratamentos com preço fixo por produto (cadastro de produtos do Leite) e custo da ensilagem do silo como despesa.
- Os módulos pagos continuam sem importar um ao outro; a ligação fica numa parte própria de integração, que só age quando os dois módulos estão ativos.
- O registro de uso do Financeiro (itens usados, sem valor) continua existindo; para insumos de alimentação, a Nutrição passa a ser o caminho recomendado.
- Contas a pagar e a receber, vencimento, conciliação bancária e notas fiscais ficam fora.
