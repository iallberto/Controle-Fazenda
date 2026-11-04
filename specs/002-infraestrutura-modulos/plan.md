# Implementation Plan: Infraestrutura de Módulos (Fase 0)

**Branch**: `002-infraestrutura-modulos` | **Date**: 2026-11-04 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/002-infraestrutura-modulos/spec.md`

## Summary

Preparar o sistema para ser vendido por partes. Quatro frentes:

1. **Migrations:** o banco passa a evoluir só por migrations do TypeORM, e o `synchronize` é
   desligado em todos os ambientes. A migration inicial reconhece um banco já existente e o
   registra sem tocar nos dados (baseline).
2. **Módulos por fazenda e bloqueio:** uma tabela guarda os períodos de contrato de cada módulo
   por fazenda. Um guard global, acionado pelo decorator `@Modulo`, recusa com 403 "módulo não
   contratado" ou "só consulta". A situação de cada fazenda fica em cache por 60 s.
3. **Administrador:** tabela e login separados das fazendas, com token próprio (`aud: admin`).
   O painel lista fazendas, libera e desativa módulos, suspende e reativa fazendas, sem nenhum
   dado de rebanho.
4. **Frontend:** o grupo Módulos no menu mostra vitrine, só consulta ou ativo. Há um aviso de
   vencimento para o dono e as telas do painel em `/admin`.

Como ainda não existe módulo pago, cada um ganha uma rota de exemplo para provar o bloqueio.
Decisões em [research.md](./research.md).

## Technical Context

**Language/Version**: TypeScript (Node 24) no backend e no frontend

**Primary Dependencies**: NestJS 12, TypeORM 1.x (migrations e CLI), Passport JWT (segunda estratégia para o administrador), bcryptjs, class-validator; React 19 + Vite + React Router. Nenhuma dependência nova.

**Storage**: PostgreSQL 16. 4 tabelas novas (`modulos_fazenda`, `administradores`, `admin_tentativas_login`, `fazenda_suspensoes`) e 1 coluna (`fazendas.suspensa`), todas por migration.

**Testing**: Jest com repositórios simulados (guard, situação dos módulos, painel, login do administrador, suspensão); teste de marcação dos controllers de módulos; validação das migrations numa cópia do banco; quickstart no navegador.

**Target Platform**: navegador do celular e do computador; backend em Docker (uma instância)

**Project Type**: aplicação web (backend + frontend)

**Performance Goals**: a checagem de módulo não adiciona consulta ao banco nas rotas do pacote inicial; nas rotas de módulo, no máximo uma consulta por fazenda a cada 60 s (SC-005).

**Constraints**:
- liberar ou desativar vale em ≤ 1 minuto (FR-011);
- a suspensão vale na próxima requisição;
- zero perda de dados na troca para migrations (SC-001);
- o administrador nunca recebe dados de rebanho.

**Scale/Scope**:
- dezenas de fazendas clientes e 3 módulos;
- cerca de 12 rotas novas e 4 telas novas: login do administrador, lista de fazendas, detalhe da fazenda e vitrine/espera do módulo.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Princípio | Como o plano atende | Situação |
|---|---|---|
| I. Isolamento por fazenda | O guard de módulo usa a fazenda do token. O administrador fica fora das fazendas e não acessa dados de rebanho, porque o token tem `aud` próprio e as estratégias se recusam mutuamente (R6). A página pública da fazenda suspensa é reduzida (R9). | ✅ |
| II. Regras no backend | O bloqueio é feito no `ModuloGuard` global, não só na tela (R4). Período único, datas e suspensão são validados no service, em transação. O princípio II exige isso para módulos pagos. | ✅ |
| III. Histórico preservado | Períodos de módulo e suspensões nunca são apagados; desativar e reativar preenchem campos. Fica registrado quem liberou, desativou, suspendeu e reativou, e também as tentativas de login do administrador (FR-008, FR-023). | ✅ |
| IV. Feito para o curral | A vitrine e o "só consulta" são telas claras, nunca erro. Avisos usam `Aviso`; o menu continua com toque de 44 px; o celular é validado no quickstart. | ✅ |
| V. Verificação antes de entregar | Testes do guard, das regras de período e do login do administrador. As migrations são provadas numa cópia do banco, com diff vazio e mesma contagem. O quickstart roda no celular em fazendas de teste, e a fazenda real só é usada para conferir contagens. | ✅ |
| VI. Simplicidade e produto modular | Usa a pasta `modulos/` com módulos isolados, sem dependência nova. Cache em memória (sem Redis) e situação calculada por data (sem job) (R5, R3). | ✅ |
| Restrições técnicas | Atende a regra "migrations antes do primeiro módulo pago". O `synchronize` é desligado também em dev, o que é mais rígido que a constituição e evita divergência entre ambientes (R1). | ✅ |

**Re-check pós-design**: o modelo de dados e os contratos mantêm todos os itens acima, sem
violações; Complexity Tracking não se aplica. Há um ponto de atenção operacional. A primeira
subida com migrations roda contra o banco que tem a fazenda real, então o quickstart exige um
backup (`pg_dump`) e a validação numa cópia antes de aplicar no banco original.

## Project Structure

### Documentation (this feature)

```text
specs/002-infraestrutura-modulos/
├── plan.md              # Este arquivo
├── research.md          # Decisões R1–R13
├── data-model.md        # Tabelas novas e regras de situação
├── quickstart.md        # Roteiro de validação
├── contracts/
│   └── api.md           # Rotas da fazenda, dos módulos e do administrador
├── checklists/
│   └── requirements.md  # Checklist de qualidade da spec
└── tasks.md             # Gerado pelo /speckit-tasks
```

### Source Code (repository root)

```text
backend/
├── package.json                      # scripts migration:* e admin:criar (sobre dist/)
└── src/
    ├── app.module.ts                 # synchronize: false, migrationsRun, ModuloGuard global
    ├── database/
    │   ├── data-source.ts            # DataSource da CLI e do app
    │   ├── migrations/               # 1700…-Inicial.ts (baseline) e 1700…-Modulos.ts
    │   └── criar-admin.ts            # comando npm run admin:criar
    ├── auth/
    │   ├── strategies/jwt.strategy.ts  # recusa aud admin; checa fazenda suspensa
    │   ├── guards/jwt-auth.guard.ts    # entrega rotas @AreaAdmin ao guard do admin
    │   └── auth.service.ts             # login recusa fazenda suspensa
    ├── fazenda/
    │   ├── entities/fazenda.entity.ts  # + suspensa
    │   └── fazenda.controller.ts       # + GET /fazenda/modulos
    ├── consulta-publica/               # situação FAZENDA_SUSPENSA (R9)
    └── modulos/
        ├── acesso/                   # ModuloFazenda, enum, @Modulo, ModuloGuard,
        │                             # AcessoModulosService (situação + cache)
        ├── admin/                    # Administrador, TentativaLoginAdmin, SuspensaoFazenda,
        │                             # AdminAuthController/Service, estratégia jwt-admin,
        │                             # @AreaAdmin, AdminFazendasController/Service
        ├── leite/                    # leite.module.ts + exemplo.controller.ts
        ├── financeiro/               # idem
        └── nutricao/                 # idem

