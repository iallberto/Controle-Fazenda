# Implementation Plan: Módulo Financeiro

**Branch**: `003-modulo-financeiro` | **Date**: 2026-11-04 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/003-modulo-financeiro/spec.md`

## Summary

Primeiro módulo pago, em cima da infraestrutura da fase 0. O plano tem cinco partes:

1. **Lançamentos de receitas e despesas:** categorias padrão e da fazenda, valores em centavos
   inteiros.
2. **Venda de animais numa transação só:** o sistema calcula arrobas e valor, grava a pesagem,
   faz a saída do rebanho pelas mesmas regras da mudança de status e lança a receita. Cancelar
   a venda devolve os animais.
3. **Compra de animais:** com valor (0,00 para não lançar), e uma lista de compras cadastradas
   pelo funcionário ainda sem valor.
4. **Registro de uso pelo funcionário:** sem valores; o dono informa o valor depois, e o
   registro vira despesa.
5. **Resultado:** gráficos em SVG próprio.

**Quem vê o quê:**
- Só o dono vê valores. Isso é garantido no backend com `@Roles(DONO)` em tudo, menos nas rotas
  de uso.
- O pacote inicial não importa o Financeiro. A saída e a volta ao rebanho viram funções
  reutilizáveis, e o "Vendido" do pacote inicial consulta só a situação do módulo.

Decisões em [research.md](./research.md).

## Technical Context

**Language/Version**: TypeScript (Node 24) no backend e no frontend

**Primary Dependencies**: NestJS 12, TypeORM 1.x, class-validator; React 19 + Vite + React Router. Nenhuma dependência nova (gráficos em SVG, R11).

**Storage**:
- PostgreSQL 16, com 7 tabelas novas: `categorias_financeiras`, `lancamentos`, `vendas_animais`,
  `itens_venda`, `compras_animais` e `registros_uso`, mais o índice de unicidade de venda por
  animal.
- Uma migration `Financeiro`, que inclui as categorias padrão. Ela é validada primeiro na cópia
  do banco.

**Testing**:
- Jest com repositórios simulados para os serviços, e funções puras sem banco (`calcularVenda`,
  agregação do resultado).
- Teste de papéis: toda rota com valores exige DONO.
- Testes das funções de saída e volta ao rebanho.
- Quickstart no navegador, numa fazenda de teste na cópia.

**Target Platform**: celular (curral e escritório) e computador; backend em Docker

**Project Type**: aplicação web (backend + frontend)

**Performance Goals**:
- lançar uma despesa em menos de 30 s (SC-001);
- vender 10 animais em menos de 3 min (SC-002);
- resultado de 12 meses em menos de 1 s.

**Constraints**:
- conta exata em centavos (SC-004);
- tudo ou nada na venda (SC-003);
- nenhum valor em reais chega ao funcionário (SC-006);
- toque de 44 px e sem rolagem lateral.

**Scale/Scope**:
- centenas de lançamentos e dezenas de vendas por fazenda e por ano;
- cerca de 25 rotas e 9 telas: lançamentos, novo lançamento, categorias, nova venda, vendas,
  resultado, registrar uso, pendências e compras sem valor.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Princípio | Como o plano atende | Situação |
|---|---|---|
| I. Isolamento por fazenda | Toda tabela tem `fazendaId` ou passa pela venda. Animal, pasto, categoria e registro são validados na fazenda do token, e registro de outra fazenda dá 404. Categorias padrão (`fazendaId` nulo) são só leitura. | ✅ |
| II. Regras no backend | Módulo bloqueado pelo `@Modulo` e valores por `@Roles(DONO)`. A venda e a compra são transações únicas, com lock do animal. O "Vendido" do pacote inicial é recusado com o módulo ativo (R3). Os cálculos ficam no backend (`calcularVenda`). | ✅ |
| III. Histórico preservado | Nada é excluído: lançamentos, vendas e registros são cancelados ou descartados com motivo. A venda cancelada fica no histórico, e a pesagem de venda também fica. Auditoria em todas as tabelas. | ✅ |
| IV. Feito para o curral | Despesa numa tela, com teclado numérico e data de hoje. A venda em lote reaproveita o filtro por pasto e categoria do Manejo em lote. Prévia antes de confirmar e lembrete do brinco. `Aviso` e formatadores (`formatarReais`). | ✅ |
| V. Verificação antes de entregar | Testes de cálculo, venda, cancelamento, papéis e compras. Migration na cópia antes do dev. Quickstart no celular em fazenda de teste. | ✅ |
| VI. Simplicidade e produto modular | Pasta `modulos/financeiro`, sem dependência nova e sem importação pelo pacote inicial (teste de fronteira). Lucro calculado na leitura, sem tabelas de saldo. | ✅ |
| Restrições técnicas | Migration versionada, sem `synchronize`. | ✅ |

**Re-check pós-design**: o modelo de dados e os contratos mantêm todos os itens acima. Duas
mudanças no pacote inicial ficam dentro das regras:

- **Funções de saída e volta ao rebanho, e criação de animal:** saem de dentro do `AnimalService`
  para funções reutilizáveis, como já foi feito com `reproducao/saida.ts`.
- **Consulta da situação do módulo em `alterarStatus`:** usa a infraestrutura de acesso, que o
  teste de fronteira permite.

Complexity Tracking não se aplica.

## Project Structure

### Documentation (this feature)

```text
specs/003-modulo-financeiro/
├── plan.md
├── research.md          # R1–R13
├── data-model.md
├── quickstart.md
├── contracts/api.md
├── checklists/requirements.md
└── tasks.md             # /speckit-tasks
```

### Source Code (repository root)

```text
backend/src/
├── animal/
│   ├── saida-do-rebanho.ts       # registrarSaidaDoRebanho / voltarAoRebanho (R2)
│   ├── criar-animal.ts           # criarAnimal(manager, ...) usado pelo service e pela compra
│   └── animal.service.ts         # usa as funções; VENDIDO recusado com Financeiro ativo (R3)
├── database/migrations/…-Financeiro.ts   # tabelas + categorias padrão
└── modulos/financeiro/
    ├── entities/                 # categoria, lançamento, venda, item, compra, registro de uso
    ├── dominio/
    │   ├── calculo-venda.ts      # calcularVenda (R5) + spec
    │   └── resultado.ts          # agregações puras (preço médio, percentuais) + spec
    ├── categorias.*              # controller + service + spec
    ├── lancamentos.*
    ├── vendas.*
    ├── compras.*
    ├── usos.*
    ├── resultado.*
    ├── papeis.spec.ts            # toda rota com valores exige DONO (R7)
    └── financeiro.module.ts      # (exemplo.controller.ts removido)

