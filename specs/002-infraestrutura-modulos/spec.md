# Feature Specification: Infraestrutura de Módulos (Fase 0)

**Feature Branch**: `002-infraestrutura-modulos`

**Created**: 2026-11-04

**Status**: Draft (respostas de 2026-11-04 aplicadas)

**Input**: User description: "Fase 0 da modularização: infraestrutura que permite vender o sistema por partes, antes de qualquer módulo pago. Base: seção 2 de docs/modulos/Planejamento-modulos.md (decisões D1–D10). Escopo: migrations no lugar do synchronize, módulos por fazenda (LEITE, FINANCEIRO, NUTRICAO), bloqueio no backend com 403 \"módulo não contratado\", menu e vitrine no frontend, administrador do sistema com login separado e painel para liberar e desativar módulos, organização do código em pastas de módulos. Liberação manual, sem cobrança automática; preços fora do escopo. Ainda não há módulo pago, então o bloqueio precisa ser provado com uma rota de exemplo ou de teste."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Banco de dados que evolui sem perder dados (Priority: P1)

O dono do software atualiza o sistema e o banco de dados muda de forma controlada: cada mudança de estrutura vem num passo versionado, revisado antes e aplicado na atualização. A fazenda que já usa o sistema (a fazenda de referência, com rebanho, partos, pesagens, tratamentos e reprodução registrados) continua com todos os seus dados depois da troca.

**Why this priority**: com clientes pagando, uma atualização não pode apagar dados por acidente (decisão D7). É o pré-requisito de todo módulo pago.

**Independent Test**: com uma cópia do banco atual cheia de dados, aplicar a versão nova; conferir que as contagens de cada tipo de registro são as mesmas antes e depois e que o sistema funciona normalmente.

**Acceptance Scenarios**:

1. **Given** um banco existente com dados de fazendas, **When** a nova versão é instalada, **Then** a estrutura passa a ser controlada por passos versionados e nenhum registro é perdido ou alterado.
2. **Given** um banco vazio (instalação nova), **When** o sistema é instalado, **Then** a estrutura completa é criada pelos mesmos passos versionados.
3. **Given** a estrutura atualizada, **When** o sistema sobe, **Then** ele não altera mais a estrutura do banco sozinho a partir do código.

---

### User Story 2 - Administrador libera e desativa módulos (Priority: P1)

O dono do software entra num painel próprio, separado do login das fazendas, vê a lista de fazendas clientes e, para cada uma, os módulos contratados. Ele libera um módulo (Leite, Financeiro ou Nutrição), com data de início e, se o contrato tiver prazo, data de término; e desativa quando o cliente deixa de pagar.

**Why this priority**: a venda por partes depende de alguém poder ligar e desligar módulos por cliente (decisão D4). Sem isso não há o que bloquear.

**Independent Test**: entrar como administrador, liberar o Financeiro para uma fazenda de teste e conferir que ele aparece como ativo; desativar e conferir que aparece como inativo, com o histórico de quem fez cada ação.

**Acceptance Scenarios**:

1. **Given** o administrador logado, **When** abre o painel, **Then** vê as fazendas clientes com nome, data de cadastro, quantidade de usuários, situação (ativa ou suspensa) e os módulos ativos de cada uma, sem nenhum dado de rebanho.
2. **Given** uma fazenda sem o Leite, **When** o administrador libera o Leite a partir de hoje, sem data de término, **Then** o módulo fica ativo para aquela fazenda até ser desativado.
3. **Given** um módulo liberado com data de término, **When** essa data passa, **Then** o módulo deixa de estar ativo sem ação manual.
4. **Given** um módulo ativo, **When** o administrador o desativa, **Then** a fazenda perde o acesso e o registro guarda quem desativou e quando.
5. **Given** um dono ou funcionário de fazenda, **When** tenta entrar no painel do administrador, **Then** o acesso é negado.
6. **Given** uma fazenda ativa, **When** o administrador a suspende informando o motivo, **Then** o dono e os funcionários dela não conseguem mais entrar e veem "Acesso suspenso · fale com o suporte"; ao reativar, voltam a entrar com todos os dados intactos.
7. **Given** o administrador, **When** tenta abrir dados de rebanho de uma fazenda (animais, partos, pesagens), **Then** o acesso é negado.