frontend/
└── src/
    ├── App.tsx                       # rotas /modulos/:modulo e /admin/*
    ├── api/client.ts                 # 403 ACESSO_SUSPENSO → login com aviso
    ├── api/modulos.ts                # GET /fazenda/modulos e rotas de exemplo
    ├── contexts/ModulosContext.tsx   # situação dos módulos para menu, rota e aviso
    ├── components/Layout.tsx         # grupo Módulos com selos
    ├── pages/Login.tsx               # mensagem de acesso suspenso
    ├── pages/Dashboard.tsx           # painel inicial: aviso de vencimento (dono)
    ├── pages/Configuracao.tsx        # módulos contratados
    ├── pages/ConsultaAnimal.tsx      # versão reduzida da fazenda suspensa
    └── modulos/
        ├── vitrine/                  # RotaDeModulo, Vitrine, TelaDeEspera (só consulta / ativo)
        └── admin/                    # adminClient, AdminLogin, AdminLayout,
                                      # AdminFazendas, AdminFazendaDetalhe
```

**Structure Decision**: aplicação web já existente (`backend/` + `frontend/`). O que é novo vai
para `modulos/` nos dois lados (seção 2.6 do planejamento, R13). Os ajustes de autenticação,
suspensão e página pública ficam nos arquivos atuais. 

## Ordem sugerida

1. **Migrations primeiro (US1):** backup, baseline e validação na cópia, antes de qualquer
   tabela nova. A segunda migration (`Modulos`) cria as tabelas desta fase.
2. **Acesso e guard (US3)** com as rotas de exemplo.
3. **Administrador (US2):** login, painel, liberar/desativar e suspensão.
4. **Frontend (US4):** menu, vitrine, aviso e telas do painel.
5. **Quickstart completo** no celular.

## Complexity Tracking

Nenhuma violação da constituição; seção não se aplica.
