# Feature Specification: Preparação para publicação

**Feature Branch**: `007-preparacao-publicacao`

**Created**: 2026-11-05

**Status**: Draft

**Input**: User description: "Preparação para publicação do sistema na internet com domínio próprio (spec 007). Itens: (1) limite de tentativas no login do usuário, no login do administrador e na consulta pública do brinco; (2) senhas: cada usuário troca a própria senha; o dono redefine a senha do funcionário; o administrador do sistema redefine a senha do dono — sem e-mail; (3) montagem de produção: HTTPS automático com o domínio, site e API no mesmo endereço (API em /api), backend e banco fechados para a internet, Swagger desligado em produção, cabeçalhos de segurança; (4) backup automático diário do banco com cópia fora do servidor e roteiro testado de restauração; (5) verificação de saúde para reiniciar o sistema se travar; (6) limpar os 13 avisos antigos do lint. Hospedagem prevista: um servidor VPS com Docker. Fora do escopo: impressão das etiquetas com QR (depende do domínio e do formato da gráfica), preços e cobrança, termos de uso, app Android."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Senhas sob controle sem e-mail (Priority: P1)

Hoje ninguém consegue trocar a própria senha, e quem esquece fica sem acesso. Com o sistema à venda, cada usuário troca a própria senha quando quiser; o dono da fazenda redefine a senha de um funcionário que esqueceu; e o administrador do sistema (o dono do software) redefine a senha do dono de uma fazenda que esqueceu. Nada depende de e-mail.

**Why this priority**: sem isso, um cliente que esquece a senha perde o acesso ao próprio rebanho, e uma senha vazada não pode ser trocada; não dá para vender assim.

**Independent Test**: logar como funcionário e trocar a própria senha; como dono, redefinir a senha do funcionário e conferir que ele entra com a senha provisória e é obrigado a criar uma nova; como administrador, fazer o mesmo com o dono.

**Acceptance Scenarios**:

1. **Given** um usuário logado, **When** ele informa a senha atual correta e uma nova senha válida, **Then** a senha é trocada e a antiga deixa de funcionar.
2. **Given** a senha atual errada, **When** o usuário tenta trocar, **Then** o sistema recusa sem trocar nada.
3. **Given** um funcionário que esqueceu a senha, **When** o dono da fazenda dele pede a redefinição, **Then** o sistema mostra ao dono uma senha provisória, uma única vez, e no próximo login o funcionário é obrigado a criar uma senha nova antes de usar o sistema.
4. **Given** o dono de uma fazenda que esqueceu a senha, **When** o administrador do sistema pede a redefinição no painel, **Then** acontece o mesmo: senha provisória mostrada uma vez ao administrador e troca obrigatória no próximo login.
5. **Given** um dono, **When** ele tenta redefinir a senha de um usuário de outra fazenda ou de outro dono, **Then** o sistema recusa.
6. **Given** uma senha trocada ou redefinida, **When** alguém usa uma sessão aberta antes da troca, **Then** essa sessão deixa de valer e pede login de novo.

---

### User Story 2 - Sistema no ar com endereço seguro (Priority: P1)

O dono do software contrata um servidor e um domínio e sobe o sistema com um roteiro escrito. Os clientes acessam pelo domínio, com cadeado de conexão segura, de qualquer lugar; o site e os serviços dele respondem no mesmo endereço; o banco de dados e as partes internas não ficam expostos na internet; as páginas técnicas de documentação ficam desligadas.

**Why this priority**: é o próprio objetivo da publicação; sem isso não há venda.

**Independent Test**: num servidor de teste com um domínio de teste, seguir o roteiro do zero e conferir: acesso com conexão segura, endereço sem cadeado redirecionado para o seguro, banco e serviços internos inacessíveis de fora, documentação técnica desligada, sistema de pé de novo depois de reiniciar o servidor.

**Acceptance Scenarios**:

1. **Given** o domínio apontado para o servidor, **When** o sistema sobe pelo roteiro, **Then** o site abre pelo domínio com conexão segura e o certificado se renova sozinho, sem ação manual.
2. **Given** um acesso pelo endereço sem conexão segura, **When** a página é aberta, **Then** ela é redirecionada para o endereço seguro.
3. **Given** o sistema no ar, **When** alguém tenta acessar o banco de dados ou os serviços internos direto pelo endereço do servidor, **Then** não consegue.
4. **Given** o sistema no ar, **When** alguém abre o endereço da documentação técnica dos serviços, **Then** ela não aparece.
5. **Given** o servidor reiniciado (queda de energia, manutenção), **When** ele volta, **Then** o sistema volta sozinho, sem ninguém subir nada à mão.
6. **Given** uma parte do sistema que travou e parou de responder, **When** a verificação de saúde percebe, **Then** essa parte é reiniciada sozinha.
7. **Given** o site fora do ar por mais de 5 minutos, **When** o monitoramento externo percebe, **Then** o dono do software recebe um alerta, e outro quando o site voltar.

