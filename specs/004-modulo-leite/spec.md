# Feature Specification: Módulo Leite

**Feature Branch**: `004-modulo-leite`

**Created**: 2026-11-04

**Status**: Draft

**Input**: User description: "Módulo Leite, segundo módulo pago (decisões D2, D3, D4 e D6; seção 4 de docs/modulos/Planejamento-modulos.md). Liberado por fazenda pelo painel do administrador e protegido pelo bloqueio da fase 0 (spec 002): ativo lança e consulta, desativado fica só consulta, não contratado vê a vitrine. Usa animais, partos, tratamentos e cobertura/inseminação do pacote inicial (spec 001). Escopo: lactação e ordenha (por vaca ou só do tanque), DEL e curva de lactação, secagem planejada e real; carência de medicamentos com o leite da vaca como descarte e aviso no Manejo e na ordenha; entregas ao laticínio e análises (CCS, CBT, gordura, proteína); relatórios de produção; raças leiteiras padrão (Holandesa, Girolando, Jersey, Gir). Fora do escopo: integração automática entrega → receita no Financeiro, controle leiteiro oficial e ordenhadeira automática. Substitui as rotas de exemplo do Leite da fase 0. Pensado para o celular e para o curral."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Lactação e ordenha do dia (Priority: P1)

A vaca de leite (de raça leiteira ou marcada pelo dono) pariu e começou a dar leite: a lactação dela começa sozinha no parto registrado. Na hora da ordenha, quem está no curral abre a lista das vacas em lactação, já em ordem de brinco, e digita os litros de cada uma, uma atrás da outra, sem sair da tela. A fazenda que não mede vaca a vaca anota só os litros do tanque no dia. Cada vaca mostra os dias em lactação (DEL).

**Why this priority**: a produção diária é o dado de que tudo depende (relatórios, secagem, comparação com o laticínio); sem ela o módulo não tem uso.

**Independent Test**: numa fazenda com o Leite ativo, registrar o parto de duas vacas, conferir que entraram em lactação com DEL 0, lançar a ordenha da manhã e da tarde das duas e conferir o total do dia por vaca e da fazenda.

**Acceptance Scenarios**:

1. **Given** o Leite ativo e uma vaca que pariu hoje, **When** o parto é registrado, **Then** a vaca passa a "em lactação", com a lactação iniciada na data do parto.
2. **Given** 30 vacas em lactação, **When** o ordenhador abre a ordenha da manhã, **Then** vê a lista com brinco, nome e DEL de cada uma e lança os litros em sequência, avançando para a próxima vaca a cada confirmação.
3. **Given** a ordenha da manhã e da tarde lançadas, **When** alguém abre o dia, **Then** vê os litros de cada vaca por ordenha, o total por vaca e o total da fazenda.
4. **Given** uma fazenda configurada para registrar só o tanque, **When** o ordenhador abre a ordenha, **Then** informa só os litros do tanque no dia (uma ou mais ordenhas), sem lista de vacas.
5. **Given** um valor digitado errado, **When** alguém corrige a ordenha, **Then** o valor novo vale e fica registrado quem corrigiu e quando.
6. **Given** o Leite desativado (só consulta), **When** alguém abre a ordenha, **Then** vê o histórico mas não lança.

---

### User Story 2 - Carência de medicamentos (Priority: P1)

A vaca recebeu um antibiótico com carência de leite. O produto está no cadastro de produtos da fazenda com a carência em dias; ao escolhê-lo no tratamento, a carência vem junto. Até o fim do prazo, o leite dela é descarte: na lista da ordenha a vaca aparece destacada com "Leite descarte até 08/11", os litros dela continuam sendo anotados, mas ficam separados do leite que vai para o tanque. O Manejo também mostra as vacas em carência.

**Why this priority**: mandar leite com resíduo de antibiótico para o laticínio dá multa e perda da carga inteira; é o erro mais caro da atividade e o aviso precisa estar na hora da ordenha.

**Independent Test**: registrar um tratamento com carência de 4 dias numa vaca em lactação, conferir o destaque na ordenha nos 4 dias seguintes, lançar os litros dela e conferir que não entram no leite do tanque; no 5.º dia o destaque some.

