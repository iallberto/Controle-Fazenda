# Quickstart: validar o Módulo Nutrição

Rotas em [contracts/api.md](./contracts/api.md); tabelas em [data-model.md](./data-model.md);
regras em [research.md](./research.md).

## Pré-requisitos

- Docker no ar. **Migration nova primeiro na cópia** (`controle_fazenda_copia`, backup em
  `pg_dump`), contagens conferidas, `migration:generate` sem mudanças; só depois no dev.
- Backend: `npm test`, `npx tsc --noEmit`, `npm run lint`; frontend: `tsc -b`, `eslint src`.
- Fazenda de teste isolada, dono e funcionário, 2 pastos, 22 animais (20 vacas, 2 novilhas); a
  Nutrição liberada pelo painel do administrador. Nunca a fazenda real.

## Cenários (celular, 375 px)

### 1. Insumos e estoque (US1)

1. Dono cria "Ração 22%" em kg, unidade "saco" = 25 kg, mínimo 250 kg. **Esperado**: estoque 0, alerta.
2. Funcionário lança entrada de 40 sacos (compra, sem valor). **Esperado**: "1.000 kg · 40 sacos",
   sem alerta; entrada aguardando preço; funcionário com valor → 403.
3. Baixa de 2 sacos por perda; cancelar uma entrada. **Esperado**: estoque recalculado, histórico.
4. Dono informa R$ 3.200,00 na entrada. **Esperado**: custo médio R$ 3,20/kg; aviso some.

### 2. Lotes, dietas e fornecimento (US2)

1. Dono cria o lote "Lactação"; funcionário marca as 20 vacas pelo filtro. Incluir uma delas em
   outro lote. **Esperado**: sai do primeiro.
2. Dieta: 25 kg silagem, 4 kg ração, 0,15 kg sal por animal. **Esperado**: sugestão 500 / 80 / 3 kg.
3. Fornecer com 480 kg de silagem. **Esperado**: estoques baixados; fornecimento guarda 20 animais.
4. Fornecer além do estoque. **Esperado**: 409 e confirmação; com confirmação, estoque negativo em destaque.
5. Cancelar um fornecimento. **Esperado**: estoques voltam.
6. Vender uma vaca do lote. **Esperado**: sai do lote; sugestão de amanhã com 19.

### 3. Silo (US3)

1. Silo 300 t fechado. **Esperado**: reserva 300 t, disponível não muda. Abrir. **Esperado**: +300.000 kg.
2. 10 dias de fornecimento somando 30 t. **Esperado**: saldo 270 t, média 3 t/dia, dura 90 dias.
3. Cancelar abertura com baixas → recusado.

### 4. Custo (US4)

1. Um mês de fornecimentos com preços. **Esperado**: total e custo por animal-dia batem com a conta manual.
2. Funcionário: nenhuma tela ou resposta com R$.

### 5. Só consulta e isolamento

1. Desativar a Nutrição. **Esperado**: lê, não lança.
2. Outra fazenda chama `GET /lotes/:id` da primeira. **Esperado**: 404.
