# API Contracts: Cobertura e Inseminação

Todas as rotas exigem login (Bearer), usam a fazenda do token e respondem **404** para
registros de outra fazenda. Ids de rota validados como UUID. Datas `AAAA-MM-DD`.
"Dono" = `@Roles(DONO)`; as demais aceitam dono e funcionário.

Prefixo: `/reproducao`.

---

## Estações de monta

| Método e rota | Quem | Corpo / query | Resposta |
|---|---|---|---|
| `GET /estacoes` | todos | `?situacao=ABERTA\|ENCERRADA` | lista: touro (brinco), pasto, datas, nº de expostas |
| `GET /estacoes/:id` | todos | | estação + exposições (fêmea, início, fim, motivoFim) + exceções |
| `GET /estacoes/aptas?pastoId=` | todos | | fêmeas aptas do pasto (R4), para montar a lista |
| `POST /estacoes` | todos | `{ touroId, pastoId, dataEntrada, femeaIds[], excecoes[{femeaId, motivo}] }` | 201 estação |
| `POST /estacoes/:id/femeas` | todos | `{ femeaIds[], dataInicio }` | inclui fêmeas numa estação aberta (FR-006) |
| `POST /estacoes/:id/encerrar` | todos | `{ dataSaida }` | encerra estação e exposições abertas |
| `PATCH /estacoes/:id` | dono | `{ dataEntrada?, dataSaida? }` | edição auditada |
| `POST /estacoes/:id/cancelar` | dono | `{ motivo }` | cancela estação e exposições |
| `POST /exposicoes/:id/cancelar` | dono | `{ motivo }` | cancela uma exposição |

Erros: 400 data de saída anterior à entrada · 400 fêmea não apta · 400 marcados + exceções ≠
fêmeas aptas do pasto ("a lista mudou") · 409 touro já em estação aberta · 404 touro/pasto.

## Sêmen

| Método e rota | Quem | Corpo | Resposta |
|---|---|---|---|
| `GET /semens` | todos | | lista com doses |
| `POST /semens` | todos | `{ nomeTouro, racaId?, central?, doses }` | 201 |
| `POST /semens/:id/entrada` | todos | `{ doses }` (> 0) | doses atualizadas (FR-012) |
| `DELETE /semens/:id` | dono | | 204; 409 se já usado |

## Inseminações

| Método e rota | Quem | Corpo | Resposta |
|---|---|---|---|
| `POST /inseminacoes` | todos | `{ femeaId, data, tipo, semenId, aplicadoPorTipo, aplicadoPorUsuarioId?, aplicadoPorVeterinarioId? }` | 201; baixa uma dose |
| `PATCH /inseminacoes/:id` | dono | campos acima, parciais | edição auditada |
| `POST /inseminacoes/:id/cancelar` | dono | `{ motivo }` | devolve a dose |

Erros: 409 sêmen sem doses · 400 fêmea não apta · 404 sêmen/aplicador.

## Diagnósticos de gestação

| Método e rota | Quem | Corpo | Resposta |
|---|---|---|---|
| `POST /diagnosticos` | todos | `{ femeaId, data, resultado: PRENHE\|VAZIA, metodo, idadeGestacionalDias?, feitoPorTipo, feitoPor...Id? }` | 201; atualiza status |
| `POST /diagnosticos/lote` | todos | `{ pastoId?, categoria?, data, metodo, feitoPor..., resultados[{femeaId, resultado, idadeGestacionalDias?}] }` | `{ prenhes, vazias }` |
| `GET /diagnosticos/grupo?pastoId=&categoria=` | todos | | fêmeas ativas do grupo com situação atual |
| `POST /perdas` | todos | `{ femeaId, data, motivo }` | 201; status → Vazia |
| `PATCH /diagnosticos/:id` | dono | parcial | recalcula status |
| `POST /diagnosticos/:id/cancelar` | dono | `{ motivo }` | recalcula status |

Erros: 400 macho / fora do rebanho · 400 perda sem estar Prenha · 400 idade gestacional com
resultado ≠ PRENHE.

## Situação e histórico

| Método e rota | Quem | Resposta |
|---|---|---|
| `GET /animais/:id/situacao` | todos | `{ status, situacao, previsaoParto?: { data, base: INSEMINACAO\|TOQUE\|ESTACAO }, aptaEm? }` (FR-027) |
| `GET /animais/:id/historico` | todos | eventos em ordem de data: exposições, inseminações, diagnósticos, perdas, partos, com flag `cancelado` (FR-023) |

## Parto (rotas existentes, comportamento novo)

| Rota | Mudança |
|---|---|
| `POST /parto` | aceita mãe Novilha (vira Matriz); grava candidatos a pai e preenche o pai das crias quando houver um só; status da mãe → Lactante ou Vazia |
| `GET /parto?maeId=` | inclui `candidatosPai[]` e o pai definido |
| `PATCH /parto/:id/pai` | **novo**, dono: `{ touroId? \| semenId? }`, só entre os candidatos (FR-021) |

## Relatórios (dentro de `/relatorio`)

| Método e rota | Resposta |
|---|---|
| `GET /relatorio/vacas-a-parir?dias=` | fêmeas prenhes com previsão até hoje + dias e as atrasadas: brinco, previsão, base, touro/sêmen, pasto (FR-019) |
| `GET /relatorio/indicadores-reprodutivos` | por estação/touro e por sêmen: expostas, prenhes, vazias, sem diagnóstico, saíram, taxa (FR-028); intervalo entre partos por matriz e média (FR-029) |
| `GET /relatorio/vacas-vazias` | fêmeas Vazias com dias desde o último parto e última cobertura (FR-030) |