---

### User Story 3 - Backup diário que de fato restaura (Priority: P1)

Todo dia o banco é copiado automaticamente, e a cópia vai também para fora do servidor. Se o servidor quebrar ou alguém apagar dados por engano, o dono do software segue um roteiro testado e põe o sistema de volta com os dados do último backup.

**Why this priority**: o cliente confia o histórico do rebanho ao sistema; perder dados de clientes acaba com o negócio.

**Independent Test**: deixar o backup rodar, conferir a cópia fora do servidor, apagar um banco de teste e restaurá-lo pelo roteiro, conferindo as contagens de registros iguais às de antes.

**Acceptance Scenarios**:

1. **Given** o sistema no ar, **When** passa o horário do backup do dia, **Then** existe uma cópia nova do banco no servidor e uma fora dele.
2. **Given** backups de vários dias, **When** passa o prazo de guarda, **Then** as cópias mais antigas são apagadas e as recentes ficam.
3. **Given** o roteiro de restauração, **When** ele é seguido num servidor vazio com a cópia de fora, **Then** o sistema volta com os mesmos dados e as contagens de registros batem.
4. **Given** um backup que falhou ou não rodou, **When** passa o horário esperado, **Then** o dono do software recebe um alerta por e-mail ou celular.

---

### User Story 4 - Proteção contra tentativas em massa (Priority: P2)

Quem tenta adivinhar senhas, no login dos usuários ou no do administrador, é barrado depois de algumas tentativas erradas; quem tenta varrer a consulta pública do brinco em massa também é barrado. O uso normal não é afetado.

**Why this priority**: na internet aberta, robôs testam senhas o tempo todo; o painel do administrador controla todas as fazendas.

**Independent Test**: errar a senha repetidamente e conferir o bloqueio temporário e a mensagem; esperar o prazo e conferir que o login volta a funcionar; consultar brincos em sequência rápida e conferir o limite.

**Acceptance Scenarios**:

1. **Given** 5 senhas erradas seguidas para a mesma conta, **When** vem a 6ª tentativa dentro de 15 minutos, **Then** o sistema recusa mesmo com a senha certa e diz para tentar de novo mais tarde.
2. **Given** o bloqueio, **When** passam 15 minutos, **Then** o login volta a funcionar.
3. **Given** um login certo, **When** ele acontece antes do limite, **Then** a contagem de erros daquela conta zera.
4. **Given** o login do administrador, **When** as mesmas tentativas acontecem, **Then** vale o mesmo limite.
5. **Given** a consulta pública do brinco, **When** um mesmo acesso passa de 60 consultas por minuto, **Then** as seguintes são recusadas até o minuto virar; quem escaneia brincos no curral nunca chega perto disso.

---

### User Story 5 - Cadastro de novas fazendas (Priority: P2)

Hoje qualquer pessoa pode criar uma fazenda pela tela de cadastro. Como tudo é pago, inclusive o pacote inicial, o cadastro público acaba: o administrador do sistema cria a fazenda e o dono dela no painel, com uma senha provisória que o dono troca no primeiro login.

**Why this priority**: o pacote inicial também é vendido; um cadastro aberto dá acesso de graça.

**Independent Test**: tentar cadastrar uma fazenda pela tela pública e conferir a recusa; criar a fazenda e o dono pelo painel e entrar como o dono novo.

**Acceptance Scenarios**:

1. **Given** o sistema no ar, **When** alguém abre a tela de login, **Then** não há opção de criar fazenda, e o cadastro público é recusado mesmo se chamado direto.
2. **Given** o administrador no painel, **When** ele cria uma fazenda com o nome, o nome e o e-mail do dono, **Then** a fazenda nasce com o pacote inicial e o dono recebe uma senha provisória, mostrada uma vez ao administrador, que precisa ser trocada no primeiro login.
3. **Given** um e-mail já usado por outro usuário, **When** o administrador tenta criar a fazenda com ele, **Then** o sistema recusa sem criar nada.

---

### Edge Cases