**Acceptance Scenarios**:

1. **Given** uma vaca em lactação e o produto "Antibiótico X" cadastrado com carência de 4 dias, **When** um tratamento com esse produto é registrado em 04/11, **Then** a vaca fica com "Leite descarte até 08/11".
1a. **Given** um produto que ainda não está no cadastro, **When** alguém registra o tratamento, **Then** o sistema pede para cadastrá-lo com a carência antes de salvar.
2. **Given** a vaca em carência, **When** o ordenhador chega nela na lista da ordenha, **Then** vê o aviso de descarte em destaque antes de lançar, e os litros lançados ficam marcados como descarte.
2a. **Given** uma fazenda no modo só tanque e uma vaca em carência, **When** o ordenhador abre o turno, **Then** vê primeiro essa vaca em destaque, lança os litros dela como descarte e depois o total do tanque, sem ela.
3. **Given** litros de descarte no dia, **When** alguém vê o total do dia, **Then** aparecem separados: leite para o tanque e leite descartado.
4. **Given** dois tratamentos com carências que se sobrepõem, **Then** vale a data final mais distante.
5. **Given** o tratamento com carência corrigido ou cancelado, **Then** o prazo de descarte é recalculado.
6. **Given** vacas em carência, **When** alguém abre o Manejo, **Then** vê a lista "Leite em descarte" com brinco e data final.

---

### User Story 3 - Secagem (Priority: P2)

Para a vaca descansar antes do próximo parto, ela é seca uns 60 dias antes. O sistema calcula a data planejada de secagem a partir do parto previsto (prenhez confirmada na reprodução) e mostra as vacas a secar nos próximos dias. Quando a vaca é seca de fato, alguém registra a secagem: a lactação termina e a vaca sai da lista da ordenha.

**Why this priority**: evita esquecer de secar (prejudica a próxima lactação) e mantém a lista da ordenha só com quem dá leite; depende da US1.

**Independent Test**: com uma vaca em lactação e prenhe com parto previsto para daqui a 70 dias, conferir a secagem planejada para daqui a 10 dias, conferir que aparece em "A secar nos próximos 15 dias", registrar a secagem e conferir que saiu da ordenha.

**Acceptance Scenarios**:

1. **Given** uma vaca em lactação com parto previsto em 15/01, **Then** a secagem planejada é 16/11 (60 dias antes, prazo ajustável nas Configurações).
2. **Given** vacas com secagem planejada nos próximos 15 dias, **When** alguém abre "Vacas a secar", **Then** vê a lista em ordem de data, com brinco, DEL e litros médios dos últimos 7 dias.
3. **Given** uma vaca em lactação, **When** alguém registra a secagem em 16/11, **Then** a lactação termina nessa data, a vaca passa a "seca" e sai da lista da ordenha.
4. **Given** uma vaca sem prenhez confirmada, **Then** não há secagem planejada, mas a secagem pode ser registrada a qualquer momento (ex.: produção baixa).
5. **Given** uma vaca seca que pariu de novo, **Then** começa uma nova lactação; a anterior fica no histórico.

---

### User Story 4 - Entregas e análises do laticínio (Priority: P2)

O caminhão do laticínio leva o leite do tanque. Quem acompanha a coleta anota a data e os litros entregues; o preço por litro é informado quando o laticínio paga. As análises que o laticínio manda (CCS, CBT, gordura, proteína) são anotadas por entrega ou por mês, para acompanhar a qualidade, que mexe no preço.

**Why this priority**: permite conferir o que foi produzido com o que o laticínio diz que recebeu e acompanhar a qualidade; não bloqueia a ordenha.

**Independent Test**: lançar três entregas na semana, conferir que o total entregue no período aparece ao lado do leite para o tanque registrado na ordenha, informar o preço por litro do mês e lançar uma análise mensal.

**Acceptance Scenarios**:

1. **Given** o Leite ativo, **When** alguém lança "Entrega 05/11, 1.240 litros", **Then** ela aparece na lista de entregas do mês com o total entregue.
2. **Given** entregas e ordenhas no mês, **When** alguém abre as entregas, **Then** vê o total entregue ao lado do leite para o tanque do mesmo período e a diferença.
3. **Given** o pagamento do laticínio, **When** o dono informa o preço por litro de uma entrega ou do mês, **Then** o valor de cada entrega e o total do mês aparecem para o dono.
4. **Given** o resultado do laticínio, **When** alguém lança uma análise de outubro com CCS 350 mil, CBT 80 mil, gordura 3,6 % e proteína 3,2 %, **Then** a análise aparece no histórico de qualidade, mês a mês.

---

### User Story 5 - Relatórios e curva de lactação (Priority: P3)

O dono acompanha a produção: litros por dia e por mês da fazenda, litros por vaca em lactação, produção de cada vaca e a curva de lactação dela (litros por DEL), e o total de cada lactação encerrada.

**Why this priority**: transforma as anotações em decisão (descarte de vaca fraca, ajuste de dieta); depende das US1 e US3 para ter dados.

**Independent Test**: com ordenhas de 30 dias, conferir o gráfico diário, a média de litros por vaca em lactação, a curva de uma vaca e, numa vaca seca, o total da lactação igual à soma manual.

**Acceptance Scenarios**:

1. **Given** ordenhas no mês, **When** o dono abre a produção, **Then** vê os litros de cada dia em gráfico, o total do mês e a média de litros por vaca em lactação por dia.
2. **Given** uma vaca com ordenhas por vaca, **When** o dono abre a página dela, **Then** vê a curva de lactação (litros por dia × DEL), o pico e a média da lactação atual.
3. **Given** uma vaca seca, **Then** a lactação encerrada mostra início, fim, duração em dias e total de litros.
4. **Given** ordenhas só do tanque, **Then** os relatórios da fazenda funcionam, e os relatórios por vaca dizem que a fazenda não mede vaca a vaca.

---

### Edge Cases

- Primeiro dia com o Leite liberado: a lista da ordenha começa vazia; o dono abre cada vaca de leite que está dando leite e inicia a lactação dela com a data de início (FR-006). A ordenha mostra o atalho "Incluir vaca em lactação" enquanto a lista estiver vazia.
- Parto de vaca de corte (raça não leiteira, sem marca "vaca de leite"): não inicia lactação; se o dono marcar a vaca depois, pode iniciar a lactação na data desse parto (FR-004b).
- Funcionário tenta informar preço por litro, ou chama uma consulta com valores: recusado (FR-002).
- Parto com bezerro morto (natimorto): a vaca também entra em lactação (ela dá leite do mesmo jeito).
- Aborto (parto não concluído) não inicia lactação nesta versão; quem quiser registra o início da lactação à mão (FR-006).
- Vaca que já estava em lactação e pariu de novo sem secagem registrada: a lactação anterior termina no dia anterior ao novo parto e uma nova começa.
- Vaca vendida, morta ou descartada: a lactação termina na data da saída e ela sai da ordenha; a ordenha daquela data continua no histórico.
- Parto corrigido ou cancelado no pacote inicial: a lactação ligada a ele acompanha a nova data ou deixa de existir (se não tiver ordenhas, some; se tiver, fica e o dono é avisado).
- Ordenha lançada duas vezes para a mesma vaca e o mesmo turno do mesmo dia: a segunda substitui a primeira (corrige), não soma.
- Litros zero numa vaca da lista: aceito (vaca com problema no dia); vaca sem lançamento no turno fica "não ordenhada", diferente de zero.
- Litros acima de 80 por ordenha: o sistema pede confirmação (provável erro de digitação).
- Fazenda que muda de "só tanque" para "por vaca" (ou o contrário): vale a partir do dia da mudança; o histórico fica como foi lançado.
- Carência informada num tratamento de vaca seca: o prazo vale do mesmo jeito; se a vaca parir dentro dele, o leite da nova lactação é descarte até o fim.
- Data de ordenha futura: recusada. Data passada: aceita (lançar o dia de ontem esquecido).
- Entrega com litros maiores que o leite para o tanque registrado: aceita, mas a diferença aparece em destaque.
- Leite desativado com histórico: tudo fica visível em só consulta (spec 002, FR-011a); a lactação continua começando nos partos (para não perder o início), mas ninguém lança ordenha.
- Animal macho, ou fêmea de outra fazenda: recusado na ordenha e na lactação (constituição, princípio I).

