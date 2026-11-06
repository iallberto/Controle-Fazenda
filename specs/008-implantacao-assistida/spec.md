# Feature Specification: Implantação assistida

**Feature Branch**: `008-implantacao-assistida`

**Created**: 2026-11-06

**Status**: Draft

**Input**: User description: "Implantação assistida (spec 008). A empresa vende o sistema e faz a implantação inicial na fazenda: o dono do software (administrador) visita a fazenda, leva os brincos e etiquetas impressos (rebanho + ~10 de sobra; ex.: 80 animais → 90), coloca os brincos em todo o rebanho no brete do cliente (ou no brete e balança da fazenda do dono do software, se o cliente não tiver estrutura) e ensina os funcionários. Três partes: (1) Acesso de suporte: a partir do painel do administrador, botão "Entrar na fazenda como suporte" que abre a fazenda do cliente com todas as telas existentes (QR codes, cadastro de animal, pesagem, manejo), como dono; registra quem entrou, em qual fazenda e quando; os lançamentos ficam marcados como feitos pelo suporte; faixa visível "Você está na Fazenda X como suporte" com botão para sair; sessão com prazo. Só administradores do sistema; o irmão agrônomo apenas acompanha e não terá acesso. (2) Teste grátis de 30 dias: o administrador libera o teste no painel depois da visita, e os 30 dias contam a partir da liberação; o dono vê quantos dias faltam; definir o que acontece no fim. (3) Impressão das etiquetas com QR: etiqueta 57×32 mm, QR de 28 mm com o link https://<domínio>/a/<código>, número sem zeros à esquerda (docs/pos-v1/Etiqueta-e-consulta-publica.md); o domínio vem da configuração de produção, sem endereço provisório gravado. Publicação na Oracle Cloud na segunda-feira (09/11/2026); estas partes entram logo depois, antes da primeira visita. Fora do escopo: cobrança e pagamento, venda de brincos pelo sistema, agendamento de visitas."

## Contexto

O maior obstáculo para o produtor começar a usar o sistema é gerar, imprimir e colar os QR codes
nos brincos de todo o rebanho. A empresa assume essa etapa: depois da venda, o dono do software
visita a fazenda (acompanhado do irmão agrônomo, que só acompanha), leva os brincos com as
etiquetas já impressas (rebanho mais cerca de 10 de sobra para os próximos partos), coloca os
brincos no brete do cliente e ensina o dono e os funcionários. Sem brete na fazenda, o cliente leva
os animais até a fazenda do dono do software, que tem brete e balança, e lá também é feita a
primeira pesagem. Os 30 dias grátis começam a contar depois dessa visita. Brincos seguintes são
comprados e impressos pelo produtor; ajuda em visitas posteriores é cobrada fora do sistema.

## Clarifications

### Session 2026-11-06

- Q: Em que formato a impressão das etiquetas deve sair? → A: PDF em folha A4 com as etiquetas nas
  medidas combinadas, os QR codes e marcas de corte. Os QR codes são gerados pelo sistema; a gráfica só
  imprime no papel adesivo e corta, e entrega as etiquetas prontas para descolar e colar no brinco na
  implantação.
- Q: O que o teste de 30 dias cobre? → A: O pacote inicial mais os módulos que o administrador
  escolher ao liberar. A implantação pode ser numa fazenda de corte, de leite ou das duas, então o
  teste é escolhível.
- Q: O que acontece no fim dos 30 dias sem contratação? → A: A fazenda fica só para consulta (vê tudo,
  não lança nada). Nos últimos 5 dias, o sistema sugere ao dono o pagamento por Pix; pago, o acesso é
  liberado por mais 30 dias.
- Q: Qual o valor cobrado no Pix? → A: Um valor fixo do pacote inicial mais um valor adicional por
  módulo incluído; o valor da renovação é a soma do que a fazenda tem.
- Q: Como o pagamento por Pix é confirmado? → A: Manualmente. O sistema mostra a chave Pix da empresa e
  o valor; o cliente paga e envia o comprovante pelo WhatsApp do suporte; o administrador confere e
  confirma no painel, o que libera mais 30 dias. Depois do vencimento há 2 dias de carência, com aviso
  no sistema, antes de a fazenda ficar só para consulta. O painel mostra os próximos clientes a vencer,
  para o suporte entrar em contato.
