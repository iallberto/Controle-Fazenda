# Data Model: Cobertura e Inseminação no Pacote Inicial

**Feature**: [spec.md](./spec.md) · **Decisões**: [research.md](./research.md)

Todas as tabelas novas têm `fazenda_id` (direto ou pela entidade pai) e seguem o princípio I:
toda consulta é filtrada pela fazenda do token. Campos de auditoria padrão em todas as tabelas
novas: `criado_por`, `criado_em`, `atualizado_por`, `atualizado_em`. Campos de cancelamento
(R9) onde indicado: `cancelado` (bool, padrão falso), `cancelado_em`, `cancelado_por`,
`motivo_cancelamento`.

---

## Entidades novas

### EstacaoMonta (`estacoes_monta`)

| Campo | Tipo | Regras |
|---|---|---|
| id | uuid | |
| fazendaId | uuid | obrigatório |
| touroId | uuid → Animal | ativo, macho, categoria Touro, mesma fazenda (FR-008) |
| pastoId | uuid → Pasto | mesma fazenda |
| dataEntrada | date | obrigatório |
| dataSaida | date, nulo | ≥ dataEntrada (FR-004); nulo = estação aberta |
| motivoEncerramento | varchar, nulo | `MANUAL`, `TOURO_SAIU_DO_PASTO`, `TOURO_SAIU_DO_REBANHO` |
| + auditoria, + cancelamento | | |

- Um touro não pode ter duas estações abertas e não canceladas ao mesmo tempo (FR-005).
- Encerrar a estação encerra as exposições ainda abertas dela na mesma data.

### ExposicaoMonta (`exposicoes_monta`)

| Campo | Tipo | Regras |
|---|---|---|
| id | uuid | |
| estacaoId | uuid → EstacaoMonta | |
| femeaId | uuid → Animal | fêmea apta na data de início (FR-003) |
| dataInicio | date | ≥ dataEntrada da estação |
| dataFim | date, nulo | ≥ dataInicio; nulo = ainda exposta |
| motivoFim | varchar, nulo | `ESTACAO_ENCERRADA`, `SAIU_DO_PASTO`, `SAIU_DO_REBANHO` |
| + auditoria, + cancelamento | | |

- Única por (estação, fêmea) entre as não canceladas.
- Fêmeas do pasto **deixadas de fora** na abertura ficam em `ExcecaoEstacao`.

### ExcecaoEstacao (`excecoes_estacao_monta`)

| Campo | Tipo | Regras |
|---|---|---|
| id | uuid | |
| estacaoId | uuid → EstacaoMonta | |
| femeaId | uuid → Animal | |
| motivo | varchar(200) | obrigatório |

### Semen (`semens`)

| Campo | Tipo | Regras |
|---|---|---|
| id | uuid | |
| fazendaId | uuid | |
| nomeTouro | varchar | obrigatório |
| racaId | uuid → Raca, nulo | raça padrão ou da fazenda |
| central | varchar, nulo | |
| doses | int | ≥ 0; baixa atômica (R8) |
| + auditoria | | |

- Só o dono exclui, e só se nunca foi usado (FR-024); sem cancelamento.

### Inseminacao (`inseminacoes`)

| Campo | Tipo | Regras |
|---|---|---|
| id | uuid | |
| femeaId | uuid → Animal | fêmea apta na data (FR-003) |
| data | date | |
| tipo | enum `IA`, `IATF` | |
| semenId | uuid → Semen | mesma fazenda, com dose (FR-011) |
| aplicadoPorTipo | enum `USUARIO`, `VETERINARIO` | mesmo modelo dos tratamentos |
| aplicadoPorUsuarioId / aplicadoPorVeterinarioId | uuid, nulo | um dos dois, conforme o tipo |
| + auditoria, + cancelamento | | cancelar devolve a dose |

### DiagnosticoGestacao (`diagnosticos_gestacao`)

| Campo | Tipo | Regras |
|---|---|---|
| id | uuid | |
| femeaId | uuid → Animal | fêmea ativa (FR-017) |
| data | date | |
| resultado | enum `PRENHE`, `VAZIA`, `PERDA` | `PERDA` = perda de gestação (FR-016) |
| metodo | enum `TOQUE`, `ULTRASSOM`, nulo | obrigatório se resultado ≠ `PERDA` |
| idadeGestacionalDias | int, nulo | > 0; só com `PRENHE` (R10) |
| motivo | varchar, nulo | obrigatório com `PERDA` |
| feitoPorTipo + ids | | mesmo modelo de "aplicado por" |
| sessaoId | uuid, nulo | quando veio do diagnóstico em lote |
| + auditoria, + cancelamento | | |

- `PERDA` só é aceita se a fêmea estiver Prenha.

### PartoCandidatoPai (`parto_candidatos_pai`)

| Campo | Tipo | Regras |
|---|---|---|
| id | uuid | |
| partoId | uuid → Parto | |
| touroId | uuid → Animal, nulo | um dos dois preenchido |
| semenId | uuid → Semen, nulo | |

---

## Entidades existentes alteradas

### Animal

| Campo | Mudança |
|---|---|
| statusReprodutivo | passa a ser mantido pelos eventos (R3) |
| paiSemenId | **novo**, uuid → Semen, nulo: pai quando a cria vem de inseminação |

### Parto

| Campo | Mudança |
|---|---|
| inseminacaoId | **novo**, uuid → Inseminacao, nulo |
| candidatos | **novo**, relação com PartoCandidatoPai |
| (regra) | aceita mãe Matriz ou Novilha; Novilha vira Matriz (FR-031) |

---

## Transições do status reprodutivo (fêmea)

```text
            diagnóstico VAZIA                 diagnóstico PRENHE
 (nulo) ─────────────────────▶ Vazia ─────────────────────────▶ Prenha
   │                             ▲                              │  │
   │ diagnóstico PRENHE          │ diagnóstico VAZIA / PERDA    │  │ parto com cria viva
   └─────────────────────────────┼──────────────────────────────┘  ▼
                                 │ parto natimorto              Lactante
                                 └──────────────────────────────── │
                                                                   │ diagnóstico (PRENHE/VAZIA)
                                                                   ▼
                                                            Prenha / Vazia
```

- Aptidão (R4) não é status: Vazia, Lactante ou nulo, com último parto há ≥ 45 dias.
- Editar ou cancelar um evento recalcula o status a partir do evento válido mais recente entre
  diagnósticos e partos (R3).

## Situação reprodutiva exibida (derivada, FR-027)

| Situação | Quando |
|---|---|
| Exposta ao touro X desde dd/mm | exposição aberta, sem diagnóstico posterior |
| Inseminada em dd/mm (sêmen Y) | inseminação sem diagnóstico posterior |
| Prenha, parto previsto dd/mm (base) | status Prenha + previsão (R5) |
| Vazia | status Vazia |
| Lactante, apta em dd/mm | status Lactante + data do parto + 45 dias |
