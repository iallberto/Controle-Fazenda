# Research: Infraestrutura de Módulos (Fase 0)

Decisões técnicas do plano. Cada uma com o porquê e o que foi descartado.

## R1. Migrations no lugar do `synchronize`

- **Decision**: `synchronize` desligado em **todos** os ambientes, inclusive desenvolvimento.
  O schema passa a evoluir só por migrations do TypeORM em `backend/src/database/migrations/`,
  descobertas por um `DataSource` próprio (`backend/src/database/data-source.ts`) usado pela CLI
  (`migration:generate`, `migration:run`, `migration:revert`) e pelo `AppModule`.
  O backend aplica as pendentes ao subir (`migrationsRun: true`), dentro de uma transação.
  A variável `DB_SYNCHRONIZE` sai do `docker-compose.yml`.
  A CLI roda sobre o código **compilado** (`npm run build` e depois
  `typeorm -d dist/database/data-source.js ...`), sem ts-node: o backend compila para CommonJS e
  a imagem de produção só tem `dist/`. O comando `admin:criar` (R6) segue o mesmo caminho.
- **Rationale**: com o `synchronize` ligado só em dev, o banco de dev e o de produção divergem
  sem ninguém notar; desligado em tudo, a migration gerada é a mesma que vai para produção
  (D7, constituição, restrições técnicas). Aplicar ao subir dispensa um passo manual no deploy
  de uma instância só.
- **Alternatives considered**: manter `synchronize` em dev (rejeitado: deriva silenciosa);
  rodar migrations num serviço separado do compose (rejeitado: complexidade sem ganho com uma
  instância só).

## R2. Migration inicial sobre um banco que já existe (baseline)

- **Decision**: a migration `Inicial` é gerada contra um banco **vazio** temporário, então cria
  tudo. Ela começa com uma checagem: se a tabela `fazendas` já existe, o banco foi criado pelo
  `synchronize` e a migration **não executa DDL** (só fica registrada como aplicada). Para provar
  que o banco existente é idêntico às entidades, depois de aplicar roda-se `migration:generate`
  contra ele e o resultado precisa ser **vazio** ("No changes"). O teste é feito numa **cópia**
  do banco de dev (`pg_dump` → banco `controle_fazenda_copia`), nunca no original.
- **Rationale**: o banco de dev tem a fazenda real de referência; o baseline preserva 100% dos
  registros (FR-002, SC-001) e a checagem do diff vazio garante que a estrutura bate.
- **Alternatives considered**: gerar a inicial contra o banco existente (rejeitado: gera
  migration vazia e não serve para instalação nova); `INSERT` manual na tabela `migrations`
  (rejeitado: passo manual sujeito a esquecimento).

## R3. Liberação de módulos

- **Decision**: tabela `modulos_fazenda`, um registro por **período** de contrato (ver
  [data-model.md](./data-model.md)). A situação de um módulo para a fazenda numa data é calculada,
  não guardada:
  - **ATIVO**: existe período não desativado com `dataInicio ≤ hoje` e (`dataTermino` vazia ou
    `hoje ≤ dataTermino`);
  - **SO_CONSULTA**: não está ativo, mas existe algum período com `dataInicio ≤ hoje`
    (já teve o módulo: desativado ou vencido) — Q1 = B;
  - **NAO_CONTRATADO**: nenhum período começado.
  No máximo um período "vigente ou futuro" (não desativado e sem término passado) por fazenda e
  módulo; checado no service dentro de transação com lock da fazenda.
- **Rationale**: calcular pela data faz o vencimento valer sem tarefa agendada (FR-007,
  premissa da spec) e mantém o histórico (FR-008).
- **Alternatives considered**: coluna `ativo` atualizada por job (rejeitado: mais uma peça e
  risco de ficar desatualizada); índice único parcial (rejeitado: não expressa "término passado").

## R4. Bloqueio no backend

