# Implementation Plan: Módulo Nutrição

**Branch**: `005-modulo-nutricao` | **Date**: 2026-11-04 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/005-modulo-nutricao/spec.md`

## Summary

Terceiro módulo pago, sobre a infraestrutura da fase 0 e os ganchos do rebanho da spec 004:

1. **Insumos com unidades:** cada insumo tem uma unidade base e uma tabela de conversão. Todo
   lançamento guarda a quantidade lançada e a convertida.
2. **Estoque como livro de movimentos:** entradas e baixas numa tabela só. O estoque é uma soma,
   e cancelar é só marcar o movimento.
3. **Lotes de alimentação com nome:** o animal fica num lote por vez e sai sozinho quando deixa
   o rebanho, pelo gancho. Para incluir animais, a tela usa o filtro do Manejo em lote.
4. **Fornecimento numa transação:** o servidor sugere as quantidades (dieta × animais no lote na
   data), e cada item gera a baixa no estoque. Estoque que ficaria negativo exige confirmação.
5. **Silo:** fica como reserva até ser aberto. A abertura lança a entrada de produção própria, e o
   sistema mostra saldo, média e previsão de duração.
6. **Custo médio:** vem das entradas com preço, que só o dono informa. O custo por lote e por
   animal-dia é calculado na leitura.

Decisões em [research.md](./research.md).

## Technical Context

**Language/Version**: TypeScript (Node 24) no backend e no frontend

**Primary Dependencies**: NestJS 12, TypeORM 1.x, class-validator; React 19 + Vite + React Router. Nenhuma dependência nova.

**Storage**:
- PostgreSQL 16, com 10 tabelas novas: `insumos`, `unidades_insumo`, `movimentos_insumo`,
  `dietas`, `itens_dieta`, `lotes_alimentacao`, `lote_animais`, `fornecimentos`,
  `itens_fornecimento` e `silos`.
- Migration `Nutricao`, validada primeiro na cópia.

**Testing**:
- Jest com repositórios simulados.
- Funções puras: conversão, estoque, custo médio, sugestão, previsão do silo e custo por
  animal-dia.
- Teste de papéis e o gancho de saída do rebanho.
- Quickstart no navegador, numa fazenda de teste.

**Target Platform**: celular (curral, depósito) e computador; backend em Docker

**Project Type**: aplicação web (backend + frontend)

**Performance Goals**:
- fornecimento lançado em menos de 30 s (SC-001);
- estoque e custo do mês em menos de 2 s, com 30 insumos e um ano de tratos (SC-006).

**Constraints**:
- estoque exato (SC-002);
- conta do custo e do silo exata (SC-003);
- nenhum valor em reais para o funcionário (SC-004);
- toque de 44 px, sem rolagem lateral.

**Scale/Scope**:
- até cerca de 30 insumos, 10 lotes e 5 tratos por dia, ou seja, cerca de 2 mil fornecimentos e
  10 mil movimentos por ano;
- cerca de 35 rotas e 9 telas: início, estoque, insumo, entradas e baixas, dietas, lotes,
  fornecimento, silos e custo.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Princípio | Como o plano atende | Situação |
|---|---|---|
| I. Isolamento por fazenda | Toda tabela tem `fazendaId` ou passa por uma que tem. Insumo, unidade, lote, animal, silo e dieta são validados na fazenda do token, e registro de outra fazenda dá 404. | ✅ |
| II. Regras no backend | Módulo bloqueado pelo `@Modulo` e dinheiro por `@Roles(DONO)`, com as respostas filtradas para o funcionário. Conversão, sugestão, estoque, custo médio e previsão são calculados no servidor. Fornecimento e abertura do silo são transações. | ✅ |
| III. Histórico preservado | Movimentos, fornecimentos e aberturas são cancelados com motivo. Insumos, unidades, dietas e lotes são desativados, não apagados. O lote guarda as entradas e saídas dos animais. Auditoria em tudo. | ✅ |
| IV. Feito para o curral | Fornecimento numa tela, com o lote lembrado e as quantidades já sugeridas, teclado numérico e confirmação só quando o estoque ficaria negativo. | ✅ |
| V. Verificação antes de entregar | Testes de domínio, papéis e gancho. Migration na cópia. Quickstart no celular. | ✅ |
| VI. Simplicidade e produto modular | Pasta `modulos/nutricao`, sem dependência nova. O pacote inicial não muda: só ganha mais um ouvinte do gancho que já existe. A Nutrição não importa outro módulo pago. | ✅ |
| Restrições técnicas | Migration versionada, sem `synchronize`. | ✅ |

**Re-check pós-design**: sem violações. O pacote inicial continua sem mudança de código; a única
ligação é o registro do gancho `saidaDoRebanho` pela Nutrição.

Complexity Tracking não se aplica.

## Project Structure

### Documentation (this feature)

```text
specs/005-modulo-nutricao/
├── plan.md
├── research.md          # R1–R10
├── data-model.md
├── quickstart.md
├── contracts/api.md
├── checklists/requirements.md
└── tasks.md             # /speckit-tasks
```

### Source Code (repository root)

```text
backend/src/
├── database/migrations/…-Nutricao.ts
└── modulos/nutricao/
    ├── entities/                 # insumo, unidade, movimento, dieta, lote, fornecimento, silo
    ├── dominio/                  # unidades, estoque, custo-medio, sugestao, silo, custo (+ specs)
    ├── dto/nutricao.dto.ts
    ├── ganchos-nutricao.ts       # saidaDoRebanho → sai do lote (+ spec)
    ├── insumos.*  movimentos.*  dietas.*  lotes.*
    ├── fornecimentos.*  silos.*  custo.*  pendencias.controller.ts
    ├── papeis.spec.ts
    └── nutricao.module.ts        # (exemplo.controller.ts removido)

frontend/src/
├── modulos/vitrine/RotaDeModulo.tsx   # Nutrição ativa/só consulta → telas do módulo
├── pages/Dashboard.tsx                # aviso de entradas aguardando preço
└── modulos/nutricao/
    ├── api.ts  NutricaoRotas.tsx  NutricaoContext.tsx  NutricaoInicio.tsx
    ├── Estoque.tsx  InsumoDetalhe.tsx  NovoInsumo.tsx  Movimento.tsx
    ├── Dietas.tsx  Lotes.tsx  LoteDetalhe.tsx
    ├── Fornecimento.tsx  Silos.tsx  Custo.tsx
    └── AvisoPrecoPendente.tsx
```

**Structure Decision**: aplicação web existente. O módulo fica isolado nos dois lados, e o
pacote inicial não muda.

## Ordem sugerida

1. **Base:** migration (na cópia primeiro), entidades, funções de domínio, gancho e remoção do
   exemplo.
2. **US1:** insumos, unidades, entradas, baixas e estoque. **US2:** dietas, lotes e
   fornecimento. Juntas, as duas formam o MVP.
3. **US3:** silos. **US4:** preço, custo e pendências.
4. **Acabamento e quickstart completo.**

## Complexity Tracking

Nenhuma violação; não se aplica.
