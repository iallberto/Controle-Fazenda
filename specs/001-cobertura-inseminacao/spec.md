# Feature Specification: Cobertura e Inseminação no Pacote Inicial

**Feature Branch**: `001-cobertura-inseminacao`

**Created**: 2026-11-03

**Status**: Draft (esclarecimentos de 2026-11-03 aplicados)

**Input**: User description: "Inseminação no módulo inicial, para finalizá-lo completamente antes dos novos módulos. No nosso caso é monta natural, mas fica aberta a oportunidade de inseminação (IA/IATF) para quem quiser. Base: seção 3 de docs/modulos/Planejamento-modulos.md."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Estação de monta natural (Priority: P1)

O dono coloca um touro num pasto com as fêmeas aptas e registra a **estação de monta**: qual touro, em qual pasto, a data de entrada e, depois, a data de saída do touro. O sistema passa a saber quais fêmeas ficaram expostas a qual touro e em que período, sem que ninguém precise anotar cada cobertura vaca a vaca.

**Why this priority**: é como a fazenda de referência trabalha hoje (monta natural). Sem saber qual touro esteve com qual vaca, não há como preencher o pai das crias nem estimar quando elas vão parir.

**Independent Test**: registrar uma estação com um touro e um pasto com fêmeas, encerrá-la, e conferir que cada fêmea mostra no histórico "exposta ao touro X de dd/mm a dd/mm".

**Acceptance Scenarios**:

1. **Given** um pasto com 20 fêmeas aptas e um touro ativo, **When** o dono abre uma estação de monta com esse touro e esse pasto, **Then** o sistema lista as 20 fêmeas como expostas, todas marcadas, permitindo desmarcar exceções com motivo.
2. **Given** uma estação aberta, **When** o dono registra a saída do touro numa data, **Then** a estação fica encerrada com o período completo e não aceita mais fêmeas.
3. **Given** uma estação aberta, **When** uma fêmea nova é colocada no mesmo pasto, **Then** o dono pode incluí-la na estação a partir daquela data.
4. **Given** um touro que já está numa estação aberta, **When** alguém tenta abrir outra estação com ele, **Then** o sistema recusa e informa onde ele está.

---

### User Story 2 - Diagnóstico de gestação (Priority: P1)

Depois da estação, o veterinário ou o funcionário faz o toque ou ultrassom nas fêmeas e registra o resultado de cada uma: **prenhe** ou **vazia**. O registro pode ser feito vaca a vaca no Manejo ou em lote, com a lista do pasto e um toque para marcar o resultado de cada fêmea.

**Why this priority**: o diagnóstico é o que diz se a estação deu certo; é dele que saem a previsão de parto, a taxa de prenhez e a lista de vacas vazias para descarte ou nova cobertura.

**Independent Test**: registrar o diagnóstico de um grupo de fêmeas e conferir que o status reprodutivo de cada uma mudou para Prenha ou Vazia e que as prenhes ganharam uma previsão de parto.

**Acceptance Scenarios**:

1. **Given** uma fêmea exposta numa estação, **When** o diagnóstico é registrado como prenhe, **Then** o status reprodutivo dela passa a Prenha e o sistema calcula a previsão de parto.
2. **Given** uma fêmea, **When** o diagnóstico é registrado como vazia, **Then** o status passa a Vazia e ela volta a aparecer como apta para a próxima cobertura.
3. **Given** um pasto com 30 fêmeas, **When** o diagnóstico é feito em lote, **Then** cada fêmea recebe o próprio registro de diagnóstico, com data, método e quem fez.
4. **Given** um animal macho, **When** alguém tenta registrar diagnóstico de gestação, **Then** o sistema recusa.

---

### User Story 3 - Previsão de parto e vacas a parir (Priority: P2)

O dono vê quais vacas devem parir nos próximos dias e semanas, para se preparar (separar no pasto maternidade, acompanhar o parto).

