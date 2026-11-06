---

description: "Tarefas da feature 008: implantação assistida"
---

# Tasks: Implantação assistida

**Input**: Design documents from `/specs/008-implantacao-assistida/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/api.md, quickstart.md

**Tests**: incluídos (constituição, princípio V). Jest com repositórios simulados; etiqueta impressa
medida.

**Organization**: tarefas agrupadas por história da spec (US1 a US4).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: pode rodar em paralelo (arquivos diferentes, sem dependência pendente)
- **[Story]**: história da spec (US1 a US4)

## Convenções

- Só o dono vê valores (preço, chave Pix); o funcionário vê só a situação.
- Migration nova: primeiro na cópia (backup novo, contagens, `migration:generate` vazio); depois no dev.
- Fazendas existentes ficam "sem prazo" e não podem perder nenhum lançamento.
- Ao terminar cada fase: testes, tipos e lint do backend e do frontend.

---

## Phase 1: Setup

- [X] T001 Backup novo do dev (`~/backup_antes_implantacao.dump`), recriar `controle_fazenda_copia` e anotar as contagens
- [X] T002 [P] Instalar `pdfkit` e `qrcode` (e os tipos) em backend/package.json, com versões fixas de pelo menos duas semanas

---

## Phase 2: Foundational

- [X] T003 Entidades: em backend/src/fazenda/entities/fazenda.entity.ts `semPrazo` boolean padrão `false`, `acessoAte` date nulo, `modulosPlano` lista de ModuloPago padrão vazia, `telefoneContato` varchar(30) nulo; em backend/src/usuario/entities/usuario.entity.ts `suporte` boolean padrão `false`; novas backend/src/modulos/admin/entities/sessao-suporte.entity.ts, registro-acesso.entity.ts (tipo `TESTE|PAGAMENTO|EXTENSAO|SEM_PRAZO`, de, ate, modulos, valorCentavos, administradorId, criadoEm) e preco-plano.entity.ts (item `PACOTE_INICIAL|LEITE|FINANCEIRO|NUTRICAO`, valorCentavos ≥ 0)
- [X] T004 Migration `ImplantacaoAssistida` gerada na cópia, com `UPDATE fazendas SET sem_prazo = true` para as existentes e as 4 linhas de preço em 0; aplicar na cópia, contagens iguais e `migration:generate` sem mudanças
- [X] T005 [P] Testes de backend/src/fazenda/acesso-fazenda.spec.ts e implementar backend/src/fazenda/acesso-fazenda.ts: situação na data (`SEM_PRAZO`, `AGUARDANDO_IMPLANTACAO`, `EM_DIA`, `CARENCIA` até 2 dias depois, `VENCIDO`), dias restantes e de carência (R3)

**Checkpoint**: banco com os campos novos; regra de prazo testada.

---

## Phase 3: User Story 1 - Entrar na fazenda como suporte (Priority: P1) 🎯

**Goal**: o administrador usa as telas da fazenda do cliente como dono, com tudo registrado.

**Independent Test**: quickstart, cenário 1.

- [X] T006 [US1] backend/src/modulos/admin/suporte.service.ts (+ spec): `POST /admin/fazendas/:id/suporte` cria (uma vez por administrador e fazenda) o usuário `suporte = true`, papel DONO, nome "Suporte · <administrador>", senha aleatória, abre a sessão em `sessoes_suporte` e devolve token de fazenda com `sessaoSuporteId`, usuário e fazenda (R1)
- [X] T007 [US1] backend/src/auth/strategies/jwt.strategy.ts: com `sessaoSuporteId`, 401 se a sessão saiu, passou de 8 h ou o administrador foi desativado; o usuário validado leva `suporte: true` (+ spec)
- [X] T008 [US1] `POST /auth/encerrar-suporte` grava a saída; login por senha recusa usuário suporte (backend/src/auth/auth.service.ts e auth.controller.ts) (+ testes)
- [X] T009 [US1] Guard global backend/src/auth/guards/suporte.guard.ts: com token de suporte, 403 `ACAO_SO_DO_DONO` no controller de Usuários e na troca de senha (+ spec) (FR-005)
- [X] T010 [US1] Suporte fora das listas: Usuários, aplicadores, contagem do painel, "um dono ativo sempre" e redefinição da senha do dono ignoram `suporte = true` (backend/src/usuario/usuario.service.ts, backend/src/modulos/admin/admin-fazendas.service.ts) (+ testes)
- [X] T011 [US1] `GET /admin/fazendas/:id` devolve as últimas 20 sessões de suporte (administrador, entrada, saída, expirada)
- [X] T012 [P] [US1] Frontend: no painel (frontend/src/modulos/admin/AdminFazendaDetalhe.tsx e api.ts) "Entrar como suporte" com confirmação, guarda o token de fazenda e abre `/`; lista de sessões
- [X] T013 [P] [US1] Frontend: frontend/src/components/FaixaSuporte.tsx na Layout ("Você está na <fazenda> como suporte · Sair"; avisa se a fazenda está suspensa); "Sair" chama encerrar-suporte, limpa a sessão da fazenda e volta a `/admin`; menu sem "Usuários" e "Trocar minha senha" para o suporte

**Checkpoint**: implantação possível pelas telas do cliente.

---

## Phase 4: User Story 2 - Etiquetas com QR (Priority: P1)

**Goal**: PDF A4 com as etiquetas prontas para a gráfica.

**Independent Test**: quickstart, cenário 2; etiqueta impressa medida.

- [X] T014 [US2] backend/src/codigo-identificacao/etiquetas.service.ts (+ spec): PDF A4 retrato, 3 × 8 etiquetas de 57 × 32 mm com 3 mm de espaço, marcas de corte, QR vetorial de 28 mm com `URL_PUBLICA/a/<código>`, número sem zeros à esquerda (~16 mm); 409 `DOMINIO_NAO_DEFINIDO` sem `URL_PUBLICA` https válida (localhost, IP ou http recusados) (R6)
- [X] T015 [US2] `GET /codigo/etiquetas.pdf?ids=` ou `?numeroDe=&numeroAte=` (DONO, inclui suporte) em backend/src/codigo-identificacao/codigo-identificacao.controller.ts; códigos só da fazenda, em ordem de número
- [X] T016 [P] [US2] Frontend frontend/src/pages/QrCodes.tsx: "Gerar etiquetas (PDF)" para o filtro atual ou os códigos marcados; mostra o aviso do domínio no 409
- [ ] T017 [US2] Imprimir uma folha de teste em tamanho real e medir etiqueta (57 × 32 mm) e QR (28 mm); escanear com o celular

**Checkpoint**: etiquetas da primeira visita prontas para a gráfica.

---

## Phase 5: User Story 3 - Teste de 30 dias e renovação por Pix (Priority: P2)

**Goal**: prazo de acesso com aviso, carência, só consulta e renovação confirmada no painel.

**Independent Test**: quickstart, cenário 3.

- [ ] T018 [US3] backend/src/fazenda/acesso-fazenda.service.ts (+ spec): situação com cache curto (limpo ao mudar o prazo), valor do plano (pacote + módulos do plano, de `precos_plano`) e `GET /fazenda/acesso` (dono recebe valor, chave Pix e módulos; funcionário só a situação; todos recebem o WhatsApp)
- [ ] T019 [US3] Guard global backend/src/auth/guards/acesso-fazenda.guard.ts (+ spec): 403 `FAZENDA_SO_CONSULTA` em não-GET quando AGUARDANDO_IMPLANTACAO ou VENCIDO, exceto suporte e rotas `@PermiteSemAcesso()` (troca de senha)
- [ ] T020 [US3] backend/src/modulos/admin/prazo-fazendas.service.ts (+ spec): liberar teste (`acessoAte = hoje + 30`, módulos escolhidos com períodos até `acessoAte + 2`, 409 se já tem prazo ou é sem prazo), confirmar pagamento (`max(acessoAte, hoje) + 30`, estende ou recria os períodos dos módulos, valor do plano por padrão), estender prazo, cliente sem prazo (períodos sem término), cada ação em `registros_acesso` (R4, R5)
- [ ] T021 [US3] Rotas do painel em backend/src/modulos/admin/admin.controller.ts: teste, pagamento, prazo, sem-prazo, `PATCH /admin/fazendas/:id` (telefone), `GET /admin/vencimentos` (até hoje + 7, carência e vencidos, ordenado), `GET/PUT /admin/precos`; `GET /admin/fazendas/:id` com o prazo e o histórico de acesso
- [ ] T022 [P] [US3] Frontend frontend/src/components/AvisoPrazo.tsx na Layout: dono vê dias restantes, e nos últimos 5 dias, em carência ou vencido, valor, chave Pix (copiar) e "Enviar comprovante no WhatsApp" (`wa.me` com a mensagem e o nome da fazenda); funcionário vê só "Aguardando implantação" ou "Fazenda só para consulta"; o 403 `FAZENDA_SO_CONSULTA` mostra a mesma mensagem
- [ ] T023 [P] [US3] Painel: no detalhe da fazenda, prazo e histórico, "Liberar teste de 30 dias" (escolha dos módulos), "Confirmar pagamento", "Estender prazo", "Cliente sem prazo" e telefone; páginas frontend/src/modulos/admin/AdminVencimentos.tsx e AdminPrecos.tsx, com links no AdminLayout

**Checkpoint**: venda com teste e renovação funcionando.

---

## Phase 6: User Story 4 - Ajuda (Priority: P2)

**Goal**: contato com o suporte a um toque.

**Independent Test**: quickstart, cenário 4.

- [ ] T024 [P] [US4] frontend/src/pages/Ajuda.tsx (rota `/ajuda`) e item "Ajuda" no menu para dono e funcionário: botão "Falar com o suporte no WhatsApp" com o número de `GET /fazenda/acesso` e a mensagem com o nome da fazenda

---

## Phase 7: Polish & Cross-Cutting Concerns

- [ ] T025 [P] `URL_PUBLICA`, `PIX_CHAVE`, `SUPORTE_WHATSAPP` em docker-compose.prod.yml (`URL_PUBLICA=https://${DOMINIO}`), .env.producao.example e docs/publicacao/Roteiro-de-publicacao.md (passos da Oracle: portas 80/443 também na rede da Oracle)
- [ ] T026 [P] Atualizar docs/pos-v1/Etiqueta-e-consulta-publica.md (impressão concluída, formato da gráfica) e README
- [ ] T027 Migration no dev (`docker compose up -d --build`), conferir que as fazendas existentes seguem lançando, quickstart completo e registro neste arquivo