- Adicional pedido pelo dono do produto (2026-11-06): seção "Ajuda" no sistema, com um botão que abre o
  WhatsApp do suporte (+55 35 98477-6552) e, no futuro, perguntas frequentes e vídeos curtos dos
  cadastros básicos (pasto, parto, novo animal).
- Q: Como os vídeos e as perguntas frequentes entram na Ajuda? → A: Nesta spec, só a seção "Ajuda" com o
  botão do WhatsApp. Os tutoriais ficam para depois: vídeos curtos com roteiro, no canal da empresa no
  YouTube (que também terá vídeos de exposições e rodeios), e na Ajuda cada tutorial terá o passo a
  passo com capturas de tela e o vídeo em miniatura na mesma página.
- Q: Como fica uma fazenda recém-criada antes da liberação do teste? → A: "Aguardando implantação": o
  suporte lança tudo; o dono e os funcionários entram, mas só consultam. Depois da implantação, com
  todos os animais cadastrados, o administrador libera o teste manualmente no painel, e os 30 dias
  começam a contar.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Entrar na fazenda do cliente como suporte (Priority: P1)

Na implantação, o dono do software precisa gerar os códigos, imprimir as etiquetas, cadastrar os
animais vinculando cada brinco e lançar a primeira pesagem dentro da fazenda do cliente, usando as
mesmas telas que o cliente usa, sem pedir a senha de ninguém. No painel do administrador, ele abre
a fazenda e clica em "Entrar na fazenda como suporte". O sistema abre a fazenda com uma faixa
sempre visível "Você está na Fazenda X como suporte", com um botão para sair. Tudo o que ele lançar
fica marcado como feito pelo suporte.

**Why this priority**: sem isso, a equipe teria de usar a senha do cliente ou refazer as telas no
painel; é a base de toda a implantação.

**Independent Test**: no painel, entrar como suporte numa fazenda de teste, gerar códigos,
cadastrar um animal e lançar uma pesagem; conferir a faixa, a marca "suporte" no histórico do
animal, o registro de entrada no painel e a saída de volta ao painel.

**Acceptance Scenarios**:

1. **Given** o administrador no detalhe de uma fazenda, **When** clica em "Entrar na fazenda como
   suporte" e confirma, **Then** a fazenda abre com as telas do dono e a faixa "Você está na
   Fazenda X como suporte · Sair", e o painel registra quem entrou, em qual fazenda e quando.
2. **Given** a sessão de suporte, **When** o suporte cadastra um animal ou lança uma pesagem,
   **Then** o histórico mostra "Suporte (nome do administrador)" como autor.
3. **Given** a sessão de suporte, **When** o suporte clica em "Sair", **Then** volta ao painel do
   administrador e o registro guarda a hora de saída.
4. **Given** uma sessão de suporte aberta há mais de 8 horas, **When** o suporte tenta qualquer ação,
   **Then** o sistema pede para entrar de novo pelo painel.
5. **Given** um usuário da fazenda (dono ou funcionário), **When** ele usa o sistema, **Then** não
   existe nenhum caminho para entrar em outra fazenda.
6. **Given** a sessão de suporte, **When** o suporte tenta abrir a gestão de usuários da fazenda ou
   trocar senhas, **Then** o sistema recusa: isso é só do dono (a senha do dono se redefine pelo
   painel, como já existe).

---

### User Story 2 - Imprimir as etiquetas com QR (Priority: P1)

Antes da visita, o suporte (ou o próprio dono, mais tarde) gera um lote de códigos e imprime as
etiquetas no formato combinado: 57 × 32 mm, QR de 28 mm à esquerda com o endereço público do
animal no domínio definitivo, número sem zeros à esquerda à direita.

O arquivo é um PDF em folha A4 com as etiquetas lado a lado e marcas de corte, para a gráfica
imprimir no papel adesivo e cortar.

**Why this priority**: sem as etiquetas impressas não há visita de implantação.