- Senha provisória perdida antes do primeiro uso: quem redefiniu pode redefinir de novo; a provisória anterior deixa de valer.
- Usuário desativado: não pode ter a senha redefinida até ser reativado; o login dele continua recusado.
- Administrador que esqueceu a própria senha: não há tela para isso; o roteiro de operação traz o comando no servidor para criar ou redefinir o administrador.
- Bloqueio por tentativas não revela se a conta existe: a mensagem é a mesma para e-mail cadastrado ou não.
- Muitos usuários da mesma fazenda atrás da mesma internet (mesmo endereço): o bloqueio de login conta por conta, para um funcionário errando não travar o dono.
- Backup no meio de lançamentos: a cópia é consistente, sem metade de uma operação.
- Espaço do servidor acabando por causa dos backups: o prazo de guarda limita o espaço usado.
- Certificado de conexão segura que não conseguiu renovar: o sistema avisa no registro do servidor antes de vencer.
- Atualização do sistema (nova versão): o roteiro diz como subir a versão nova com as migrations, depois de um backup, sem perder dados.

## Clarifications

### Session 2026-11-05

- Q: O cadastro de fazenda continua aberto na internet? → A: Não. Tudo é pago, inclusive o pacote inicial; só o administrador cria fazendas no painel. Um período de teste grátis pode vir no futuro, não agora.
- Q: Para onde vai a cópia do backup fora do servidor? → A: Um armazenamento na nuvem, por ser mais simples e prático.
- Q: Na estreia, a produção começa vazia ou leva a fazenda real do desenvolvimento? → A: Começa vazia. A fazenda do dono do produto será recadastrada do zero e servirá de fazenda de teste do sistema; o padrasto dele, que trabalha com leite, testará o módulo Leite.

- Q: Quanto tempo um login deve durar? → A: 8 horas, como hoje (login todo dia), mas a tela de login deve permitir que o navegador ou o celular salve a senha, para o usuário não redigitar.
- Q: Como o dono do software fica sabendo se o site cair ou o backup falhar? → A: Um serviço externo gratuito de monitoramento testa o site a cada poucos minutos e avisa por e-mail ou celular; o backup avisa esse serviço ao terminar, e a falta do aviso no dia gera alerta.
- Q: O painel do administrador precisa de proteção além da senha? → A: Não; só senha forte (mínimo 12 caracteres) e o limite de tentativas.

## Requirements *(mandatory)*

### Functional Requirements

**Senhas**

- **FR-001**: Todo usuário logado MUST poder trocar a própria senha informando a senha atual e a nova.
- **FR-002**: Senhas novas MUST ter pelo menos 8 caracteres; senhas atuais mais curtas continuam valendo até a próxima troca. A senha do administrador do sistema MUST ter pelo menos 12 caracteres, ao criar e ao trocar; o painel não tem segundo fator nesta etapa.
- **FR-003**: O dono MUST poder redefinir a senha de qualquer funcionário ativo da própria fazenda; o administrador do sistema MUST poder redefinir a senha do dono de qualquer fazenda.
- **FR-004**: A redefinição MUST gerar uma senha provisória aleatória, mostrada uma única vez a quem redefiniu, e MUST obrigar o usuário a criar uma senha nova no próximo login, antes de qualquer outra tela.
- **FR-005**: Trocar ou redefinir a senha MUST encerrar as sessões abertas antes da troca.
- **FR-006**: Ninguém MUST conseguir redefinir senha de usuário de outra fazenda, e o dono não redefine a de outro dono.

- **FR-024**: O login MUST durar 8 horas para usuários e administrador. As telas de login e de troca de senha MUST ser reconhecidas pelo gerenciador de senhas do navegador ou do celular, para que ele ofereça salvar e preencher sozinho a senha (e trocar a salva quando a senha mudar). O próprio sistema nunca guarda a senha no aparelho.

**Limite de tentativas**

- **FR-007**: O login dos usuários e o do administrador MUST bloquear uma conta por 15 minutos depois de 5 senhas erradas seguidas, com a mesma mensagem para conta existente ou não.
- **FR-008**: A consulta pública do brinco MUST limitar cada acesso a 60 consultas por minuto.
- **FR-009**: Bloqueios MUST ficar registrados no registro do servidor (conta ou acesso, horário), sem gravar senhas.

**Produção**

