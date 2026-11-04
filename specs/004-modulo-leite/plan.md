# Implementation Plan: Módulo Leite

**Branch**: `004-modulo-leite` | **Date**: 2026-11-04 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/004-modulo-leite/spec.md`

## Summary

Segundo módulo pago, sobre a infraestrutura da fase 0. O plano tem cinco partes:

1. **Lactação:** começa sozinha no parto da vaca de leite (raça leiteira ou marcada pelo dono),
   ou à mão, uma vaca por vez; termina na secagem, na saída do rebanho ou no novo parto.
2. **Ordenha rápida no curral:** uma vaca por vez, gravando a cada confirmação; ou só o tanque,
   com as vacas em carência anotadas uma a uma.
3. **Carência:** cadastro de produtos com a carência de leite. O tratamento do pacote inicial,
   com o Leite ativo, exige produto cadastrado, e o Leite guarda o prazo de descarte. O descarte
   de cada ordenha é calculado no servidor.
4. **Secagem e entregas:** secagem planejada pela previsão de parto da reprodução; entregas com
   preço só para o dono, análises do laticínio.
5. **Relatórios:** produção diária e mensal, curva e total de cada lactação, com os gráficos SVG
   que passam a ser compartilhados.

**Como o pacote inicial fala com o Leite sem importá-lo:** um registro de **ganchos do rebanho**
(parto registrado ou alterado, saída do rebanho, tratamento gravado). O pacote inicial emite
dentro da própria transação; o Leite registra os seus ao iniciar (research R1).

Decisões em [research.md](./research.md).

## Technical Context

**Language/Version**: TypeScript (Node 24) no backend e no frontend

**Primary Dependencies**: NestJS 12, TypeORM 1.x, class-validator; React 19 + Vite + React Router. Nenhuma dependência nova.

**Storage**:
- PostgreSQL 16, com 8 tabelas novas: `configuracoes_leite`, `lactacoes`, `ordenhas`,
  `produtos_leite`, `carencias_leite`, `secagens`, `entregas_leite` e `analises_leite`.
- Duas colunas no pacote base: `racas.leiteira` e `animais.vaca_de_leite`.
- Uma migration `Leite`, validada primeiro na cópia do banco.

**Testing**:
- Jest com repositórios simulados; funções puras sem banco (vaca de leite, DEL, secagem
  planejada, carência ativa, turno pela hora, agregações).
- Testes dos ganchos: o pacote inicial emite, e o Leite inicia ou encerra lactação e grava
  carência.
- Teste de papéis: preço e valor só para o dono. Testes de marcação e de fronteira da fase 0.
- Quickstart no navegador, numa fazenda de teste na cópia.

**Target Platform**: celular (curral) e computador; backend em Docker

**Project Type**: aplicação web (backend + frontend)

**Performance Goals**:
- ordenha de 30 vacas em menos de 5 min (SC-001);
- relatórios de um ano de 100 vacas em menos de 2 s (SC-006).

**Constraints**:
- leite em carência nunca conta para o tanque (SC-002);
- nenhum valor em reais chega ao funcionário;
- toque de 44 px, sem rolagem lateral, uma mão.

**Scale/Scope**:
- até cerca de 100 vacas e 3 ordenhas por dia, ou seja, até cerca de 110 mil ordenhas por ano por
  fazenda;
- cerca de 30 rotas e 10 telas: início, ordenha, vacas, vaca, produtos, a secar, entregas,
  análises, produção e configuração, mais ajustes em 6 telas do pacote inicial.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Princípio | Como o plano atende | Situação |
|---|---|---|
| I. Isolamento por fazenda | Toda tabela tem `fazendaId`. Vaca, produto, entrega e tratamento são validados na fazenda do token, e registro de outra fazenda dá 404. | ✅ |
| II. Regras no backend | Módulo bloqueado pelo `@Modulo` e preço por `@Roles(DONO)`, com as respostas filtradas para o funcionário. Descarte, DEL e secagem planejada são calculados no servidor. O produto sem cadastro é recusado no backend, dentro da transação do tratamento. | ✅ |
| III. Histórico preservado | Ordenha é corrigida, não excluída, e guarda quem alterou. Secagem, entrega e análise são canceladas com motivo. Lactações encerradas ficam no histórico. Produto é desativado, não apagado. | ✅ |
| IV. Feito para o curral | Ordenha de uma vaca por vez, com teclado numérico e foco automático, gravando a cada vaca (o sinal pode cair). Faixa de descarte antes do campo. Turno pela hora. | ✅ |
| V. Verificação antes de entregar | Testes de domínio, ganchos e papéis. Migration na cópia antes do dev. Quickstart no celular. | ✅ |
| VI. Simplicidade e produto modular | Pasta `modulos/leite`, sem dependência nova. O pacote inicial só emite ganchos e não importa o Leite. Os gráficos vão para `components/` em vez de um módulo importar outro. | ✅ |
| Restrições técnicas | Migration versionada, sem `synchronize`. | ✅ |

**Re-check pós-design**: o modelo e os contratos mantêm todos os itens. As mudanças no pacote
inicial ficam dentro das regras:

- **Ganchos:** um registro em `common/` e quatro pontos de emissão (parto, saída do rebanho,
  tratamento e tratamento em lote).
- **Colunas novas:** `racas.leiteira` e `animais.vaca_de_leite`, dados do rebanho que fazem
  sentido sem o módulo.
- **Raças leiteiras:** entram na lista de raças padrão.

Complexity Tracking não se aplica.

## Project Structure

### Documentation (this feature)

```text
specs/004-modulo-leite/
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
├── common/ganchos-rebanho.ts            # registro e emissão dos ganchos (R1) + spec
├── parto/parto.service.ts               # emite partoRegistrado / partoAlterado
├── animal/saida-do-rebanho.ts           # emite saidaDoRebanho
├── tratamento/tratamento.service.ts     # emite tratamentoGravado
├── manejo-lote/manejo-lote.service.ts   # emite tratamentoGravado por animal
├── raca/                                # leiteira + 4 raças leiteiras padrão
├── animal/entities/animal.entity.ts     # vacaDeLeite
├── database/migrations/…-Leite.ts
└── modulos/leite/
    ├── entities/                        # configuração, lactação, ordenha, produto, carência, secagem, entrega, análise
    ├── dominio/                         # vaca-de-leite, del, secagem-planejada, carencia, turno, producao (+ specs)
    ├── ganchos-leite.ts                 # registra os ganchos no onModuleInit (+ spec)
    ├── configuracao.*  vacas.*  lactacoes.*  ordenhas.*  produtos.*
    ├── secagens.*  entregas.*  analises.*  producao.*   # controller + service (+ spec)
    ├── papeis.spec.ts                   # preço/valor só para o dono
    └── leite.module.ts                  # (exemplo.controller.ts removido)

