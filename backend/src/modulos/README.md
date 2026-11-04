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
