# Research: Implantação assistida

Decisões técnicas do plano. Cada uma tem a decisão, o porquê e o que foi descartado.

## O que já existe (levantado no código em 2026-11-06)

- **Módulos pagos**: períodos em `modulos_fazenda` (início, término opcional, desativação); a situação
  (ATIVO, SO_CONSULTA, NAO_CONTRATADO) é calculada na data, e o `ModuloGuard` deixa consultar e recusa
  lançar quando o módulo está só para consulta.
- **Pacote inicial**: sempre liberado; o único corte é a suspensão da fazenda pelo administrador.
- **Painel**: cria fazenda com dono (spec 007), libera e desativa módulos, suspende, redefine a senha do
  dono. Token do administrador separado (`aud: admin`).
- **Autoria**: 37 colunas `criado_por`/`atualizado_por` apontam para `usuarios`; o histórico mostra o
  nome do usuário.
- **QR codes**: códigos aleatórios de 8 caracteres em `codigos_identificacao`; a tela imprime hoje só os
  números (pendência do domínio). Nenhuma biblioteca de QR ou PDF no projeto.

## R1. Acesso de suporte: um usuário "suporte" por administrador e fazenda

- **Decision**: ao entrar como suporte, o servidor cria (na primeira vez) um usuário na fazenda com
  `suporte = true`, papel DONO, nome "Suporte · <nome do administrador>", senha aleatória que ninguém
  conhece, e abre uma **sessão de suporte** (`sessoes_suporte`: administrador, fazenda, usuário, entrada,
  saída). Devolve um token de fazenda desse usuário com `sessaoSuporteId`. A estratégia JWT confere a
  sessão a cada requisição: aberta, com menos de 8 horas e administrador ativo; senão, 401.
- **Rationale**: todas as telas e regras do dono funcionam sem mudança, e a autoria ("criado por") já
  sai como "Suporte · Alberto" nas 37 colunas existentes, sem migração em massa. O registro das entradas
  fica numa tabela própria, visível no painel.
- **Alternatives considered**: token com o id do administrador (quebraria as chaves de autoria, que
  apontam para `usuarios`); usar a conta do dono (sem rastro de quem fez); refazer as telas no painel
  (muito trabalho e o painel não deve ler rebanho).

## R2. O que o usuário suporte não faz e onde ele não aparece

- **Decision**:
  - Login por senha recusado para `suporte = true` (só entra pelo painel).
  - Guard global recusa com 403 `ACAO_SO_DO_DONO` o controller de Usuários e a troca de senha quando o
    token é de suporte (FR-005).
  - Usuários suporte ficam fora: da lista de Usuários, dos aplicadores, da contagem de usuários ativos no
    painel, da regra "fazenda sempre com um dono ativo" e da redefinição da senha do dono.
  - A faixa da tela vem do login de suporte (`usuario.suporte`, nome da fazenda); "Sair" chama
    `POST /auth/encerrar-suporte`, grava a saída e volta ao painel.
- **Rationale**: o suporte age como dono no rebanho, mas não mexe em quem entra na fazenda.

## R3. Prazo de acesso da fazenda (pacote inicial)

- **Decision**: a fazenda ganha `sem_prazo` (boolean), `acesso_ate` (date, nulo) e `modulos_plano`
  (lista dos módulos pagos do plano). A situação é calculada na data:
  - `SEM_PRAZO`: cliente sem prazo (todas as fazendas que já existem; ver R7);
  - `AGUARDANDO_IMPLANTACAO`: sem prazo nenhum ainda (`acesso_ate` nulo e não `sem_prazo`);
  - `EM_DIA`: hoje ≤ `acesso_ate`;
  - `CARENCIA`: até 2 dias depois de `acesso_ate`;
  - `VENCIDO`: depois da carência.

  Um guard global (`AcessoFazendaGuard`) recusa com 403 `FAZENDA_SO_CONSULTA` toda requisição que não é
  `GET` dos usuários da fazenda quando a situação é AGUARDANDO_IMPLANTACAO ou VENCIDO, exceto as rotas
  marcadas `@PermiteSemAcesso()` (trocar senha). O usuário suporte passa sempre. Cache curto como o dos
  módulos.