## Clarifications

### Session 2026-11-04

- Q: Quais vacas entram em lactação no parto? → A: Só a vaca de leite: de raça leiteira ou marcada pelo dono como "vaca de leite"; o dono também pode tirar uma vaca de raça leiteira (FR-004, FR-004a, FR-004b).
- Q: O que o funcionário faz e vê no Leite? → A: Lança ordenha, secagem, entregas e análises, mas não vê preço por litro nem valor das entregas, como no Financeiro (FR-002).
- Q: Onde se informa a carência do medicamento? → A: Num cadastro de produtos com a carência, que preenche o tratamento sozinho (FR-015 a FR-015b).
- Q: Quando o Leite é liberado numa fazenda que já tem vacas dando leite, como elas entram em lactação? → A: À mão, uma a uma, na página de cada vaca de leite, com a data de início; sem inclusão automática (FR-006).
- Q: Na fazenda que anota só o tanque, como fica o leite de uma vaca em carência? → A: As vacas em carência são anotadas uma a uma, mesmo no modo tanque, como descarte; o resto fica só no total do tanque (FR-012a).

## Requirements *(mandatory)*

### Functional Requirements

**Acesso**

- **FR-001**: Todas as telas e ações do Leite MUST respeitar a situação do módulo na fazenda (spec 002): ativo lança e consulta, só consulta apenas consulta, não contratado vê a vitrine.
- **FR-002**: Dono e funcionário MUST poder lançar e consultar ordenha, lactação, secagem, entregas (litros) e análises, e cadastrar produtos com carência. Só o dono MUST ver e informar o preço por litro e o valor das entregas; uma chamada do funcionário que envolva preço ou valor MUST ser recusada, e nenhuma resposta ao funcionário traz valor em reais (mesma regra do Financeiro). Marcar ou desmarcar "vaca de leite" e mudar as Configurações do Leite é só do dono.
- **FR-003**: As rotas de exemplo do Leite criadas na fase 0 MUST ser removidas.

**Lactação**

- **FR-004**: A lactação MUST começar na data do parto registrado no pacote inicial (bezerro vivo ou morto) só para a **vaca de leite**: fêmea de raça leiteira ou marcada pelo dono como "vaca de leite". Parto de vaca que não é de leite não inicia lactação.
- **FR-004a**: Cada raça MUST indicar se é leiteira: as quatro padrão do FR-030 são; as padrão de corte não são; o dono marca as raças próprias da fazenda (ex.: um mestiço).
- **FR-004b**: Na página da vaca, o dono MUST poder escolher "vaca de leite": "pela raça" (padrão), "sim" ou "não". "Sim" vale para vaca de raça de corte ou sem raça; "não" tira da ordenha uma vaca de raça leiteira (ex.: ama de leite de bezerros). Marcar "sim" numa vaca que pariu há menos de 305 dias MUST oferecer iniciar a lactação na data desse parto.
- **FR-005**: Cada vaca MUST estar em uma situação leiteira: "em lactação" ou "seca" (ou nenhuma, se nunca pariu); essa situação é independente do status reprodutivo (uma vaca pode estar em lactação e prenhe).
- **FR-006**: O sistema MUST permitir iniciar uma lactação à mão, uma vaca de cada vez, na página da vaca de leite, com a data de início (não futura): é assim que entram as vacas que já davam leite quando o Leite foi liberado, as compradas em lactação e as de histórico anterior ao sistema. Não há inclusão automática nem em lote das vacas que já estavam em lactação antes da liberação; só os partos registrados depois dela iniciam lactação sozinhos (FR-004).
- **FR-007**: O sistema MUST mostrar os dias em lactação (DEL = hoje − início da lactação) de cada vaca em lactação.
- **FR-008**: A lactação MUST terminar na secagem, na saída do rebanho (venda, morte, descarte) ou no dia anterior a um novo parto; lactações encerradas ficam no histórico da vaca.

**Ordenha**

