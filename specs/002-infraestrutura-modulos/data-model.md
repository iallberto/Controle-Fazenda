# Data Model: Infraestrutura de Módulos (Fase 0)

Tabelas novas e alteradas. Todas criadas pela migration (R1); nenhuma pelo `synchronize`.

## ModuloPago (enum)

`LEITE` · `FINANCEIRO` · `NUTRICAO`. O pacote inicial (Reprodução e Rebanho) **não** é um valor
do enum: está sempre disponível (FR-006).

## ModuloFazenda — `modulos_fazenda`

Um período de contrato de um módulo para uma fazenda.

| Campo | Tipo | Regras |
|---|---|---|
| id | uuid | |
| fazendaId | uuid → fazendas | obrigatório |
| modulo | enum ModuloPago | obrigatório |
| dataInicio | date | obrigatório; pode ser futura |
| dataTermino | date, nula | se informada, ≥ dataInicio (edge case da spec) |
| liberadoPorId | uuid → administradores | obrigatório |
| liberadoEm | timestamptz | criado automaticamente |
| desativadoPorId | uuid → administradores, nulo | |
| desativadoEm | timestamptz, nulo | preenchido ao desativar; nunca volta a nulo |

- Índice em (fazendaId, modulo).
- **Regra de unicidade** (service, em transação): ao liberar, não pode existir outro período da
  mesma fazenda e módulo **não desativado** e **sem término passado** (vigente ou futuro).
  Liberar de novo depois de desativado ou vencido cria um período novo.
- **Situação calculada** (R3), para uma data `hoje`:
  - ATIVO ⇔ ∃ período com `desativadoEm` nulo, `dataInicio ≤ hoje` e (`dataTermino` nula ou `hoje ≤ dataTermino`);
  - SO_CONSULTA ⇔ não ATIVO e ∃ período com `dataInicio ≤ hoje`;
  - NAO_CONTRATADO ⇔ nenhum período com `dataInicio ≤ hoje`.
- `diasParaVencer` = dias entre hoje e `dataTermino` do período ATIVO (nulo sem término).

Transições de um período:

```text
FUTURO --(chega dataInicio)--> VIGENTE --(passa dataTermino)--> VENCIDO
   \                              \
    \--(desativar)--> DESATIVADO   \--(desativar)--> DESATIVADO
```

## Administrador — `administradores`

| Campo | Tipo | Regras |
|---|---|---|
| id | uuid | |
| nome | varchar | obrigatório |
| email | varchar | único |
| senhaHash | varchar | bcrypt; senha original ≥ 12 caracteres com letras e números (FR-018a) |
| ativo | boolean | padrão true |
| criadoEm | timestamptz | |

Sem vínculo com fazenda. Criado só pelo comando `npm run admin:criar` (FR-022).

## TentativaLoginAdmin — `admin_tentativas_login`

| Campo | Tipo | Regras |
|---|---|---|
| id | uuid | |
| email | varchar | o e-mail digitado (pode não existir) |
| sucesso | boolean | |
| ip | varchar, nulo | |
| criadoEm | timestamptz | índice (email, criadoEm) |

Bloqueio: as 5 últimas tentativas do e-mail nos últimos 15 minutos foram todas falhas → login
recusado (429) até a mais antiga dessas sair da janela (R7).

## Fazenda — `fazendas` (alterada)

| Campo novo | Tipo | Regras |
|---|---|---|
| suspensa | boolean | padrão false; atalho da situação atual (R8) |

## SuspensaoFazenda — `fazenda_suspensoes`

| Campo | Tipo | Regras |
|---|---|---|
| id | uuid | |
| fazendaId | uuid → fazendas | |
| motivo | varchar(200) | obrigatório |
| suspensaPorId | uuid → administradores | |
| suspensaEm | timestamptz | |
| reativadaPorId | uuid → administradores, nulo | |
| reativadaEm | timestamptz, nulo | |

- No máximo uma suspensão aberta (sem `reativadaEm`) por fazenda; `fazendas.suspensa` = existe
  suspensão aberta. As duas mudam juntas, na mesma transação.
- Suspender não altera `modulos_fazenda`: módulos com término vencido durante a suspensão voltam
  como SO_CONSULTA pela própria regra de datas (edge case da spec).

## Tabela de controle das migrations — `migrations`

Criada pelo TypeORM. A migration `Inicial` é a primeira linha; num banco que já existia ela é
registrada sem executar DDL (R2).

## Relação com o que já existe

- `usuarios`, rebanho e reprodução: **sem mudança** de estrutura.
- `JwtPayload` das fazendas: sem campo novo; a suspensão é lida da fazenda a cada requisição.
- Token do administrador: `{ sub, papel: 'ADMIN', aud: 'admin' }`, sem `fazendaId`.