- **Decision**: decorator `@Modulo(ModuloPago.LEITE)` na classe do controller (e opcionalmente
  `@Modulo(..., 'CONSULTA' | 'LANCAMENTO')` no método) e um `ModuloGuard` global, registrado
  depois do `RolesGuard`. Sem a marca, a rota não é de módulo pago e passa direto. Sem a forma
  explícita, o tipo da ação vem do método HTTP: `GET` = consulta, demais = lançamento.
  Respostas: **403** `{ codigo: 'MODULO_NAO_CONTRATADO', message: 'Módulo não contratado' }` ou
  **403** `{ codigo: 'MODULO_SO_CONSULTA', message: 'Módulo desativado: só consulta' }`.
  Um teste percorre os controllers de `modulos/leite`, `modulos/financeiro` e `modulos/nutricao`
  e falha se algum não tiver `@Modulo` (FR-009).
- **Rationale**: o guard global não depende de cada desenvolvedor lembrar de checar; o padrão
  pelo método HTTP evita marcar rota por rota (FR-010, FR-011a).
- **Alternatives considered**: checagem dentro de cada service (rejeitado: fácil de esquecer);
  middleware por prefixo de URL (rejeitado: frágil a mudanças de rota).

## R5. Cache da situação dos módulos

- **Decision**: `AcessoModulosService` guarda, em memória, a situação dos três módulos por
  fazenda com validade de **60 s**; liberar, desativar, suspender ou reativar limpa a entrada
  daquela fazenda na hora.
- **Rationale**: uma consulta a menos por requisição nas rotas de módulo; 60 s cumpre "no máximo
  1 minuto" (FR-011) mesmo se um dia houver mais de uma instância.
- **Alternatives considered**: Redis (rejeitado: dependência nova para uma instância só);
  sem cache (aceitável hoje, mas a spec pede SC-005).

## R6. Administrador do sistema

- **Decision**: tabela própria `administradores` (não é `usuarios`, que exige fazenda), papel
  fixo. Login em `POST /admin/auth/login`, que emite um JWT com `aud: 'admin'`. Uma estratégia
  Passport separada (`jwt-admin`) valida esse token contra `administradores`; a estratégia das
  fazendas passa a **recusar** tokens com `aud: 'admin'`, e a de admin recusa tokens sem ele
  (FR-018). O controller do painel é marcado `@AreaAdmin()`, que o `JwtAuthGuard` global trata
  como fora da área de fazenda e entrega ao `AdminJwtGuard`.
  A conta é criada por comando: `npm run admin:criar` (script com `DataSource`, pede nome,
  e-mail e senha no terminal; valida a senha forte) — FR-022.
- **Rationale**: separar a tabela e o `aud` impede, por construção, que um token de um lado
  abra rotas do outro; o painel não importa nenhum service de rebanho (FR-021).
- **Alternatives considered**: papel `ADMIN` em `usuarios` com `fazendaId` nulo (rejeitado: todo
  código atual assume fazenda no usuário; risco de vazar dados entre fazendas).

## R7. Senha e bloqueio do administrador

- **Decision**: senha com no mínimo 12 caracteres, com letras e números (validada no comando e
  em `class-validator`); bcrypt como nas fazendas. Toda tentativa de login do administrador vai
  para a tabela `admin_tentativas_login` (e-mail, sucesso, data, IP). Bloqueio: 5 falhas
  seguidas nos últimos 15 minutos para o mesmo e-mail → 429 "Muitas tentativas; tente de novo
  em N minutos", mesmo com a senha certa (FR-018a).
- **Rationale**: guardar no banco atende "cada tentativa registrada" e sobrevive a reinício,
  diferente do controle em memória do login das fazendas.
- **Alternatives considered**: reaproveitar o `Map` em memória do `AuthService` (rejeitado: não
  registra nem sobrevive a reinício).

## R8. Suspensão de fazenda