**Independent Test**: gerar 90 códigos e imprimir; medir uma etiqueta impressa (57 × 32 mm, QR de
28 mm), escanear o QR com o celular e conferir que abre a página pública do animal no domínio
definitivo.

**Acceptance Scenarios**:

1. **Given** um lote de 90 códigos, **When** o dono ou o suporte manda gerar as etiquetas, **Then**
   sai um PDF em folhas A4 com as 90 etiquetas no formato combinado, em ordem de número, com marcas de
   corte, pronto para mandar à gráfica.
2. **Given** uma etiqueta impressa, **When** alguém a escaneia com o celular, **Then** abre a página
   pública do código no domínio definitivo.
3. **Given** o sistema sem o domínio definitivo configurado, **When** alguém tenta imprimir
   etiquetas com QR, **Then** o sistema recusa e explica que o endereço ainda não foi definido; nada
   com endereço provisório é impresso.
4. **Given** etiquetas de números acima de 999, **When** impressas, **Then** o número aparece com 4
   dígitos, sem zeros à esquerda nos números menores.
5. **Given** códigos já vinculados ou só alguns códigos escolhidos, **When** o dono pede a
   reimpressão, **Then** pode imprimir só os escolhidos (ex.: uma etiqueta que caiu).

---

### User Story 3 - Teste grátis de 30 dias e renovação por Pix (Priority: P2)

Depois da visita, o administrador libera no painel o teste de 30 dias para a fazenda e escolhe o
que entra no teste: o pacote inicial e os módulos que fizerem sentido (corte, leite ou os dois). A
contagem começa no dia da liberação. O dono vê no sistema quantos dias faltam. Nos últimos 5 dias, o
sistema mostra a chave Pix da empresa e o valor (pacote inicial + módulos), e um botão para mandar o
comprovante pelo WhatsApp do suporte. O administrador confere o pagamento e confirma no painel, o que
libera mais 30 dias. Depois do vencimento há 2 dias de carência com aviso; sem pagamento, a fazenda
fica só para consulta: o dono vê tudo o que registrou, mas não lança nada. No painel, o administrador
vê os próximos clientes a vencer, para ligar ou mandar mensagem antes.

**Why this priority**: o teste é a forma de venda combinada, mas o administrador já consegue liberar
módulos e suspender fazendas manualmente enquanto isso não existe.

**Independent Test**: liberar o teste numa fazenda de teste, conferir a contagem para o dono, simular
o fim do prazo e conferir a regra aplicada; contratar e conferir que a contagem some.

**Acceptance Scenarios**:

0. **Given** uma fazenda recém-criada no painel, **When** o dono ou um funcionário entra antes da
   liberação, **Then** vê a fazenda e o aviso "Aguardando implantação", só para consulta; o suporte
   lança normalmente.
1. **Given** uma fazenda criada no painel, **When** o administrador libera o teste de 30 dias
   marcando o Leite, **Then** a fazenda passa a ter o pacote inicial e o Leite até hoje + 30 dias,
   mostrado no painel; os módulos não marcados ficam fora.
2. **Given** a fazenda em teste, **When** o dono entra, **Then** vê "Teste grátis: faltam N dias".
3. **Given** faltam 5 dias ou menos, **When** o dono entra, **Then** vê o aviso com a chave Pix, o
   valor (pacote inicial + módulos da fazenda) e o botão "Enviar comprovante no WhatsApp".
4. **Given** o administrador confirma o pagamento no painel, **When** o dono volta ao sistema, **Then**
   o acesso vale por mais 30 dias, contados a partir do fim do prazo atual (ou de hoje, se já tinha
   vencido), e o pagamento fica registrado com valor e data.
5. **Given** o prazo vencido há até 2 dias, **When** o dono entra, **Then** continua lançando
   normalmente, com o aviso "Prazo vencido: faltam N dias de carência" e as opções de pagamento.
6. **Given** a carência terminada sem pagamento, **When** o dono entra, **Then** a fazenda está só para
   consulta, com a mensagem de que o prazo acabou e as opções de pagamento para voltar a lançar.