frontend/src/
├── utils/formatadores.ts         # formatarReais, centavos ↔ texto
├── pages/NovoAnimal.tsx          # compra com valor para o dono (Financeiro ativo)
├── pages/AnimalDetalhe.tsx       # venda do animal; "Vendido" leva à venda
├── pages/Dashboard.tsx           # aviso de compras sem valor
├── modulos/vitrine/RotaDeModulo.tsx  # Financeiro ativo/só consulta → telas do módulo
└── modulos/financeiro/
    ├── api.ts
    ├── FinanceiroInicio.tsx      # dono: atalhos e saldo do mês; funcionário: registrar uso
    ├── Lancamentos.tsx  NovoLancamento.tsx  Categorias.tsx
    ├── NovaVenda.tsx  Vendas.tsx  VendaDetalhe.tsx
    ├── Resultado.tsx  graficos/   # barras e linha em SVG (R11)
    ├── RegistrarUso.tsx  Usos.tsx
    └── Pendencias.tsx            # usos aguardando valor + compras sem valor
```

**Structure Decision**: aplicação web existente. O módulo fica isolado em `modulos/financeiro`
nos dois lados, e os ajustes no pacote inicial se limitam ao animal (funções de saída e
cadastro), ao cadastro, à página do animal e ao painel inicial.

## Ordem sugerida

1. **Base:** migration (na cópia primeiro), entidades, `calcularVenda`, as funções do pacote
   inicial e a remoção das rotas de exemplo.
2. **US1:** lançamentos e categorias. **US2:** vendas e cancelamento, com o "Vendido" do pacote
   inicial. Juntas, as duas formam o MVP.
3. **US4 e compras:** registro de uso, pendências e avisos.
4. **US3:** resultado e gráficos.
5. **Quickstart completo.**

## Complexity Tracking

Nenhuma violação; não se aplica.