---

### User Story 3 - Bloqueio dos módulos não contratados (Priority: P1)

Uma fazenda só usa os módulos que contratou. Qualquer ação de um módulo pago feita por uma fazenda sem esse módulo é recusada pelo sistema com a mensagem "módulo não contratado", mesmo que a pessoa tente pular a tela e chamar o sistema diretamente.

**Why this priority**: é o que protege a venda (constituição, princípio II: esconder o botão não basta).

**Independent Test**: com uma ação de exemplo marcada como pertencente a um módulo pago, conferir que a fazenda sem o módulo é recusada e a fazenda com o módulo é atendida; liberar o módulo e conferir que o acesso passa a valer em poucos minutos, no máximo.

**Acceptance Scenarios**:

1. **Given** uma fazenda sem o Financeiro, **When** um usuário dela chama uma ação do Financeiro, **Then** recebe a recusa "módulo não contratado".
2. **Given** a mesma fazenda, **When** o administrador libera o Financeiro, **Then** a ação passa a funcionar para aquela fazenda em no máximo 1 minuto.
3. **Given** uma fazenda com o Financeiro, **When** o administrador o desativa, **Then** em no máximo 1 minuto os lançamentos do Financeiro passam a ser recusados com "módulo desativado: só consulta", e as consultas dos dados já lançados continuam funcionando.
4. **Given** uma fazenda que nunca contratou o Financeiro, **When** um usuário tenta consultar dados do Financeiro, **Then** recebe a recusa "módulo não contratado".
5. **Given** qualquer fazenda, **When** usa as funções do pacote inicial (rebanho, partos, pastos, manejo, pesagens, tratamentos, reprodução, relatórios), **Then** nada é bloqueado.

---

### User Story 4 - Menu com os módulos contratados e vitrine dos demais (Priority: P2)

O dono e o funcionário veem no menu só os módulos que a fazenda contratou. Os não contratados aparecem como vitrine, com o aviso "Disponível no módulo Leite · fale com o suporte". Quem abrir pelo endereço uma tela de módulo não contratado vê essa mesma vitrine, e não uma tela de erro.

**Why this priority**: melhora a experiência e ajuda a vender, mas a proteção real já está na história 3.

**Independent Test**: com uma fazenda sem módulos, conferir que o menu mostra os módulos como vitrine; liberar um e conferir que ele passa a aparecer como contratado depois de recarregar a tela.

**Acceptance Scenarios**:

1. **Given** uma fazenda só com o pacote inicial, **When** um usuário abre o menu, **Then** vê o pacote inicial completo e os módulos pagos como vitrine.
2. **Given** uma fazenda com o Financeiro, **When** um usuário abre o menu, **Then** o Financeiro aparece como módulo normal e os outros como vitrine.
3. **Given** uma fazenda sem o Leite, **When** um usuário abre pelo endereço uma tela do Leite, **Then** vê a vitrine do Leite, sem erro.
4. **Given** uma fazenda que teve o Leite e foi desativada, **When** um usuário abre o Leite, **Then** vê os dados já lançados, sem os botões de lançar, com o aviso "Módulo desativado: só consulta · fale com o suporte para reativar".
5. **Given** o dono da fazenda, **When** abre as configurações, **Then** vê quais módulos estão contratados e, se houver, até quando.
6. **Given** um módulo que vence daqui a 7 dias, **When** o dono entra no sistema, **Then** vê o aviso "O módulo X vence em 7 dias · fale com o suporte para renovar"; o funcionário, ao entrar, não vê o aviso.