---

## Dependencies & Execution Order

- **Setup → Foundational** → histórias.
- **US1** e **US2** independentes entre si (a US2 usa o suporte só para gerar o PDF numa fazenda nova).
- **US3** depende da base (T003–T005); usa o suporte para lançar na fazenda aguardando implantação.
- **US4** depende de `GET /fazenda/acesso` (T018) para o número; pode usar o número fixo da configuração se vier antes.
- **Polish** por último.

### Parallel Opportunities

- T002 em paralelo com a base.
- Na US1, T012 e T013 juntos depois de T006–T011.
- US1 e US2 em paralelo.
- Na US3, T022 e T023 juntos depois de T018–T021.

## Implementation Strategy

### MVP (incremento 1: o necessário para a primeira visita)

1. Setup e Foundational.
2. US1 (suporte) e US2 (etiquetas).
3. Parar para o dono testar no dev e mandar a folha de teste à gráfica.

### Incremento 2: venda

1. US3 (prazo, teste, Pix, vencimentos, preços) e US4 (Ajuda).
2. Polish e quickstart completo.

## Registro do incremento 1 (T001–T016)

- Bibliotecas: `pdfkit` 0.20.2 e `qrcode` 1.5.4 (e os tipos), versões fixas. O `npm audit` aponta falhas antigas em
  body-parser, multer e qs (não vêm destas bibliotecas): tratar antes da publicação.