**Why this priority**: é a utilidade prática mais imediata do diagnóstico no dia a dia, mas depende das histórias 1 e 2.

**Independent Test**: com fêmeas diagnosticadas prenhes, abrir o relatório "Vacas a parir" e conferir as datas previstas e a ordem.

**Acceptance Scenarios**:

1. **Given** fêmeas prenhes com previsão de parto, **When** o dono abre "Vacas a parir" e escolhe os próximos 30 dias, **Then** vê as fêmeas em ordem de data prevista, com o brinco, o touro (ou sêmen) e o pasto atual.
2. **Given** uma fêmea com parto previsto já vencido e sem parto registrado, **When** o dono abre o relatório, **Then** ela aparece destacada como "parto atrasado".

---

### User Story 4 - Parto ligado à cobertura (Priority: P2)

Quando o parto é registrado na tela atual de partos, o sistema liga o parto à cobertura que o gerou e preenche o pai da cria automaticamente quando ele é conhecido.

**Why this priority**: fecha o ciclo e dá genealogia ao rebanho sem trabalho extra.

**Independent Test**: registrar o parto de uma fêmea que foi exposta a um único touro e conferir que a cria nasce com esse touro como pai.

**Acceptance Scenarios**:

1. **Given** uma fêmea prenhe cuja cobertura tem um único touro ou sêmen identificado, **When** o parto é registrado, **Then** as crias nascem com o pai preenchido e o status da mãe deixa de ser Prenha.
2. **Given** uma fêmea exposta a dois touros no mesmo período, **When** o parto é registrado, **Then** o pai fica em branco, com a indicação "um destes: touro X ou touro Y", podendo ser escolhido depois.
3. **Given** uma fêmea sem nenhuma cobertura registrada, **When** o parto é registrado, **Then** ele é aceito normalmente, sem pai, como hoje.

---

### User Story 5 - Inseminação artificial (IA e IATF) (Priority: P3)

Para a fazenda que insemina, o funcionário ou veterinário registra a inseminação de cada vaca: data, tipo (IA ou IATF), o sêmen usado e quem inseminou. O sêmen é cadastrado com o touro, a raça e a central, e o sistema controla as doses em estoque.

**Why this priority**: não é o caso da fazenda de referência, mas fica disponível para outros clientes (decisão D8 do planejamento).

**Independent Test**: cadastrar um sêmen com 10 doses, registrar 3 inseminações com ele e conferir que restam 7 doses e que as 3 vacas aparecem como inseminadas.

**Acceptance Scenarios**:

1. **Given** um sêmen com doses em estoque, **When** uma inseminação é registrada com ele, **Then** o estoque diminui uma dose e a vaca passa a ter uma cobertura com data exata.
2. **Given** um sêmen sem doses, **When** alguém tenta usá-lo, **Then** o sistema avisa que o estoque acabou e não registra.
3. **Given** uma vaca inseminada e depois diagnosticada prenhe, **When** a previsão de parto é calculada, **Then** ela usa a data exata da inseminação.

---

### User Story 6 - Indicadores reprodutivos (Priority: P3)

O dono acompanha os números da reprodução: taxa de prenhez por estação e por touro, quantas vacas estão vazias e o intervalo entre partos de cada matriz.

**Why this priority**: orienta decisões de descarte e de touro, mas depende dos registros das histórias anteriores.

**Independent Test**: com uma estação encerrada e diagnosticada, conferir que a taxa de prenhez mostrada bate com a contagem manual.

**Acceptance Scenarios**:

1. **Given** uma estação com 40 fêmeas expostas e 34 diagnosticadas prenhes, **When** o dono abre os indicadores, **Then** vê taxa de prenhez de 85% para a estação e para o touro.
2. **Given** matrizes com dois ou mais partos, **When** o dono abre o relatório, **Then** vê o intervalo entre partos de cada uma e a média do rebanho.

---

### Edge Cases