---

### Edge Cases

- Módulo liberado com data de início no futuro: fica inativo até a data chegar.
- Data de término anterior à data de início: recusada no painel.
- Liberar um módulo que já está ativo: recusado, com aviso, sem duplicar o registro; liberar de novo um módulo desativado cria um novo período, mantendo o anterior no histórico.
- Fazenda desativa um módulo com dados já lançados nele: os dados ficam guardados, a fazenda continua consultando sem poder lançar, e volta a lançar se o módulo for liberado de novo (FR-011a).
- Módulo desativado que nunca teve dados lançados: a tela de consulta aparece vazia, com o aviso de módulo desativado.
- Usuário com a tela aberta quando o módulo é desativado: a próxima ação é recusada com "módulo não contratado" e a tela leva à vitrine.
- Migração num banco onde a estrutura e o código já divergem (ex.: coluna criada à mão): a instalação para com erro claro, sem apagar nada.
- Fazenda suspensa com módulo cuja data de término vence durante a suspensão: ao reativar, o módulo volta como desativado (só consulta), não como ativo.
- Página pública do animal (QR code do brinco) de uma fazenda suspensa: mostra só o básico, sem histórico nem pesos (FR-028).
- Alguém erra a senha do administrador 5 vezes seguidas: o login dele fica bloqueado por 15 minutos, mesmo com a senha certa (FR-018a).
- Administrador esquece a senha: a recuperação é feita pelo dono do software no servidor, não por tela pública.

## Clarifications

### Session 2026-11-04

- Q: Depois de desativado, a fazenda ainda pode consultar os dados lançados no módulo? → A: Sim, só consulta: vê os dados, não lança, altera nem cancela, até reativar (FR-011a).
- Q: A vitrine dos módulos não contratados aparece para quem? → A: Para o dono e para o funcionário (FR-014).
- Q: O painel deve permitir suspender uma fazenda inteira, incluindo o pacote inicial? → A: Sim; a fazenda suspensa não entra mais no sistema até ser reativada (FR-025 a FR-027).
- Q: Com a fazenda suspensa, a página pública do animal (QR code do brinco) continua mostrando os dados? → A: Só o básico: fazenda, brinco, raça, sexo e categoria, com o aviso "Informações completas indisponíveis no momento"; histórico, pesos e demais informações ficam ocultos (FR-028).
- Q: Como o administrador entra no painel? → A: E-mail e senha, com senha forte obrigatória e bloqueio temporário depois de 5 tentativas erradas (FR-018a); sem código no celular nesta fase.
- Q: O dono deve ser avisado quando um módulo com data de término estiver perto de vencer? → A: Sim, só o dono, nos 10 dias antes do vencimento, sempre que entrar no sistema (FR-016a).

## Requirements *(mandatory)*

### Functional Requirements

**Evolução do banco**

- **FR-001**: O sistema MUST ter toda a estrutura do banco descrita em passos versionados, aplicados em ordem na instalação e em cada atualização.
- **FR-002**: O primeiro passo MUST reproduzir a estrutura atual exatamente, e aplicá-lo num banco já existente MUST preservar 100% dos registros.
- **FR-003**: Fora do ambiente de desenvolvimento, o sistema MUST NOT alterar a estrutura do banco sozinho a partir do código; só os passos versionados alteram.
- **FR-004**: Cada passo MUST ter a forma de desfazer, para voltar uma atualização com problema.

**Módulos por fazenda**

- **FR-005**: O sistema MUST registrar, por fazenda, os módulos pagos Leite, Financeiro e Nutrição, com: ativo ou não, data de início, data de término opcional, quem liberou e quando, quem desativou e quando.
- **FR-006**: O pacote inicial (Reprodução e Rebanho) MUST estar sempre disponível para toda fazenda, sem registro de liberação.
- **FR-007**: Um módulo MUST ser considerado ativo só entre a data de início e a data de término (quando houver), e enquanto não for desativado.
- **FR-008**: Os registros de liberação MUST ser preservados como histórico; desativar não apaga a liberação (constituição, princípio III).

