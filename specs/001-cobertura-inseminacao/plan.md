# Implementation Plan: Cobertura e Inseminação no Pacote Inicial

**Branch**: `001-cobertura-inseminacao` | **Date**: 2026-11-03 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-cobertura-inseminacao/spec.md`

## Summary

Completar o pacote inicial com o ciclo reprodutivo: estações de monta natural (um touro por
estação, fêmeas do pasto marcadas com exceções), inseminação IA/IATF opcional com estoque de
sêmen, diagnóstico de gestação individual e em lote, previsão de parto calculada na leitura,
parto ligado à cobertura com pai preenchido automaticamente, e relatórios de vacas a parir,
vacas vazias e indicadores. Tecnicamente é um novo módulo Nest `reproducao` com cinco tabelas
de eventos, ganchos nas transações existentes de movimentação, status e parto, e telas no
padrão do Manejo em lote. Decisões em [research.md](./research.md).

## Technical Context

**Language/Version**: TypeScript (Node 24) no backend e no frontend

**Primary Dependencies**: NestJS 12, TypeORM, class-validator; React 19 + Vite + React Router

**Storage**: PostgreSQL 16 (tabelas novas via `synchronize` em desenvolvimento; migrations na fase 0, R13)

**Testing**: Jest com repositórios simulados (padrão dos `*.service.spec.ts`); verificação no navegador em fazenda de teste isolada

**Target Platform**: navegador do celular (uso no curral) e do computador; backend em Docker

**Project Type**: aplicação web (backend + frontend)

**Performance Goals**: telas de lote com 50 fêmeas respondendo em menos de 1 s; relatórios do rebanho inteiro em menos de 2 s

**Constraints**: alvos de toque ≥ 44 px; sem rolagem lateral no celular; fuso local nas datas; nenhum dado entre fazendas

**Scale/Scope**: algumas centenas de animais por fazenda; 5 entidades novas, ~25 rotas, ~6 telas novas e 3 relatórios

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Princípio | Como o plano atende | Situação |
|---|---|---|
| I. Isolamento por fazenda | Toda tabela nova tem fazenda (direta ou pela entidade pai); touro, fêmea, pasto, sêmen, aplicador e raça validados na fazenda do token; 404 para outra fazenda ([contracts](./contracts/api.md)) | ✅ |
| II. Regras no backend | Aptidão, touro único em estação aberta, baixa atômica de dose, perda só de prenhe, novilha → matriz: tudo no service; operações compostas em transação; ganchos de saída dentro das transações existentes (R7, R8) | ✅ |
| III. Histórico preservado | Nada é excluído (exceto sêmen nunca usado, cadastro e não evento); cancelamento com motivo; auditoria em todas as tabelas; histórico do animal com todos os eventos (R9) | ✅ |
| IV. Feito para o curral | Lote com lista marcada e exceções; botões Prenhe/Vazia de 44 px; idade gestacional em meses e dias; bloco no Manejo; `Aviso` com o que foi gravado; formatadores (R10, R14) | ✅ |
| V. Verificação antes de entregar | Testes unitários para cada regra e recusa; tsc e lint; quickstart no navegador em fazenda de teste ([quickstart.md](./quickstart.md)) | ✅ |
| VI. Simplicidade e produto modular | Um módulo Nest no pacote inicial, sem dependência nova; o Leite poderá depender dele depois (R1) | ✅ |
| Restrições técnicas | Tabelas por `synchronize` só em dev; migration inicial na fase 0, antes do primeiro módulo pago (R13) | ✅ |

**Re-check pós-design**: o modelo de dados e os contratos mantêm todos os itens acima. Nenhuma
violação; a seção Complexity Tracking não se aplica.

## Project Structure

### Documentation (this feature)

```text
specs/001-cobertura-inseminacao/
├── plan.md              # Este arquivo
├── research.md          # Decisões técnicas (Phase 0)
├── data-model.md        # Entidades e transições (Phase 1)
├── quickstart.md        # Roteiro de validação (Phase 1)
├── contracts/
│   └── api.md           # Rotas, permissões e erros (Phase 1)
├── checklists/
│   └── requirements.md  # Qualidade da spec
└── tasks.md             # Phase 2 (/speckit-tasks)
```

### Source Code (repository root)

```text
backend/src/
├── reproducao/                       # NOVO módulo (pacote inicial)
│   ├── entities/                     # estacao-monta, exposicao-monta, excecao-estacao,
│   │                                 # semen, inseminacao, diagnostico-gestacao, parto-candidato-pai
│   ├── dto/
│   ├── dominio/                      # funções puras: aptidão, previsão de parto,
│   │                                 # candidatos a pai, taxa de prenhez (testáveis sem banco)
│   ├── estacao.service.ts            # estações e exposições
│   ├── inseminacao.service.ts        # sêmen e inseminações
│   ├── diagnostico.service.ts        # diagnósticos, perdas, recálculo de status
│   ├── situacao.service.ts           # situação, histórico, encerrarExposicoesPorSaida
│   ├── reproducao.controller.ts
│   └── reproducao.module.ts
├── parto/                            # ALTERADO: novilha → matriz, status, candidatos a pai
├── animal/                           # ALTERADO: paiSemenId; alterarStatus chama o gancho de saída
├── movimentacao-pasto/               # ALTERADO: mover chama o gancho de saída
├── manejo-lote/                      # ALTERADO: pasto em lote chama o gancho de saída
└── relatorio/                        # ALTERADO: vacas a parir, vazias, indicadores

frontend/src/
├── api/reproducao.ts                 # NOVO
├── pages/reproducao/                 # NOVO: Estacoes, NovaEstacao, EstacaoDetalhe,
│                                     # DiagnosticoLote, Inseminacao, Semens
├── pages/relatorios/                 # NOVO: VacasAParir, VacasVazias, IndicadoresReprodutivos
├── pages/Manejo.tsx                  # ALTERADO: bloco Reprodução + diagnóstico rápido
├── pages/AnimalDetalhe.tsx           # ALTERADO: linha do tempo reprodutiva, pai/candidatos
├── components/Layout.tsx             # ALTERADO: grupo "Reprodução" no menu
└── utils/formatadores.ts             # ALTERADO: idade gestacional, status/situação, base da previsão
```

**Structure Decision**: aplicação web existente (backend + frontend). A reprodução vira um módulo
Nest próprio com as regras de cálculo em funções puras (`dominio/`), para serem testadas sem
banco; os módulos existentes só ganham chamadas ao gancho de saída e os ajustes do parto.

## Complexity Tracking

Não se aplica: nenhuma violação da constituição.
