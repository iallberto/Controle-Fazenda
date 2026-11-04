# Quickstart: validar o Módulo Leite

Rotas em [contracts/api.md](./contracts/api.md); tabelas e regras em
[data-model.md](./data-model.md) e [research.md](./research.md).

## Pré-requisitos

- Docker no ar. **Migration nova primeiro na cópia** (`controle_fazenda_copia`, backup em
  `pg_dump`), contagens conferidas, `migration:generate` sem mudanças; só depois no dev.
- Backend: `npm test`, `npx tsc --noEmit`, `npm run lint`; frontend: `tsc -b`, `eslint src`.
- Fazenda de teste isolada com dono e funcionário: 4 fêmeas Holandesas, 1 Nelore, 1 mestiça sem
  raça leiteira; o Leite liberado pelo painel do administrador. Nunca a fazenda real.

## Cenários (celular, 375 px)

### 1. Lactação (US1)

1. Registrar parto de uma Holandesa. **Esperado**: em lactação, DEL 0. Parto da Nelore: nada.
2. Dono marca a mestiça "vaca de leite: sim" (pariu há 40 dias). **Esperado**: oferta de iniciar
   a lactação na data do parto; aceita → DEL 40.
3. Iniciar à mão uma Holandesa sem parto, com início há 100 dias. **Esperado**: DEL 100.
   Funcionário tenta mudar "vaca de leite". **Esperado**: 403.

### 2. Ordenha (US1)

1. Turno 1 de hoje: lançar as 3 vacas em sequência ("Gravar e próxima"). **Esperado**: total do
   dia por vaca e da fazenda. Lançar a mesma vaca de novo: substitui.
2. 95 litros. **Esperado**: pede confirmação. Data de amanhã: recusada.
3. Mudar para modo TANQUE e lançar 120 litros no turno 2. **Esperado**: total do dia somado.

### 3. Carência (US2)

1. Tratamento "Antibiótico X" numa vaca em lactação, sem produto cadastrado. **Esperado**: pede o
   cadastro; cadastra com 4 dias; tratamento gravado; "Leite descarte até" hoje + 4.
2. Ordenha: a vaca aparece com a faixa de descarte; os litros dela vão para "descartado".
3. Modo TANQUE: a vaca em carência aparece primeiro e é lançada sozinha; o tanque fica sem ela.
4. Corrigir o tratamento para 2 dias atrás. **Esperado**: prazo e descarte recalculados.
5. Manejo: lista "Leite em descarte". Manejo em lote com produto sem cadastro: recusado, nada gravado.
6. Com o Leite não contratado, o tratamento continua com produto livre.

### 4. Secagem (US3)

1. Vaca em lactação com prenhez confirmada e parto previsto em 70 dias. **Esperado**: secagem
   planejada em 10 dias e na lista "a secar" (janela 15).
2. Registrar a secagem. **Esperado**: seca, fora da ordenha. Cancelar: volta à ordenha.
3. Vender (ou marcar morta) uma vaca em lactação. **Esperado**: lactação encerrada, fora da ordenha.

### 5. Entregas e análises (US4)

1. Lançar 3 entregas. **Esperado**: total entregue × leite para o tanque e a diferença.
2. Dono informa o preço do mês. **Esperado**: valor por entrega e total. Funcionário vê só litros;
   pela API, `POST /entregas/preco-do-mes` → 403 e `GET /entregas` sem campos de dinheiro.
3. Lançar análise de outubro. **Esperado**: no histórico mensal.

### 6. Relatórios (US5)

1. Produção diária e mensal batem com a soma manual; média por vaca em lactação confere.
2. Curva da vaca e total da lactação encerrada conferem.

### 7. Só consulta e isolamento

1. Desativar o Leite. **Esperado**: tudo visível, sem lançar; parto de vaca de leite ainda abre
   lactação.
2. Outra fazenda de teste chama `GET /vacas/:animalId` da primeira. **Esperado**: 404.