- **Decision**: coluna `suspensa` (boolean) em `fazendas` para a checagem rápida e tabela
  `fazenda_suspensoes` para o histórico (motivo, quem suspendeu e quando, quem reativou e
  quando). A `JwtStrategy` das fazendas, que já busca o usuário a cada requisição, passa a
  carregar a fazenda junto e recusa com **403** `{ codigo: 'ACESSO_SUSPENSO' }`; o login recusa
  com a mesma mensagem "Acesso suspenso · fale com o suporte" (FR-026). Suspender não toca em
  nenhuma outra tabela (FR-027).
- **Rationale**: aproveita a consulta que já existe por requisição; o efeito é imediato.
- **Alternatives considered**: revogar tokens (rejeitado: a checagem por requisição já resolve).

## R9. Página pública na suspensão

- **Decision**: `ConsultaPublicaService` verifica `fazenda.suspensa`; se suspensa, devolve só
  `{ fazenda, brinco, raca, sexo, categoria, suspensa: true }`, sem pesos, arrobas, idade,
  pastos ou histórico. O frontend mostra "Informações completas indisponíveis no momento"
  (FR-028).
- **Rationale**: o corte acontece no backend; o frontend não recebe o que não pode mostrar.

## R10. Frontend: módulos, vitrine e aviso de vencimento

- **Decision**: `GET /fazenda/modulos` devolve os três módulos com situação, `dataTermino` e
  `diasParaVencer`. Um `ModulosContext` carrega isso depois do login e a cada navegação de
  tela inteira. O menu ganha o grupo **Módulos** com Leite, Financeiro e Nutrição; cada item
  mostra o selo da situação. A rota `/modulos/:modulo` é protegida por `RotaDeModulo`, que
  mostra a vitrine (NAO_CONTRATADO), a tela do módulo em modo consulta (SO_CONSULTA) ou a tela
  do módulo (ATIVO). Como os módulos ainda não existem, a "tela do módulo" desta fase é uma
  página de espera que chama a rota de exemplo (R11). O aviso de vencimento aparece para o
  dono no topo do painel inicial a cada login (guardado por sessão, some ao fechar e volta no
  próximo login) — FR-016a. Um 403 `ACESSO_SUSPENSO` no interceptor do `apiClient` limpa a
  sessão e leva ao login com o aviso.
- **Rationale**: uma fonte só para menu, rota e aviso; a proteção real continua no backend.

## R11. Rotas de exemplo dos módulos

- **Decision**: em cada módulo, um controller `ExemploController` com `GET /modulos/<modulo>/exemplo`
  (consulta) e `POST /modulos/<modulo>/exemplo` (lançamento), que só devolvem
  `{ modulo, acao, ok: true }`. Marcados com comentário "remover quando o módulo real existir".
- **Rationale**: prova o bloqueio de ponta a ponta (FR-012, SC-003) sem inventar regra de negócio.

## R12. Painel do administrador no frontend

- **Decision**: no mesmo app, rotas `/admin/login` e `/admin` com layout próprio, token em
  `localStorage['adminToken']` e cliente `adminClient` separado do `apiClient` (o token de
  fazenda nunca vai para o painel e vice-versa). Telas: lista de fazendas com busca e selos dos
  módulos; detalhe da fazenda com liberar, desativar, suspender, reativar e histórico.
- **Rationale**: um deploy só (D5); a separação está no token e no cliente HTTP.
- **Alternatives considered**: um segundo app (rejeitado: deploy e build a mais).

## R13. Organização do código

- **Decision**: backend em `backend/src/modulos/{acesso,admin,leite,financeiro,nutricao}`;
  frontend em `frontend/src/modulos/{admin,vitrine,leite,financeiro,nutricao}`. Módulos pagos
  não importam uns dos outros; o pacote inicial não importa módulos pagos (FR-024).
- **Rationale**: decisão D5 e seção 2.6 do planejamento.
