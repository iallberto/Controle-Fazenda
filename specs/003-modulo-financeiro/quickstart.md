# Quickstart: validar o Módulo Financeiro

Rotas em [contracts/api.md](./contracts/api.md); tabelas e cálculos em
[data-model.md](./data-model.md) e [research.md](./research.md) (R5).

## Pré-requisitos

- Docker no ar. **Migration nova primeiro na cópia** (`controle_fazenda_copia`, backup em
  `pg_dump`), contagens conferidas, `migration:generate` sem mudanças; só depois no dev.
- Backend: `npm test`, `npx tsc --noEmit`, `npm run lint`; frontend: `tsc -b`, `eslint src`.
- Fazenda de teste isolada com dono e funcionário, 2 pastos, 6 animais ativos (2 garrotes de
  peso conhecido, 2 bezerros, 2 vacas), peso de referência de 15 kg/@ para garrote; o Financeiro
  liberado pelo painel do administrador. Nunca a fazenda real.

## Cenários (celular, 375 px)

### 1. Lançamentos (US1)

1. Dono: lançar despesa "Ração" R$ 1.250,00 hoje. **Esperado**: na lista do mês, saldo −1.250,00.
2. Criar a categoria "Frete" (despesa) e usá-la. Renomear; tentar renomear "Ração e sal".
   **Esperado**: a padrão é recusada.
3. Cancelar um lançamento com motivo. **Esperado**: riscado na lista, fora do saldo.
4. Valor 0 ou categoria de receita numa despesa. **Esperado**: recusado.

### 2. Venda (US2)

1. Vender 1 garrote de 450 kg a R$ 300,00/@. **Esperado**: prévia 30,00 @ e R$ 9.000,00; lembrete
   do brinco com a lista de brincos; depois de confirmar: animal Vendido, fora do pasto, pesagem
   de venda, receita de 9.000,00 em "Venda de animais".
2. Vender 2 bezerros + 1 vaca por valor total R$ 10.000,00. **Esperado**: um lançamento; partes
   proporcionais ao peso somando exatamente 10.000,00.
3. Tentar vender de novo um animal vendido. **Esperado**: recusa.
4. Cancelar a venda do item 2. **Esperado**: receita cancelada, os 3 animais Ativos no pasto de
   antes, venda marcada como cancelada.
5. Pelo pacote inicial, mudar o status de um animal para Vendido. **Esperado**: dono é levado à
   tela de venda; pela API, 409 `VENDA_PELO_FINANCEIRO`; Morto continua funcionando.

### 3. Compras (FR-016b, FR-016c)

1. Dono cadastra animal comprado com valor R$ 2.000,00. **Esperado**: despesa em "Compra de
   animais", ligada ao animal. Outro com 0,00: animal criado, sem despesa.
2. Funcionário cadastra 2 animais comprados. **Esperado**: dono, ao entrar, vê "Funcionários
   cadastraram 2 animais comprados sem valor"; informa o valor de um e 0,00 no outro; o aviso some.

### 4. Funcionário (US4, FR-002)

1. Funcionário abre o Financeiro. **Esperado**: só "Registrar uso" e a lista de usos da fazenda,
   sem nenhum R$; registra "Diesel, 40 litros".
2. Pela API, funcionário chama `GET /lancamentos`, `/vendas`, `/resultado/mensal`. **Esperado**: 403.
3. Dono valoriza o diesel com R$ 280,00. **Esperado**: despesa no mês; registro "lançado".
   Descarta outro com motivo.
4. Página do animal vendido vista pelo funcionário: só "Vendido em …", sem comprador nem valor.

### 5. Resultado (US3)

1. Com lançamentos e vendas em três meses (datas passadas), abrir o resultado. **Esperado**:
   receita, despesa e lucro de cada mês batem com a soma manual; cancelados fora.
2. Despesas por categoria em ordem, com porcentagem somando 100%.
3. Preço médio da arroba = soma dos valores das vendas com peso ÷ soma das arrobas.

### 6. Só consulta e isolamento

1. Desativar o Financeiro no painel. **Esperado**: dono vê tudo sem botões de lançar; `POST`
   recusado com "só consulta"; funcionário não registra uso.
2. Outra fazenda de teste chama `GET /vendas/:id` da primeira. **Esperado**: 404.
