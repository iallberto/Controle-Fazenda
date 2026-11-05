# Research: Preparação para publicação

Decisões técnicas do plano. Cada uma tem a decisão, o porquê e o que foi descartado.

## O que já existe (levantado no código em 2026-11-05)

- **Login dos usuários**: já bloqueia por 15 minutos depois de 5 senhas erradas na mesma conta, em
  memória (`AuthService`), com a mesma mensagem para conta existente ou não, e zera no acerto.
- **Login do administrador**: já bloqueia por conta e endereço, com as tentativas gravadas no banco
  (`LOGIN_BLOQUEADO`), e a senha dele já exige 12 caracteres com letra e número (`criar-admin`).
- **Cadastro público**: só existe a rota `POST /auth/registrar-fazenda`; não há tela de cadastro no
  frontend (os scripts de validação usam a rota).
- **Sessão**: o token vale 8 horas e a estratégia já consulta o usuário a cada requisição
  (desativado ou fazenda suspensa perdem o acesso na hora).
- **Docker**: `docker-compose.yml` de desenvolvimento publica banco (só local), backend e frontend;
  o frontend é servido por Nginx com a URL da API embutida no build.

Com isso, o item 1 da spec se reduz a: limite na consulta pública e registro dos bloqueios no log.

## R1. Conexão segura e endereço único: Caddy na frente

- **Decision**: um container **Caddy 2** é a única porta aberta do servidor (80 e 443). Ele obtém e
  renova sozinho o certificado do domínio, redireciona `http` para `https`, envia `/api/*` ao backend
  (tirando o prefixo `/api`) e o resto ao frontend. Os cabeçalhos de segurança (FR-013) ficam no
  `Caddyfile`: `Strict-Transport-Security`, `X-Content-Type-Options: nosniff`,
  `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, e sem o cabeçalho
  `Server`.
- **Rationale**: certificado automático e renovação sem cron nem passo manual; configuração de
  poucas linhas; o backend não precisa mudar de rotas (o prefixo é tirado no proxy) e o frontend é
  construído com `VITE_API_URL=/api`, então site e API ficam na mesma origem (sem CORS na prática).
- **Alternatives considered**: Nginx + Certbot (mais passos e um cron de renovação); Traefik
  (configuração por labels, mais complexa para um servidor só); prefixo `/api` dentro do NestJS
  (mudaria todas as rotas e os testes).

## R2. Compose de produção separado

- **Decision**: arquivo novo `docker-compose.prod.yml`, independente do de desenvolvimento, com
  `db`, `backend`, `frontend`, `caddy`, `backup` e `autoheal`. Só o Caddy publica portas; banco,
  backend e frontend ficam na rede interna do Docker (FR-011). Variáveis em `.env` no servidor, com
  o modelo em `.env.producao.example` (domínio, senha do banco, `JWT_SECRET`, bucket e chaves do
  backup, URL de aviso do backup). `SWAGGER_ENABLED=false` fixo (FR-012) e
  `CORS_ORIGINS=https://<domínio>`. Todos com `restart: unless-stopped` (volta sozinho após reiniciar
  o servidor).
- **Rationale**: o arquivo de desenvolvimento continua como está para o dia a dia; produção não
  herda portas abertas por engano.
- **Alternatives considered**: um compose só com `profiles` ou sobreposição (`-f a -f b`): fácil
  errar e publicar porta de banco.

## R3. Verificação de saúde e reinício de quem travar

- **Decision**: rota pública `GET /saude` no backend, que faz `SELECT 1` no banco e responde
  `{ status: 'ok' }` (503 se o banco não responde). `healthcheck` no Docker para backend (`wget` em
  `/saude`), frontend e banco (`pg_isready`). Um container **autoheal** (`willfarrell/autoheal`)
  reinicia o container marcado como `unhealthy` (FR-014).
- **Rationale**: `restart: unless-stopped` só cobre processo que morre; um processo travado continua
  "rodando". O autoheal resolve isso com um container pequeno e sem configuração.
- **Alternatives considered**: script próprio em cron no servidor (mais coisa para manter);
  orquestrador (Kubernetes, Swarm) para um servidor só é exagero.

## R4. Backup diário na nuvem

- **Decision**: container `backup` (imagem `postgres:16-alpine` com `rclone`) com cron às 03:00
  (horário de Brasília):
  1. `pg_dump -Fc` do banco (cópia consistente, FR-016);
  2. guarda em `/backups/diarios/` e, no domingo, também em `/backups/semanais/`;
  3. envia as duas pastas com `rclone copy` para um bucket S3 compatível;
  4. apaga localmente e no bucket os diários com mais de 7 dias e os semanais com mais de 28
     (FR-017);
  5. no fim, chama a URL de aviso do Healthchecks.io; em qualquer erro chama a URL de falha e
     escreve no log (FR-019).
  Provedor sugerido: **Backblaze B2** (10 GB grátis, compatível com S3, empresa diferente do
  servidor). O `rclone` aceita qualquer S3 (Cloudflare R2, o da própria hospedagem), então trocar é
  só mudar as variáveis.
- **Restauração**: script `restaurar.sh` (baixa o arquivo do bucket, para o backend, `pg_restore
  --clean --if-exists`, sobe o backend) e roteiro em `docs/publicacao/`. Testado do zero na máquina
  local, comparando contagens de registros (FR-018).
