# Implementation Plan: Implantação assistida

**Branch**: `008-implantacao-assistida` | **Date**: 2026-11-06 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/008-implantacao-assistida/spec.md`

## Summary

Dar ao sistema o que a venda com implantação assistida precisa. Quatro partes:

1. **Acesso de suporte:** pelo painel, o administrador entra na fazenda do cliente através de um
   usuário "suporte" próprio daquela fazenda. Todas as telas funcionam como para o dono, e a autoria
   aparece como "Suporte · <nome>". Cada entrada fica registrada, a sessão expira em 8 horas, e Usuários
   e senhas ficam bloqueados (R1, R2).
2. **Etiquetas:** o servidor gera o PDF A4 com 24 etiquetas por folha (57 × 32 mm, QR de 28 mm,
   marcas de corte). O domínio vem de `URL_PUBLICA` e nunca é provisório (R6).
3. **Prazo de acesso:**
   - fazenda nova aguardando implantação;
   - teste de 30 dias com os módulos escolhidos;
   - renovação por Pix confirmada no painel;
   - 2 dias de carência;
   - depois disso, só consulta (pacote inicial e módulos do plano);
   - preços no painel e lista "Próximos a vencer" (R3–R5, R9).

   As fazendas que já existem ficam sem prazo (R7).
4. **Ajuda:** botão do WhatsApp do suporte (R8).

Decisões em [research.md](./research.md).

## Technical Context

**Language/Version**: TypeScript (Node 24) no backend e no frontend.

**Primary Dependencies**:
- NestJS 12, TypeORM 1.x e React 19, como já existem.
- Duas novas no backend, para as etiquetas: `pdfkit` (PDF) e `qrcode` (QR em vetor).

**Storage**: PostgreSQL 16. A migration `ImplantacaoAssistida` faz três mudanças:
- cria em `fazendas` os campos `sem_prazo`, `acesso_ate`, `modulos_plano` e `telefone_contato`, e marca
  as fazendas existentes como sem prazo;
- cria em `usuarios` o campo `suporte`;
- cria as tabelas `sessoes_suporte`, `registros_acesso` e `precos_plano`.

**Testing**:
- Jest:
  - situação do prazo (datas e carência);
  - guards de prazo e de suporte;
  - sessão de suporte (abrir, expirar, sair);
  - usuário suporte fora das listas e sem login por senha;
  - teste, pagamento e extensão;
  - preços e valor do plano;
  - vencimentos;
  - PDF (número de folhas, recusa sem domínio);
  - papéis.
- Quickstart na cópia; conferência de uma etiqueta impressa em tamanho real.

**Target Platform**: servidor Linux com Docker (Oracle Cloud); celular e computador.

**Project Type**: aplicação web.

**Performance Goals**: PDF de 90 etiquetas em menos de 5 s; o guard de prazo não adiciona consulta ao
banco por requisição (usa o mesmo cache curto dos módulos).

**Constraints**:
- o suporte nunca usa a senha do cliente;
- nada de endereço provisório gravado no QR;
- nenhum dado é apagado no vencimento;
- só o dono vê valores.

**Scale/Scope**:
- 13 rotas novas ou alteradas;
- 3 telas novas (Ajuda, Próximos a vencer, Preços) e 4 alteradas (QR codes, Layout, Login e o detalhe
  da fazenda no painel).

## Constitution Check

| Princípio | Como o plano atende | Situação |
|---|---|---|
| I. Isolamento por fazenda | O usuário suporte pertence a uma fazenda e o token dele só abre aquela fazenda. Só o painel, que já é do administrador, cria a sessão. Usuários das fazendas continuam sem caminho para outras. | ✅ |
| II. Regras no backend | Prazo, carência, só consulta, bloqueios do suporte e recusa do PDF sem domínio ficam todos no servidor. | ✅ |
| III. Histórico preservado | Sessões de suporte e registros de acesso só recebem inserções; vencer não apaga nada; a autoria do suporte fica nos registros. | ✅ |
| IV. Feito para o curral | A implantação usa as telas que o cliente já usa; o PDF segue a etiqueta definida para o brete; o aviso do Pix é um toque no WhatsApp. | ✅ |
| V. Verificação | Testes, migration na cópia, quickstart e etiqueta impressa medida. | ✅ |
| VI. Simplicidade | Situações calculadas (sem tarefas agendadas), reaproveita os períodos de módulo; duas bibliotecas pequenas só para o PDF. | ✅ (dependências justificadas em R6) |

## Project Structure

### Documentation (this feature)

```text
specs/008-implantacao-assistida/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/api.md
└── tasks.md            # /speckit-tasks
```

### Source Code

```text
backend/src/
├── database/migrations/…-ImplantacaoAssistida.ts
├── fazenda/
│   ├── entities/fazenda.entity.ts           # semPrazo, acessoAte, modulosPlano, telefoneContato
│   ├── acesso-fazenda.ts                    # situação do prazo na data (+ spec)
│   ├── acesso-fazenda.service.ts            # cache, GET /fazenda/acesso, valor do plano (+ spec)
│   └── fazenda.controller.ts                # GET /fazenda/acesso
├── auth/
│   ├── guards/acesso-fazenda.guard.ts       # 403 FAZENDA_SO_CONSULTA (+ spec)
│   ├── guards/suporte.guard.ts              # 403 ACAO_SO_DO_DONO (+ spec)
│   ├── strategies/jwt.strategy.ts           # confere a sessão de suporte
│   └── auth.service.ts / .controller.ts     # login recusa suporte; encerrar-suporte
├── usuario/                                  # suporte fora das listas e da regra do dono
├── codigo-identificacao/etiquetas.service.ts # PDF (+ spec)
└── modulos/admin/
    ├── entities/sessao-suporte.entity.ts, registro-acesso.entity.ts, preco-plano.entity.ts
    ├── suporte.service.ts                   # abrir sessão, usuário suporte (+ spec)
    ├── prazo-fazendas.service.ts            # teste, pagamento, extensão, sem prazo, vencimentos (+ spec)
    └── admin.controller.ts                  # rotas novas

frontend/src/
├── components/Layout.tsx, FaixaSuporte.tsx, AvisoPrazo.tsx
├── pages/Ajuda.tsx, QrCodes.tsx
└── modulos/admin/AdminFazendaDetalhe.tsx, AdminVencimentos.tsx, AdminPrecos.tsx, AdminLayout.tsx, api.ts

.env.producao.example, docker-compose.prod.yml   # URL_PUBLICA, PIX_CHAVE, SUPORTE_WHATSAPP
docs/publicacao/Roteiro-de-publicacao.md          # as três variáveis novas
```

**Structure Decision**: aplicação web existente. O prazo é do pacote inicial (em `fazenda/`); o painel
concentra sessões, prazos e preços (em `modulos/admin/`).