- **FR-010**: O sistema MUST rodar no servidor com conexão segura pelo domínio, renovação automática do certificado e redirecionamento do endereço sem cadeado.
- **FR-011**: O site e os serviços MUST responder no mesmo domínio; o banco e os serviços internos MUST ficar inacessíveis de fora do servidor.
- **FR-012**: A documentação técnica dos serviços MUST ficar desligada em produção.
- **FR-013**: As respostas MUST trazer os cabeçalhos de segurança usuais de navegador (sem embutir o site em outros sites, sem adivinhação de tipo de arquivo, conexão segura obrigatória).
- **FR-014**: O sistema MUST voltar sozinho depois de reiniciar o servidor e MUST reiniciar a parte que parar de responder à verificação de saúde.
- **FR-015**: O repositório MUST trazer o roteiro de publicação: preparar o servidor, configurar as variáveis, subir, criar o primeiro administrador, atualizar para uma versão nova e conferir que está tudo no ar.

**Backup**

- **FR-016**: O banco MUST ser copiado automaticamente uma vez por dia, de forma consistente, e a cópia MUST ser enviada automaticamente para um armazenamento na nuvem, fora do servidor e de outro fornecedor, sem depender de nenhum computador ligado.
- **FR-017**: As cópias MUST ser guardadas por 7 dias (diárias) e 4 semanas (uma por semana); as mais antigas são apagadas.
- **FR-018**: O roteiro de restauração MUST estar escrito e MUST ter sido testado do zero, conferindo as contagens de registros.
- **FR-019**: A falha de um backup MUST ficar no registro do servidor e MUST gerar um alerta ao dono do software por e-mail ou celular, por um serviço externo de monitoramento: o backup avisa ao terminar, e a falta desse aviso no dia vira alerta.
- **FR-025**: Um serviço externo de monitoramento MUST testar o site a cada poucos minutos e avisar o dono do software por e-mail ou celular quando ele ficar fora do ar e quando voltar. O roteiro de publicação MUST explicar como configurar esse serviço.

**Dados na estreia**

- **FR-020**: A produção MUST começar com o banco vazio (só a estrutura e o primeiro administrador); nada do ambiente de desenvolvimento é levado.

**Cadastro de fazendas**

- **FR-022**: O cadastro público de fazenda MUST ser removido da tela e recusado pelos serviços.
- **FR-023**: O administrador do sistema MUST poder criar, no painel, uma fazenda com o dono dela; o dono recebe senha provisória com troca obrigatória no primeiro login (FR-004).

**Arrumação**

- **FR-021**: Os 13 avisos antigos do verificador de código MUST ser resolvidos sem mudar comportamento.

### Key Entities *(include if feature involves data)*

- **Usuário** *(existente)*: ganha a marca "precisa trocar a senha" e o momento da última troca de senha (para encerrar sessões anteriores).
- **Administrador** *(existente)*: ganha o mesmo momento da última troca de senha.
- **Tentativa de login**: conta de erros recentes por conta, com o início do bloqueio; não precisa ser guardada para sempre.
- **Backup**: arquivo diário do banco, com data, guardado no servidor e fora dele pelo prazo de guarda.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Um usuário que esqueceu a senha volta a entrar em menos de 5 minutos com a ajuda do dono (funcionário) ou do administrador (dono), sem e-mail.
- **SC-002**: Seguindo o roteiro, um servidor vazio fica com o sistema no ar pelo domínio, com conexão segura, em menos de 1 hora.
- **SC-003**: 100% dos acessos de fora ao banco e aos serviços internos são recusados.
- **SC-004**: Uma restauração completa a partir da cópia de fora do servidor leva menos de 30 minutos e devolve 100% das contagens de registros.
- **SC-005**: Depois de 5 senhas erradas, 100% das tentativas seguintes na mesma conta são recusadas por 15 minutos; o uso normal não é bloqueado.
- **SC-006**: Depois de um reinício do servidor, o sistema volta a responder em menos de 2 minutos, sem ação manual.

## Assumptions

- Hospedagem num servidor VPS com Docker, com acesso de administrador ao servidor; o domínio é registrado e apontado pelo dono do software.
- Sem e-mail nesta etapa: a recuperação de senha é feita por quem está acima na hierarquia (dono → funcionário, administrador → dono).
- O servidor tem um só endereço de produção; não há ambiente de homologação na nuvem nesta etapa (o teste é feito na máquina local, simulando o servidor).
- Um servidor só atende os primeiros clientes; escalar para vários servidores fica para depois.
- Primeiros usuários reais: a fazenda do dono do produto (teste geral) e a do padrasto dele (teste do Leite), criadas pelo painel.
- Fora do escopo: segundo fator no painel do administrador, período de teste grátis, impressão das etiquetas com QR, preços e cobrança, termos de uso e política de privacidade, aplicativo Android, e-mail transacional.