7. **Given** o painel do administrador, **When** ele abre "Próximos a vencer", **Then** vê as fazendas
   com prazo nos próximos 7 dias, em carência ou vencidas, com dono, telefone de contato (se houver),
   data e valor, ordenadas pela data.
8. **Given** a fazenda em teste ou vencida, **When** o administrador estende o prazo ou confirma a
   contratação sem prazo no painel, **Then** a nova situação passa a valer e fica registrada.

---

### User Story 4 - Ajuda e contato com o suporte (Priority: P2)

Em qualquer tela, o dono e o funcionário encontram no menu a seção "Ajuda", com um botão que abre a
conversa no WhatsApp do suporte já com o nome da fazenda na mensagem. Os tutoriais (passo a passo com
capturas de tela e vídeo curto do canal da empresa no YouTube) entram nesta seção numa spec futura.

**Why this priority**: o suporte contínuo é parte da venda; o produtor precisa achar o contato sem
procurar.

**Independent Test**: abrir "Ajuda" no celular, tocar no botão do WhatsApp e conferir que abre a
conversa com o número do suporte e a mensagem com o nome da fazenda.

**Acceptance Scenarios**:

1. **Given** um usuário logado, **When** abre "Ajuda" no menu, **Then** vê o botão "Falar com o
   suporte no WhatsApp", que abre a conversa com o número do suporte e a mensagem "Olá, sou da
   <fazenda> e preciso de ajuda".
2. **Given** a seção "Ajuda" nesta versão, **When** o usuário a abre, **Then** vê só o contato do
   suporte, sem área vazia de tutoriais.

---

### Edge Cases

- Suporte entra numa fazenda suspensa: pode entrar (para ajudar a regularizar), e a faixa avisa que
  a fazenda está suspensa.
- Dois administradores entram como suporte na mesma fazenda ao mesmo tempo: os dois podem; cada
  entrada é registrada separadamente.
- O administrador fecha o navegador sem clicar em "Sair": a sessão expira no prazo e o registro fica
  sem hora de saída, marcado como expirado.
- Durante a sessão de suporte, o token do painel do administrador continua separado: sair do suporte
  volta ao painel sem novo login, se o login do painel ainda valer.
- Teste liberado para uma fazenda que já é cliente pagante: o painel recusa e avisa.
- Brinco perdido ou etiqueta ilegível depois da implantação: o dono reimprime só aquele código (ou
  usa a reemissão de etiqueta que já existe) com os brincos de sobra.
- Domínio trocado depois de etiquetas impressas: as etiquetas antigas param de funcionar; por isso o
  domínio só é configurado uma vez e a impressão recusa endereço provisório.

## Requirements *(mandatory)*

### Functional Requirements

**Acesso de suporte**

- **FR-001**: O administrador do sistema MUST poder entrar em qualquer fazenda cliente a partir do
  painel, com confirmação, e usar as telas da fazenda com as permissões do dono.
- **FR-002**: Cada entrada de suporte MUST ficar registrada com o administrador, a fazenda, a hora de
  entrada e a hora de saída (ou a marca de expirada), e o registro MUST aparecer no detalhe da fazenda
  no painel.
- **FR-003**: Os registros criados ou alterados na sessão de suporte MUST mostrar como autor
  "Suporte (nome do administrador)".
- **FR-004**: A sessão de suporte MUST mostrar sempre uma faixa com o nome da fazenda e o botão
  "Sair", e MUST expirar em 8 horas.
- **FR-005**: Na sessão de suporte, a gestão de usuários da fazenda e a troca de senhas MUST ficar
  bloqueadas.
- **FR-006**: Usuários das fazendas (dono e funcionário) MUST continuar sem nenhum acesso a outras
  fazendas; o acesso de suporte só existe para administradores do sistema.

**Etiquetas com QR**

- **FR-007**: O sistema MUST gerar o arquivo de impressão das etiquetas no formato combinado:
  57 × 32 mm, QR de 28 mm com `https://<domínio>/a/<código>`, número sem zeros à esquerda.
- **FR-008**: O domínio das etiquetas MUST vir da configuração do servidor; sem domínio definitivo
  configurado, a impressão com QR MUST ser recusada.