**Bloqueio**

- **FR-009**: Cada ação de um módulo pago MUST ser marcada com o módulo a que pertence, e a marcação MUST ser obrigatória para todo código dentro da área de módulos pagos.
- **FR-010**: Uma ação de módulo pago chamada por fazenda que nunca teve o módulo MUST ser recusada com a mensagem "módulo não contratado", qualquer que seja o caminho da chamada; fazenda que já teve o módulo segue a FR-011a.
- **FR-011a**: Uma fazenda que já teve o módulo e o perdeu (desativado ou com data de término vencida) MUST continuar podendo consultar os dados lançados nele, sem lançar, alterar ou cancelar nada; as tentativas de lançar MUST ser recusadas com "módulo desativado: só consulta". Para isso, cada ação de módulo pago MUST ser marcada como consulta ou lançamento.
- **FR-011**: Liberar ou desativar um módulo MUST valer para a fazenda em no máximo 1 minuto, inclusive para usuários já logados.
- **FR-012**: O sistema MUST trazer uma ação de exemplo, de cada módulo pago, que só sirva para provar o bloqueio, até o módulo real existir.

**Telas da fazenda**

- **FR-013**: O sistema MUST informar à tela da fazenda quais módulos estão ativos para ela.
- **FR-014**: O menu MUST mostrar, para o dono e para o funcionário, os módulos ativos como itens normais, os desativados como "só consulta" e os nunca contratados como vitrine, com "Disponível no módulo X · fale com o suporte".
- **FR-015**: Uma tela de módulo não contratado aberta pelo endereço MUST mostrar a vitrine do módulo, e não erro.
- **FR-016**: O dono da fazenda MUST ver, nas configurações, os módulos contratados e a data de término, quando houver.
- **FR-016a**: Nos 10 dias anteriores à data de término de um módulo, o dono da fazenda MUST ver, toda vez que entrar no sistema, o aviso "O módulo X vence em N dias · fale com o suporte para renovar" ("vence hoje" no último dia). O funcionário MUST NOT ver esse aviso. Renovada a data, o aviso some.

**Administrador do sistema**

- **FR-017**: O sistema MUST ter o papel Administrador, que não pertence a nenhuma fazenda e é usado só pelo dono do software.
- **FR-018**: O administrador MUST entrar por um login separado do login das fazendas; usuários de fazenda MUST NOT entrar no painel, e o administrador MUST NOT entrar nas telas de fazenda.
- **FR-018a**: A senha do administrador MUST ter no mínimo 12 caracteres, com letras e números. Depois de 5 tentativas erradas seguidas, o login do administrador MUST ficar bloqueado por 15 minutos, e cada tentativa (certa ou errada) MUST ficar registrada com data e hora.
- **FR-019**: O painel MUST listar as fazendas clientes com nome, data de cadastro, quantidade de usuários ativos e módulos ativos, com busca pelo nome.
- **FR-020**: O painel MUST permitir liberar um módulo (data de início, data de término opcional) e desativar um módulo ativo, mostrando o histórico de liberações de cada fazenda.
- **FR-021**: O administrador MUST NOT ter acesso a nenhum dado de rebanho, reprodução, pesagem, tratamento ou relatório das fazendas.
- **FR-022**: MUST NOT haver tela pública de cadastro de administrador; a conta é criada pelo dono do software no servidor.
- **FR-023**: Toda liberação, desativação, suspensão e reativação MUST registrar quem fez e quando.

**Suspensão de fazenda**

