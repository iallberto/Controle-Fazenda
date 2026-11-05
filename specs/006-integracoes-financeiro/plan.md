# Implementation Plan: Integrações dos módulos com o Financeiro

**Branch**: `006-integracoes-financeiro` | **Date**: 2026-11-04 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/006-integracoes-financeiro/spec.md`

## Summary

Fase 3 do planejamento: o dinheiro lançado no Leite e na Nutrição passa a cair no Financeiro sem
ser lançado de novo. O plano tem quatro partes:

1. **Ganchos entre módulos:** um registro novo em `common/`, igual ao dos ganchos do rebanho. O
   Leite e a Nutrição emitem o evento dentro da própria transação; o Financeiro ouve e só age com
   os dois módulos ativos. Nenhum módulo pago importa outro (R1).
2. **Recebimento mensal do leite:** confirmado pelo dono, com o preço obrigatório em todas as
   entregas do mês. Vira receita em "Venda de leite", e as entregas daquele mês ficam travadas até
   o recebimento ser desfeito (R3).
3. **Compras da Nutrição com valor:** viram despesa na categoria escolhida para o insumo (por
   padrão, pelo tipo). Cancelar a entrada cancela a despesa (R4).
4. **Origem no Financeiro:** cada lançamento gerado mostra de onde veio, com link para a tela de
   origem e filtro por origem. Lançamentos gerados não são editados no Financeiro (R2).

Decisões em [research.md](./research.md).

## Technical Context

**Language/Version**: TypeScript (Node 24) no backend e no frontend

**Primary Dependencies**: NestJS 12, TypeORM 1.x, React 19. Nenhuma dependência nova.

**Storage**: PostgreSQL 16. A migration `Integracoes` faz quatro mudanças:
- adiciona LEITE e NUTRICAO às origens possíveis de um lançamento;
- cria em `lancamentos` as colunas `origem_id` e `origem_caminho`, com índice;
- cria a tabela `recebimentos_leite`;
- cria em `insumos` a coluna `categoria_despesa_id`.

**Testing**:
- Jest: ganchos entre módulos, recebimento (valida, calcula, trava as entregas), os ganchos do
  Financeiro (situação dos módulos, categoria, cancelar), emissão na Nutrição e papéis.
- Quickstart na cópia.

**Target Platform**: celular e computador; backend em Docker

**Project Type**: aplicação web

**Performance Goals**: o recebimento e a compra continuam respondendo na hora (menos de 1 s).

**Constraints**:
- atomicidade entre a origem e o Financeiro (FR-004);
- fronteira entre módulos (FR-002);
- nenhum valor em reais para o funcionário.

**Scale/Scope**:
- 5 rotas novas ou alteradas;
- 3 telas alteradas: entregas do Leite, insumo da Nutrição e lançamentos do Financeiro.

## Constitution Check

| Princípio | Como o plano atende | Situação |
|---|---|---|
| I. Isolamento por fazenda | Os eventos levam a `fazendaId` do token, e o Financeiro lança e cancela só lançamentos da mesma fazenda. A categoria do insumo é validada na fazenda. | ✅ |
| II. Regras no backend | A integração acontece no servidor, dentro da transação. A trava das entregas e o preço obrigatório também são verificados no servidor. O recebimento é só do dono. | ✅ |
| III. Histórico preservado | Desfazer o recebimento e cancelar a entrada cancelam o lançamento, sem apagar nada. | ✅ |
| IV. Feito para o curral | O recebimento fica numa caixa na tela de entregas, com o valor já calculado. | ✅ |
| V. Verificação | Testes de ganchos, recebimento e papéis. Migration na cópia. Quickstart. | ✅ |
| VI. Simplicidade e produto modular | Um registro de ganchos em `common/`, sem importação entre módulos pagos (teste de fronteira). Nenhuma dependência nova. | ✅ |

Complexity Tracking não se aplica.

## Project Structure

```text
backend/src/
├── common/ganchos-modulos.ts                    # eventos entre módulos (+ spec)
├── database/migrations/…-Integracoes.ts
├── modulos/financeiro/
│   ├── ganchos-financeiro.ts                    # ouve Leite e Nutrição (+ spec)
│   ├── entities/lancamento.entity.ts            # LEITE, NUTRICAO, origemId, origemCaminho
│   └── lancamentos.service.ts                   # filtro por origem; trava LEITE/NUTRICAO
├── modulos/leite/
│   ├── entities/recebimento-leite.entity.ts
│   ├── recebimentos.service.ts / .controller.ts # (+ spec)
│   └── entregas.service.ts                      # trava MES_RECEBIDO
└── modulos/nutricao/
    ├── entities/insumo.entity.ts                # categoriaDespesaId
    ├── movimentos.service.ts, custo.service.ts  # transação + emissão
    └── insumos.service.ts                       # categoria no PATCH e na lista do dono

frontend/src/modulos/
├── leite/Entregas.tsx, RecebimentoDoMes.tsx     # confirmar e desfazer o recebimento
├── nutricao/InsumoDetalhe.tsx                   # categoria no Financeiro (dono)
└── financeiro/Lancamentos.tsx                   # origem, link e filtro; aviso de duplicidade
```

## Ordem sugerida

1. **Base:** migration (na cópia primeiro), ganchos entre módulos, origem no lançamento e o
   ouvinte do Financeiro.
2. **US1:** recebimento do leite e trava das entregas. **US2:** compras da Nutrição. Juntas, as
   duas formam o MVP.
3. **US3:** origem, link e filtro no Financeiro, e o aviso de duplicidade.
4. **Quickstart completo.**