- **FR-009**: O dono e o suporte MUST poder imprimir um lote inteiro ou códigos escolhidos.

**Teste grátis e renovação**

- **FR-009a**: Fazenda criada no painel MUST nascer "Aguardando implantação": o suporte lança, o dono
  e os funcionários só consultam, até o administrador liberar o teste.
- **FR-010**: O administrador MUST poder liberar o teste de 30 dias escolhendo os módulos que entram
  (o pacote inicial sempre entra), estender o prazo e confirmar a contratação sem prazo; cada ação
  MUST ficar registrada com quem fez e quando.
- **FR-011**: O dono da fazenda com prazo MUST ver quantos dias faltam; o funcionário não vê.
- **FR-012**: A partir de 5 dias antes do fim, e depois do fim, o dono MUST ver a chave Pix da empresa,
  o valor e o botão para enviar o comprovante pelo WhatsApp do suporte; o administrador MUST poder
  confirmar o pagamento no painel, o que libera mais 30 dias para o pacote inicial e os mesmos módulos
  e registra o pagamento (valor, data, quem confirmou).
- **FR-012b**: Depois do vencimento, a fazenda MUST ter 2 dias de carência com aviso, ainda lançando
  normalmente.
- **FR-012c**: O painel MUST listar os próximos clientes a vencer (prazo nos próximos 7 dias, em
  carência ou vencidos), com dono, contato, data e valor.
- **FR-012a**: O valor da renovação MUST ser o preço fixo do pacote inicial mais o preço de cada
  módulo incluído, com os preços definidos pelo administrador no painel.
- **FR-013**: No fim da carência sem pagamento, a fazenda MUST ficar só para consulta (pacote inicial e
  módulos do teste), sem apagar nenhum dado; voltar a pagar libera os lançamentos de novo.

**Ajuda**

- **FR-014**: O menu MUST ter a seção "Ajuda" para dono e funcionário, com o botão do WhatsApp do
  suporte (número na configuração do sistema: +55 35 98477-6552) e a mensagem com o nome da fazenda.
- **FR-015**: Tutoriais (passo a passo com capturas de tela e vídeo em miniatura do canal da empresa no
  YouTube) ficam fora desta spec; a seção "Ajuda" deve ter espaço para recebê-los depois.

### Key Entities

- **Sessão de suporte**: administrador, fazenda, entrada, saída ou expiração.
- **Prazo de acesso da fazenda**: fazenda, módulos incluídos, início, fim, origem de cada período
  (teste liberado pelo administrador, pagamento por Pix, extensão), quem liberou.
- **Pagamento por Pix**: fazenda, valor, data, quem confirmou, período liberado.
- **Contato do suporte**: número do WhatsApp e chave Pix da empresa, na configuração do sistema.
- **Etiqueta**: código (existente), número, endereço público no domínio definitivo.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Numa visita de implantação, o suporte cadastra e vincula o brinco de um animal em menos
  de 1 minuto por animal, sem usar a senha do cliente.
- **SC-002**: 100% das ações feitas como suporte aparecem com a marca "Suporte" no histórico, e 100%
  das entradas aparecem no registro do painel.
- **SC-003**: As etiquetas de um lote de 90 códigos ficam prontas para imprimir em menos de 1 minuto,
  e 100% dos QRs impressos abrem a página pública no domínio definitivo.
- **SC-004**: O dono da fazenda em teste sabe, em qualquer tela inicial, quantos dias de teste faltam.
- **SC-005**: Um dono que paga pelo Pix volta a lançar sem precisar falar com o suporte.

## Assumptions

- Só o dono do software é administrador; o irmão agrônomo acompanha as visitas sem conta no sistema.
- A publicação acontece em 09/11/2026 na Oracle Cloud, com domínio próprio; esta spec entra logo
  depois, antes da primeira visita.
- A primeira pesagem da implantação usa a tela de pesagem que já existe.
- Fora do sistema: outras formas de pagamento além do Pix, nota fiscal, venda de brincos e
  agendamento de visitas.
- Fazendas criadas antes desta spec (como a do dono do produto e a do padrasto dele) não entram em
  teste: são tratadas como clientes sem prazo.