- O touro morre, é vendido ou é descartado durante uma estação aberta: a estação é encerrada na data da saída do touro do rebanho.
- Uma fêmea exposta sai do pasto da estação antes do fim (movimentação para outro pasto): a exposição dela termina na data da movimentação.
- Uma fêmea exposta é vendida, morre ou é descartada: deixa de constar como exposta e entra nos indicadores como perda, não como vazia.
- Diagnóstico vazia seguido, semanas depois, de um novo diagnóstico prenhe (reconfirmação): vale o mais recente; o histórico guarda os dois.
- Perda de gestação (aborto) depois de diagnóstico prenhe: registra-se como novo diagnóstico/evento de perda, com motivo; o status volta a Vazia.
- Fêmea diagnosticada prenhe sem nenhuma cobertura registrada (ex.: comprada prenhe): o diagnóstico é aceito; a previsão de parto sai da idade gestacional informada no diagnóstico, se houver.
- Novilha que tem o primeiro parto: o parto é aceito e ela passa a Matriz automaticamente (ver FR-031).
- Dois ou mais touros no mesmo pasto ao mesmo tempo: cada um tem a sua estação e as fêmeas ficam expostas a todas elas; o pai das crias fica indefinido entre os touros (User Story 4, cenário 2).
- Animal fora do rebanho (vendido, morto, descartado) não pode entrar em estação, receber inseminação nem diagnóstico (constituição, princípio II).

## Clarifications

### Session 2026-11-03

- Q: De onde sai a previsão de parto na monta natural? → A: da idade gestacional informada no toque quando houver; senão, do meio do período de exposição ao touro (FR-018).
- Q: Novilha no primeiro parto? → A: o parto é aceito e ela vira Matriz automaticamente (FR-031).
- Q: Funcionário pode abrir e encerrar estações? → A: sim, dono e funcionário, com registro de quem fez (FR-024).
- Q: Uma estação pode ter mais de um touro junto no mesmo pasto? → A: não; sempre um touro por estação. Vários touros no mesmo pasto = várias estações, cada uma com o seu touro (FR-001, FR-005).
- Q: Depois do parto, qual o status reprodutivo da vaca? → A: Lactante; volta a ser apta à cobertura 45 dias após o parto e fica fora do relatório de vazias enquanto lactante (FR-003, FR-022, FR-030).
- Q: Como corrigir um registro de reprodução lançado errado? → A: só o dono edita ou cancela, a qualquer momento; o funcionário que errou pede ao dono (FR-026).
- Q: Em que unidade a idade gestacional do toque é informada? → A: meses e dias, ex.: "3 meses e 22 dias" (FR-013, FR-018).

## Requirements *(mandatory)*

### Functional Requirements

**Estação de monta (monta natural)**

- **FR-001**: O sistema MUST permitir abrir uma estação de monta informando **um** touro, o pasto e a data de entrada do touro. Cada estação tem exatamente um touro; para vários touros no mesmo pasto, abre-se uma estação para cada um.
- **FR-002**: Ao abrir a estação, o sistema MUST sugerir como expostas todas as fêmeas ativas aptas do pasto, todas marcadas, e MUST exigir motivo para cada fêmea desmarcada (mesmo padrão do Manejo em lote).
- **FR-003**: O sistema MUST considerar aptas à cobertura as fêmeas ativas das categorias Matriz e Novilha que não estejam Prenhas e cujo último parto, se houver, tenha sido há pelo menos 45 dias.
- **FR-004**: O sistema MUST permitir encerrar a estação registrando a data de saída do touro, e MUST recusar data de saída anterior à de entrada.
- **FR-005**: O sistema MUST impedir que o mesmo touro esteja em duas estações abertas ao mesmo tempo.
- **FR-006**: O sistema MUST permitir incluir fêmeas numa estação aberta a partir de uma data posterior à abertura.
- **FR-007**: O sistema MUST encerrar automaticamente a exposição de uma fêmea quando ela sair do pasto da estação ou do rebanho, e MUST encerrar a estação quando o touro sair do rebanho.
- **FR-008**: O sistema MUST aceitar como touro apenas animal ativo, macho, da categoria Touro, da mesma fazenda.