- **FR-009**: A fazenda MUST escolher nas Configurações do Leite o modo da ordenha: "por vaca" ou "só tanque", e quantas ordenhas faz por dia (1, 2 ou 3; padrão 2).
- **FR-010**: No modo por vaca, o sistema MUST mostrar, para a data e o turno escolhidos (padrão: hoje e o turno da hora), a lista das vacas em lactação em ordem de brinco, com nome, DEL, litros da ordenha anterior e aviso de carência, e permitir lançar os litros de cada uma em sequência, avançando para a próxima a cada confirmação, com teclado numérico.
- **FR-011**: Os litros MUST aceitar uma casa decimal, de 0 a 80 por ordenha; acima disso, o sistema pede confirmação.
- **FR-012**: No modo só tanque, o sistema MUST registrar os litros do tanque por data e turno.
- **FR-012a**: No modo só tanque, havendo vacas em carência, a tela do turno MUST mostrar antes do total, em destaque, essas vacas, uma a uma ("Leite descarte até DD/MM"), e pedir os litros de cada uma, que ficam como descarte daquela vaca; o total do tanque é só o leite que foi para o tanque, sem elas.
- **FR-013**: O sistema MUST mostrar o total do dia por vaca e da fazenda, separando leite para o tanque e leite descartado (FR-016).
- **FR-014**: Uma ordenha MUST poder ser corrigida (o lançamento novo para a mesma vaca, data e turno substitui o anterior); toda ordenha guarda quem lançou e quem alterou por último, e quando (constituição, princípio III).

**Carência**

- **FR-015**: O Leite MUST ter um cadastro de produtos (medicamentos) da fazenda com nome e carência de leite em dias (0 = sem carência). Dono e funcionário cadastram e corrigem; produto usado não é excluído, só desativado.
- **FR-015a**: Com o Leite ativo, ao registrar um tratamento (individual ou no Manejo em lote) numa fêmea, o produto MUST ser escolhido do cadastro, e o tratamento guarda a carência do produto naquele momento (mudar a carência do produto depois não muda tratamentos antigos). Produto que não está no cadastro MUST ser cadastrado na hora, com a carência, antes de salvar o tratamento.
- **FR-015b**: Sem o Leite ativo, o tratamento continua como hoje (produto escrito livre, sem carência).
- **FR-016**: Enquanto a data do tratamento + carência não passar, os litros da vaca MUST ser marcados como descarte e não contar como leite para o tanque; havendo mais de um tratamento, vale a data final mais distante; corrigir ou cancelar o tratamento recalcula o prazo.
- **FR-017**: A vaca em carência MUST aparecer em destaque na lista da ordenha com "Leite descarte até DD/MM", antes do campo de litros.
- **FR-018**: O Manejo MUST mostrar a lista "Leite em descarte" (brinco, produto, data final) quando o Leite estiver ativo ou em só consulta.

**Secagem**

- **FR-019**: Para a vaca em lactação com prenhez confirmada, a secagem planejada MUST ser a data prevista do parto menos o prazo de secagem das Configurações do Leite (padrão 60 dias); sem prenhez confirmada, não há secagem planejada.
- **FR-020**: O sistema MUST listar as vacas a secar nos próximos N dias (padrão 15), em ordem de data, com brinco, DEL e média de litros dos últimos 7 dias (no modo por vaca), incluindo as atrasadas em destaque.
- **FR-021**: O sistema MUST permitir registrar a secagem de uma vaca em lactação, com data (não futura) e observação opcional; a lactação termina e a vaca sai da lista da ordenha. A secagem pode ser cancelada com motivo, reabrindo a lactação.

**Entregas e análises**

- **FR-022**: O sistema MUST registrar entregas ao laticínio com data, litros e observação opcional; o preço por litro pode ser informado na entrega ou depois, por entrega ou para todas as entregas do mês.
- **FR-023**: O sistema MUST mostrar as entregas do mês com o total entregue, o leite para o tanque registrado no mesmo período e a diferença; com preço informado, o valor de cada entrega e o total do mês.
- **FR-024**: O sistema MUST registrar análises do laticínio por entrega ou por mês, com CCS (mil células/mL), CBT (mil UFC/mL), gordura (%) e proteína (%), todos opcionais, e mostrar o histórico mês a mês.
- **FR-025**: Entregas e análises MUST ser corrigidas ou canceladas com motivo, nunca excluídas.

**Relatórios**

