# Módulos

Aqui ficam a infraestrutura dos módulos pagos e os próprios módulos (spec 002). O pacote
inicial, Reprodução e Rebanho, continua nas pastas de `src/` e está sempre disponível.

| Pasta | O que tem |
|---|---|
| `acesso/` | Liberações por fazenda (`modulos_fazenda`), decorator `@Modulo` e guard global que bloqueia |
| `admin/` | Painel do dono do software: login próprio, fazendas, módulos e suspensão |
| `leite/`, `financeiro/`, `nutricao/` | Cada módulo pago, isolado |

## Regras

- Todo controller de `leite/`, `financeiro/` e `nutricao/` tem `@Modulo(...)` na classe.
  Um teste falha se faltar.
- Por padrão, `GET` é consulta e os outros métodos são lançamento. Um módulo desativado continua
  aceitando consulta, mas recusa lançamento.
- O pacote inicial não importa nada dos módulos pagos, e um módulo pago não importa outro.
  Integração entre módulos só acontece quando os dois estão ativos na fazenda (constituição,
  princípio VI).
- Quando um módulo pago precisa reagir ao rebanho, ele usa os **ganchos do rebanho**
  (`src/common/ganchos-rebanho.ts`, spec 004): o pacote inicial emite `partoRegistrado`,
  `partoAlterado`, `saidaDoRebanho` e `tratamentoGravado` dentro da própria transação, e o módulo
  registra os seus no `onModuleInit` (o Leite em `leite/ganchos-leite.ts`, a Nutrição em
  `nutricao/ganchos-nutricao.ts`). Um gancho que lança
  erro desfaz a operação inteira.
- Quando um módulo pago gera dinheiro, ele avisa pelos **ganchos dos módulos**
  (`src/common/ganchos-modulos.ts`, spec 006): o Leite emite `leiteRecebido` e
  `leiteRecebimentoDesfeito`, a Nutrição emite `nutricaoCompraValorada` e
  `nutricaoEntradaCancelada`, sempre dentro da própria transação. O Financeiro registra os seus em
  `financeiro/ganchos-financeiro.ts` e só lança se ele e o módulo de origem estiverem ativos. O
  lançamento guarda `origem`, `origemId` e `origemCaminho` e não é editado no Financeiro.