- **Rationale**: mesmo modelo calculado dos módulos (vencimento vale sozinho, sem tarefa agendada); o
  bloqueio fica no servidor (constituição II).
- **Alternatives considered**: tarefa diária que suspende fazendas (mais peças, e a suspensão bloqueia
  até a consulta, contra a decisão Q3).

## R4. Módulos do plano acompanham o prazo

- **Decision**: liberar o teste cria um período em `modulos_fazenda` para cada módulo escolhido, de hoje
  até `acesso_ate + 2` (a carência incluída). Cada renovação estende o término desses períodos (ou cria
  um novo período a partir de hoje, se o anterior já venceu). "Sem prazo" deixa o término vazio.
- **Rationale**: o `ModuloGuard` e a situação dos módulos continuam como estão; depois da carência os
  módulos ficam SO_CONSULTA sozinhos, como o pacote inicial.

## R5. Renovação por Pix, manual

- **Decision**:
  - Preços em `precos_plano` (PACOTE_INICIAL, LEITE, FINANCEIRO, NUTRICAO, em centavos), editados no
    painel. O valor da renovação é o pacote inicial mais os módulos do plano.
  - A chave Pix da empresa e o WhatsApp do suporte vêm de variáveis do servidor (`PIX_CHAVE`,
    `SUPORTE_WHATSAPP`), documentadas no `.env.producao.example`.
  - O dono vê, a partir de 5 dias antes do fim: valor, chave Pix com botão de copiar e o botão "Enviar
    comprovante no WhatsApp" (link `wa.me` com a mensagem pronta).
  - No painel, "Confirmar pagamento" grava em `registros_acesso` (PAGAMENTO, valor, de, até, quem) e leva
    `acesso_ate` para `max(acesso_ate, hoje) + 30`.
- **Rationale**: decisão Q1 do clarify (manual, sem custo); a tela do cliente não muda se um dia o
  pagamento virar automático.

## R6. Etiquetas em PDF no servidor

- **Decision**: rota `GET /codigo/etiquetas.pdf` (dono e suporte) que gera o PDF com **pdfkit** e o QR
  com **qrcode** (vetor). Folha A4 em retrato, grade de 3 colunas × 8 linhas (24 etiquetas por folha),
  etiqueta 57 × 32 mm com 3 mm de espaço entre elas e marcas de corte nas margens; QR de 28 mm à
  esquerda com `URL_PUBLICA/a/<código>`, número sem zeros à esquerda à direita (cerca de 16 mm de altura).
  `URL_PUBLICA` vem do servidor; se faltar, for `http` ou apontar para `localhost`/IP, a rota recusa com
  409 `DOMINIO_NAO_DEFINIDO`.
- **Rationale**: o domínio nunca passa pelo navegador nem fica gravado num endereço provisório; o PDF sai
  igual em qualquer aparelho. As duas bibliotecas são pequenas, sem dependências nativas.
- **Alternatives considered**: gerar no navegador (dependeria do endereço da página e da impressora de
  cada um); HTML para imprimir (medidas variam por navegador).

## R7. Fazendas que já existem

- **Decision**: a migration marca `sem_prazo = true` em todas as fazendas existentes (a do dono do
  produto, a do padrasto e as de teste). Fazendas novas nascem `sem_prazo = false`, sem prazo:
  AGUARDANDO_IMPLANTACAO.
- **Rationale**: premissa da spec; nada muda para quem já usa.

## R8. Ajuda

- **Decision**: rota `/ajuda` no menu (dono e funcionário), com o botão do WhatsApp; o número vem de
  `GET /fazenda/acesso` (que já traz a situação do prazo). Espaço reservado para os tutoriais futuros, sem
  área vazia.

## R9. Próximos a vencer e contato

- **Decision**: `GET /admin/vencimentos` lista fazendas com prazo até hoje + 7 dias, em carência ou
  vencidas, ordenadas pela data, com dono (nome e e-mail), `telefone_contato` (campo novo da fazenda,
  editado no painel), data e valor.