**Inseminação (opcional)**

- **FR-009**: O sistema MUST permitir cadastrar sêmen com nome do touro, raça, central (opcional) e quantidade de doses.
- **FR-010**: O sistema MUST permitir registrar a inseminação de uma fêmea apta com data, tipo (IA ou IATF), sêmen usado e quem inseminou (funcionário, dono ou veterinário, como nos tratamentos).
- **FR-011**: Cada inseminação MUST descontar uma dose do sêmen, de forma que duas inseminações simultâneas nunca usem a mesma última dose; sêmen sem dose MUST ser recusado.
- **FR-012**: O sistema MUST permitir registrar entrada de doses (compra) num sêmen já cadastrado.

**Diagnóstico de gestação**

- **FR-013**: O sistema MUST permitir registrar o diagnóstico de uma fêmea com data, resultado (prenhe/vazia), método (toque ou ultrassom), idade gestacional estimada (opcional, informada em **meses e dias**, ex.: "3 meses e 22 dias") e quem fez. Para os cálculos, a idade gestacional MUST ser convertida em dias considerando 30 dias por mês (3 meses e 22 dias = 112 dias), e MUST ser exibida de volta em meses e dias.
- **FR-014**: O sistema MUST permitir registrar diagnósticos em lote a partir de um pasto ou categoria, com um resultado por fêmea.
- **FR-015**: O diagnóstico MUST atualizar o status reprodutivo da fêmea (Prenha ou Vazia); o mais recente prevalece e todos ficam no histórico.
- **FR-016**: O sistema MUST permitir registrar perda de gestação de uma fêmea prenhe, com data e motivo, voltando o status para Vazia.
- **FR-017**: O sistema MUST recusar diagnóstico em macho ou em animal fora do rebanho.

**Previsão de parto e parto**

- **FR-018**: Para fêmea prenhe, o sistema MUST calcular a previsão de parto nesta ordem: (1) com inseminação, data da inseminação + gestação média da raça; (2) na monta natural, se o diagnóstico informar a idade gestacional, data do diagnóstico − idade gestacional + gestação média da raça; (3) se não informar, o meio do período em que a fêmea ficou exposta ao touro + gestação média da raça. O sistema MUST indicar qual das três bases foi usada ("estimada pelo toque" ou "estimada pela estação").
- **FR-019**: O sistema MUST oferecer o relatório "Vacas a parir" com janela escolhida (7 a 90 dias), em ordem de data prevista, destacando partos atrasados.
- **FR-020**: Ao registrar um parto, o sistema MUST ligá-lo à cobertura mais recente da mãe (estação ou inseminação) e MUST preencher o pai das crias quando houver um único touro ou sêmen possível.
- **FR-021**: Quando houver mais de um touro possível, o pai MUST ficar em branco com a lista de candidatos, e MUST poder ser definido depois.
- **FR-022**: Ao registrar o parto com cria viva, o status reprodutivo da mãe MUST passar a Lactante; em natimorto, MUST passar a Vazia. Nos dois casos ela MUST voltar a ser apta à cobertura 45 dias depois do parto (FR-003).
- **FR-031**: O parto MUST ser aceito para fêmeas das categorias Matriz e Novilha; a Novilha que pare MUST passar automaticamente à categoria Matriz, com a mudança registrada no histórico e na auditoria.

**Telas, permissões e histórico**