- **Rationale**: sem dependência de computador ligado (decisão Q2); custo zero no começo.
- **Alternatives considered**: snapshot do disco da hospedagem (fica no mesmo fornecedor e nem toda
  VPS oferece); backup só local (some junto com o servidor).

## R5. Monitoramento externo

- **Decision**: **UptimeRobot** (plano grátis, teste a cada 5 minutos, alerta por e-mail e pelo app
  do celular) olhando `https://<domínio>/api/saude`, com aviso de queda e de volta (FR-025). Para o
  backup, **Healthchecks.io** (grátis): verificação diária com tolerância de 2 horas; se o aviso do
  backup não chegar, alerta por e-mail (FR-019). O roteiro explica a configuração dos dois.
- **Rationale**: decisão Q5 (serviço externo gratuito); ficam fora do servidor, então avisam mesmo
  com ele desligado.
- **Alternatives considered**: monitor próprio no servidor (não avisa se o servidor cair); tela de
  situação no painel (sem aviso ativo, descartada no clarify).

## R6. Senhas: troca, redefinição e sessões antigas

- **Decision**:
  - `Usuario` ganha `precisaTrocarSenha` (boolean, padrão false) e `senhaAlteradaEm` (timestamptz,
    nulo); `Administrador` ganha `senhaAlteradaEm`.
  - **Encerrar sessões antigas (FR-005)**: as estratégias JWT recusam (401) um token cujo `iat`
    (em segundos) seja anterior ao segundo de `senhaAlteradaEm`. A troca devolve um token novo, então
    quem trocou continua logado.
  - **Troca obrigatória (FR-004)**: o login devolve `precisaTrocarSenha`; um guard global recusa com
    403 `SENHA_PROVISORIA` toda rota de fazenda, exceto `POST /auth/trocar-senha`, enquanto a marca
    estiver ligada. O frontend leva direto à tela "Criar nova senha".
  - **Senha provisória**: 10 caracteres aleatórios (`crypto.randomInt`) de um alfabeto sem
    caracteres que se confundem (sem 0/O, 1/l/I), mostrada uma vez na resposta e nunca gravada em
    texto. Redefinir de novo invalida a anterior.
  - **Regras**: senha nova de usuário com 8 ou mais caracteres e diferente da atual; do
    administrador, a regra que já existe (12, letra e número).
- **Rationale**: sem e-mail (decisão do usuário); a checagem de `iat` aproveita a consulta ao
  usuário que a estratégia já faz em toda requisição, sem tabela de sessões.
- **Alternatives considered**: lista de tokens revogados (tabela nova e limpeza); dono digitar a
  senha nova do funcionário (o dono passaria a conhecer a senha definitiva).

## R7. Cadastro de fazendas só pelo administrador

- **Decision**: remover `POST /auth/registrar-fazenda` e o DTO (FR-022). Rota nova
  `POST /admin/fazendas` com nome da fazenda, nome e e-mail do dono: cria fazenda e dono na mesma
  transação, com senha provisória e `precisaTrocarSenha = true` (FR-023). No painel, botão "Nova
  fazenda" na lista. Os scripts de validação passam a criar as fazendas de teste por essa rota.
- **Rationale**: decisão Q1 (tudo pago, nada de graça).
- **Alternatives considered**: cadastro aberto aguardando aprovação (descartado no clarify).

## R8. Limite na consulta pública

- **Decision**: guard simples em memória (`common/limite-por-ip.guard.ts`), 60 consultas por minuto
  por endereço de origem, 429 acima disso, aplicado só no controller da consulta pública (FR-008). O
  backend confia no cabeçalho do proxy (`trust proxy` = 1) para saber o endereço real. Bloqueios de
  login e da consulta vão para o log com `Logger.warn` (conta ou endereço e horário, nunca a senha;
  FR-009).
- **Rationale**: mesmo padrão em memória do login dos usuários; um servidor só; sem dependência
  nova.
- **Alternatives considered**: `@nestjs/throttler` (dependência nova para uma rota só); limite no
  Caddy (exige build do Caddy com plugin).

## R9. Senha salva pelo navegador

- **Decision**: formulários de login (usuário e painel) e de troca de senha com `<form>` de verdade,
  `name`/`id` estáveis e `autoComplete` certo: `username` no e-mail, `current-password` na senha
  atual, `new-password` na nova (FR-024). Nada de guardar senha no `localStorage`.
- **Rationale**: o gerenciador de senhas do Chrome no Android e dos navegadores de computador
  oferece salvar e preencher quando os campos estão marcados assim; e atualiza a senha salva quando
  vê `new-password`.

## R10. Ensaio local antes do servidor

- **Decision**: o compose de produção sobe na máquina local com `DOMINIO=localhost` (o Caddy emite
  certificado interno para `localhost`). Validação: portas fechadas, `/api/saude`, cabeçalhos,
  backup para um remoto local do `rclone` (pasta) e restauração do zero, reinício do Docker e
  autoheal (pausando o backend). O teste com o bucket real e o domínio real fica no roteiro, para o
  dia da publicação.

## R11. Avisos antigos do lint

- **Decision**: remover os 13 imports e variáveis sem uso apontados pelo `oxlint`, sem mudar
  comportamento (FR-021); o baseline do lint passa a ser zero.