- Migration `ImplantacaoAssistida1793981217278`: na cópia e no dev, as 7 fazendas existentes ficaram sem prazo,
  4 preços em zero, contagens iguais e `migration:generate` sem mudanças.
- Backend: 551 testes (92 suítes), lint zero. O e-mail interno do suporte usa um hash do par administrador +
  fazenda (o primeiro formato passava de 64 caracteres e era recusado como e-mail inválido).
- Cópia (script com `URL_PUBLICA` de exemplo): 23 verificações, nenhuma falha — entrar como suporte, gerar códigos,
  cadastrar animais e pesagem com autoria "Suporte · <administrador>", Usuários e troca de senha recusados, suporte
  fora da lista do dono e da contagem do painel, login por senha recusado, PDF de 30 etiquetas em 2 folhas A4, por
  faixa e recusas, códigos de outra fazenda fora, sair invalida o token, nova entrada reaproveita o usuário, sessão de
  mais de 8 h recusada e marcada como expirada.
- PDF renderizado: A4, 3 × 8 etiquetas, marcas de corte, números sem zeros à esquerda; teste confirma o link de
  cada QR. Com o QR de 28 mm, um número de 3 dígitos sai com cerca de 10 mm de altura.
- Tela a 375 px: seção "Acesso de suporte" no painel (entradas com data e hora), faixa amarela com "Sair" de volta ao
  painel, menu sem Usuários e sem "Trocar minha senha", botão "Etiquetas para a gráfica (PDF)" na tela de QR codes.
- Pendente: T017 (imprimir uma folha com o domínio definitivo, medir e escanear) depende do domínio.