- **FR-023**: O histórico do animal MUST mostrar, em ordem de data, as estações em que foi exposta, inseminações, diagnósticos, perdas de gestação e partos.
- **FR-024**: Dono e funcionário MUST poder abrir e encerrar estações e registrar inseminações e diagnósticos, ficando gravado quem fez cada ação; apenas o dono MUST poder excluir o cadastro de sêmen ainda não usado.
- **FR-025**: Todos os registros MUST guardar quem lançou e quando; estações e diagnósticos MUST guardar também quem alterou por último (constituição, princípio III).
- **FR-026**: Nenhum registro de reprodução MUST ser excluído. Somente o dono MUST poder editar ou cancelar estações, exposições, inseminações e diagnósticos, a qualquer momento; o cancelamento exige motivo e mantém o registro no histórico marcado como cancelado, fora dos cálculos. Toda edição grava quem alterou e quando. O funcionário não edita nem cancela registros, nem os que ele mesmo lançou.
- **FR-027**: O Manejo (busca pelo brinco) MUST mostrar a situação reprodutiva da fêmea (exposta, inseminada, prenhe com previsão, vazia) e permitir registrar o diagnóstico ali mesmo.

**Indicadores**

- **FR-028**: O sistema MUST mostrar a taxa de prenhez por estação e por touro/sêmen (prenhes ÷ expostas diagnosticadas), excluindo do cálculo fêmeas que saíram do rebanho antes do diagnóstico.
- **FR-029**: O sistema MUST mostrar o intervalo entre partos por matriz e a média do rebanho.
- **FR-030**: O sistema MUST listar as fêmeas com status Vazia, para decisão de nova cobertura ou descarte; fêmeas Lactantes não entram nessa lista.

### Key Entities *(include if feature involves data)*

- **Estação de monta**: um touro num pasto durante um período (entrada e saída). Pertence a uma fazenda; aberta ou encerrada.
- **Exposição**: a participação de uma fêmea numa estação, com data de início e de fim (que pode ser antes do fim da estação, se ela saiu do pasto); fêmeas deixadas de fora guardam o motivo.
- **Sêmen**: touro de origem, raça, central e doses em estoque. Usado só por quem insemina.
- **Inseminação**: uma fêmea, uma data, o tipo (IA/IATF), o sêmen e quem inseminou.
- **Diagnóstico de gestação**: uma fêmea, data, resultado, método, idade gestacional estimada (meses e dias) e quem fez. Inclui o registro de perda de gestação.
- **Parto** *(existente)*: passa a apontar para a cobertura que o originou e, por ela, para o pai das crias.
- **Animal** *(existente)*: o status reprodutivo (Prenha, Vazia, Lactante) passa a ser atualizado pelos diagnósticos e partos.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Abrir uma estação de monta para um pasto com 50 fêmeas leva menos de 2 minutos, sem digitar o brinco de nenhuma fêmea.
- **SC-002**: Registrar o diagnóstico de 50 fêmeas em lote leva menos de 5 minutos no celular.
- **SC-003**: 100% das crias nascidas de fêmeas expostas a um único touro registrado têm o pai preenchido automaticamente.
- **SC-004**: A taxa de prenhez mostrada para uma estação confere com a contagem manual dos diagnósticos em 100% dos casos.
- **SC-005**: O dono identifica as vacas a parir nos próximos 30 dias em uma única tela, sem consultar anotações em papel.
- **SC-006**: Nenhum registro de reprodução de uma fazenda aparece para outra (constituição, princípio I).

## Assumptions

- A fazenda de referência usa só monta natural; inseminação (User Story 5) é opcional e não aparece em destaque para quem não cadastrou sêmen.
- O touro da estação é um animal do próprio rebanho (categoria Touro). Touro emprestado de vizinho fica fora desta versão.
- A gestação média de cada raça já cadastrada é usada para a previsão de parto; raças sem esse dado usam 285 dias.
- Protocolo de IATF com etapas e datas (dia 0, dia 8, dia 10) fica fora desta versão; a IATF é registrada só como tipo da inseminação.
- O registro de cio (detecção de cio) fica fora desta versão.
- "Aptas" considera categoria e status reprodutivo; não há regra de idade ou peso mínimo nesta versão.
- O diagnóstico em lote reaproveita a forma de escolher grupos do Manejo em lote (pasto e/ou categoria).
- Relatórios novos entram na tela de relatórios por tipo (M10) que já existe.