- **FR-025**: O administrador MUST poder suspender uma fazenda inteira, informando o motivo, e reativá-la depois.
- **FR-026**: Enquanto a fazenda estiver suspensa, nenhum usuário dela (dono ou funcionário) MUST conseguir entrar no sistema; quem tentar MUST ver "Acesso suspenso · fale com o suporte". Quem já estiver logado MUST perder o acesso na próxima ação, em no máximo 1 minuto.
- **FR-027**: Suspender MUST NOT apagar nem alterar nenhum dado da fazenda; ao reativar, tudo volta como estava, inclusive os módulos que estavam ativos (respeitadas as datas de término).
- **FR-028**: Enquanto a fazenda estiver suspensa, a página pública do animal (aberta pelo QR code do brinco) MUST mostrar só o nome da fazenda, o brinco, a raça, o sexo e a categoria, com o aviso "Informações completas indisponíveis no momento"; peso, arrobas, histórico e demais informações MUST ficar ocultos. Ao reativar, a página volta a ser completa.

**Organização**

- **FR-024**: O código de cada módulo pago MUST ficar separado do pacote inicial e dos outros módulos, de forma que cada módulo funcione sozinho (decisões D5 e D6).

### Key Entities *(include if feature involves data)*

- **Módulo**: Leite, Financeiro ou Nutrição. Lista fixa nesta fase; o pacote inicial não é um módulo da lista.
- **Liberação de módulo**: uma fazenda, um módulo, data de início, data de término opcional, situação (ativo/desativado), quem liberou e quando, quem desativou e quando. Uma fazenda pode ter vários períodos do mesmo módulo ao longo do tempo, mas no máximo um ativo.
- **Administrador**: conta do dono do software, fora das fazendas, com acesso só ao painel de módulos.
- **Fazenda** *(existente)*: passa a ter a lista de liberações e a situação da assinatura (ativa ou suspensa), com o histórico de suspensões e reativações: motivo, quem fez e quando.
- **Passo de evolução do banco**: cada mudança versionada da estrutura, com a ordem de aplicação e a forma de desfazer.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Depois de instalar a nova versão sobre o banco atual, a contagem de registros de cada tipo é idêntica à de antes, em 100% dos tipos.
- **SC-002**: Uma instalação do zero, só com os passos versionados, produz um sistema que passa em todos os testes existentes.
- **SC-003**: Em 100% das tentativas de usar uma ação de módulo pago sem o módulo ativo, o sistema recusa: "módulo não contratado" para quem nunca teve, e "módulo desativado: só consulta" para lançamentos de quem já teve; as consultas de quem já teve funcionam em 100% dos casos.
- **SC-004**: O administrador libera um módulo para uma fazenda em menos de 1 minuto, e a liberação vale para a fazenda em no máximo 1 minuto.
- **SC-005**: Nenhuma ação do pacote inicial fica mais lenta de forma perceptível para o usuário por causa da checagem de módulos.
- **SC-006**: Em 100% das tentativas, usuário de fazenda não entra no painel e o administrador não vê dados de rebanho.

## Assumptions

- Não há módulo pago implementado nesta fase; o bloqueio é provado com ações de exemplo (FR-012), que saem quando os módulos reais chegarem.
- Existe um só administrador (o dono do software); mais de um fica possível, mas sem tela de gestão de administradores nesta fase.
- A conta do administrador é criada por um comando no servidor, com a senha definida ali (FR-022).
- O "painel" é simples: lista, busca, liberar e desativar. Cobrança, faturas, preços e período de teste ficam fora (decisões D4, D9 e D10).
- A data de término, quando passa, desativa o módulo pela regra de datas (FR-007), sem tarefa agendada visível ao usuário.
- O banco atual de desenvolvimento, com a fazenda real de referência, é a base para gerar e conferir o primeiro passo versionado; uma cópia dele é usada no teste, nunca o original.
- O contato "fale com o suporte" da vitrine é um texto fixo nesta fase; o canal de contato definitivo vem com a publicação.
- Os testes seguem a constituição (princípio V): fazendas de teste isoladas, nunca a fazenda real.