frontend/src/
├── components/graficos/                 # GraficoMensal, GraficoLinha (movidos do Financeiro, R11)
├── pages/AnimalDetalhe.tsx              # bloco do Leite: situação, DEL, vaca de leite, iniciar lactação
├── pages/NovoTratamento.tsx, ManejoLote.tsx   # produto do cadastro e cadastro rápido (422)
├── pages/Manejo.tsx                     # "Leite em descarte"
├── modulos/vitrine/RotaDeModulo.tsx     # Leite ativo/só consulta → telas do módulo
└── modulos/leite/
    ├── api.ts  LeiteRotas.tsx  LeiteInicio.tsx
    ├── Ordenha.tsx                      # uma vaca por vez (R12) e modo tanque
    ├── Vacas.tsx  VacaLeite.tsx  Produtos.tsx  CadastroRapidoProduto.tsx
    ├── ASecar.tsx  Entregas.tsx  Analises.tsx
    ├── Producao.tsx  ConfiguracaoLeite.tsx
    └── BlocoLeiteDoAnimal.tsx  AvisoDescarte.tsx
```

**Structure Decision**: aplicação web existente. O módulo fica isolado em `modulos/leite` nos
dois lados. O pacote inicial ganha só os ganchos, duas colunas, as raças leiteiras e ajustes de
tela.

## Ordem sugerida

1. **Base:** migration (na cópia primeiro), entidades, ganchos, funções de domínio, raças
   leiteiras e vaca de leite, e a remoção das rotas de exemplo.
2. **US1:** lactação e ordenha. **US2:** produtos, carência e descarte. Juntas, as duas formam o
   MVP.
3. **US3:** secagem. **US4:** entregas e análises, com os papéis.
4. **US5:** relatórios e curva, com os gráficos movidos para `components/`.
5. **Quickstart completo.**

## Complexity Tracking

Nenhuma violação; não se aplica.