- **FR-026**: O sistema MUST mostrar a produção diária do período (padrão: mês atual) em gráfico e tabela, com o total, o leite descartado e a média de litros por vaca em lactação por dia.
- **FR-027**: O sistema MUST mostrar a produção mensal dos últimos 12 meses (máximo 36).
- **FR-028**: No modo por vaca, o sistema MUST mostrar por vaca: curva da lactação atual (litros/dia × DEL), pico, média e total; e, por lactação encerrada, início, fim, duração e total de litros.
- **FR-029**: Os relatórios MUST abrir em menos de 2 segundos com um ano de ordenhas de 100 vacas.

**Raças e celular**

- **FR-030**: O pacote base MUST trazer as raças leiteiras padrão com a gestação média: Holandesa (280 dias), Girolando (285), Jersey (279) e Gir (290), para todas as fazendas, com ou sem o Leite.
- **FR-031**: A ordenha MUST funcionar no celular com uma mão: botões de 44 px, teclado numérico, sem rolagem lateral, e lançar 30 vacas em menos de 5 minutos (constituição, princípio IV).

### Key Entities *(include if feature involves data)*

- **Lactação**: vaca, início (data e parto de origem, ou início manual), fim (data e motivo: secagem, saída do rebanho, novo parto), situação (em andamento ou encerrada), auditoria.
- **Ordenha**: fazenda, data, turno (1.º, 2.º, 3.º), vaca e lactação (modo por vaca, ou vaca em carência no modo só tanque) ou tanque (modo só tanque), litros, descarte (sim/não), auditoria.
- **Secagem**: lactação, data, observação, auditoria e cancelamento.
- **Configurações do Leite**: modo da ordenha, ordenhas por dia, prazo de secagem em dias, janela de "a secar".
- **Entrega ao laticínio**: fazenda, data, litros, preço por litro opcional, observação, auditoria e cancelamento.
- **Análise do laticínio**: fazenda, mês ou entrega de referência, CCS, CBT, gordura, proteína, auditoria e cancelamento.
- **Produto (medicamento)**: fazenda, nome, carência de leite em dias, ativo ou não, auditoria.
- **Tratamento** *(existente)*: com o Leite ativo, ganha o produto do cadastro e a carência copiada dele.
- **Raça** *(existente)*: ganha a indicação "leiteira" e as quatro raças leiteiras padrão.
- **Animal** *(existente)*: ganha "vaca de leite" (pela raça, sim, não).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A ordenha de 30 vacas é lançada no celular em menos de 5 minutos.
- **SC-002**: Em 100% dos casos de teste, uma vaca em carência aparece com o aviso de descarte na ordenha durante todo o prazo, e os litros dela não entram no leite para o tanque.
- **SC-003**: O DEL, a secagem planejada e o total de cada lactação conferem com a conta manual em 100% dos casos de teste.
- **SC-004**: Nenhuma vaca seca, vendida, morta ou descartada aparece na lista da ordenha.
- **SC-005**: Nenhum dado de leite de uma fazenda aparece para outra.
- **SC-006**: Os relatórios de produção de um ano de 100 vacas abrem em menos de 2 segundos.

## Assumptions

- "Vaca" aqui é a fêmea que pariu (categoria Matriz no pacote inicial); a categoria não muda por causa do Leite.
- O status reprodutivo "Lactante" do pacote inicial (vaca parida, antes do novo diagnóstico) continua como está; a situação leiteira (em lactação / seca) é outra informação, do módulo Leite.
- Unidade: litros, com uma casa decimal. Sem conversão de kg.
- Turno da ordenha é só um número (1.º, 2.º, 3.º); horário exato não é guardado.
- O preço por litro é informado à mão; integração automática da entrega com o Financeiro fica para a fase de integrações (D6). Até lá, a venda de leite é lançada à mão no Financeiro, na categoria "Venda de leite".
- Controle leiteiro oficial (associações de raça), ordenhadeira automática e leitura de chip ficam fora.
- Sem envio de mensagem ou alerta fora do sistema; os avisos aparecem nas telas.
- O prazo de secagem e a janela de "a secar" têm padrão (60 e 15 dias) e podem ser ajustados nas Configurações do Leite pelo dono.
