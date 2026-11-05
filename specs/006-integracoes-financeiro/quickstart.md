# Quickstart: validar as integrações com o Financeiro

Contratos em [contracts/api.md](./contracts/api.md); dados em [data-model.md](./data-model.md).

## Pré-requisitos

- Docker no ar; migration nova primeiro na cópia (backup em `pg_dump`, contagens, `migration:generate`
  sem mudanças), depois no dev.
- Testes, tipos e lint do backend e do frontend.
- Fazenda de teste com dono e funcionário e os três módulos liberados; outra fazenda só com o Leite.

## Cenários

### 1. Leite (US1)

1. Três entregas em outubro, uma sem preço. Confirmar o recebimento. **Esperado**: 400 com a entrega sem preço.
2. Preço do mês R$ 2,60; confirmar em 10/11 com o valor calculado. **Esperado**: receita em "Venda de
   leite" na data 10/11, origem Leite, link para as entregas de outubro.
3. Mudar uma entrega de outubro. **Esperado**: 409 `MES_RECEBIDO`.
4. Tentar editar a receita no Financeiro. **Esperado**: recusado, indicando o Leite.
5. Desfazer o recebimento. **Esperado**: receita cancelada; entregas liberadas. Confirmar de novo com
   R$ 9.300,00. **Esperado**: receita nova com R$ 9.300,00 e diferença mostrada no Leite.
6. Fazenda só com o Leite: confirmar. **Esperado**: recebimento gravado, nada no Financeiro.

### 2. Nutrição (US2)

1. Dono lança compra de ração com R$ 3.200,00. **Esperado**: despesa em "Ração e sal", origem Nutrição.
2. Funcionário lança compra sem valor; dono informa o preço. **Esperado**: despesa nessa hora.
3. Insumo "Diesel" com categoria "Combustível e energia". **Esperado**: a compra vai para essa categoria.
4. Cancelar a entrada. **Esperado**: despesa cancelada.
5. Produção própria com valor e abertura de silo. **Esperado**: nada no Financeiro.

### 3. Origem e regras gerais (US3)

1. Filtrar os lançamentos por origem. **Esperado**: só os do Leite ou da Nutrição.
2. Desativar o Financeiro e confirmar um recebimento. **Esperado**: nada no Financeiro; reativar não
   lança o anterior.
3. Funcionário: nenhuma tela com R$; 403 no recebimento.
