# API Contracts: Módulo Leite

Prefixo `/modulos/leite`. Todo controller tem `@Modulo(LEITE)` (spec 002): `GET` é consulta
(ATIVO e SO_CONSULTA), o resto é lançamento (só ATIVO). Fazenda sempre do token; registro de
outra fazenda → 404. Datas `AAAA-MM-DD`; litros com uma casa decimal; dinheiro em centavos.

**Papéis (FR-002)**: dono e funcionário usam tudo, exceto as rotas marcadas **dono**. Nas
respostas ao funcionário não há `precoLitroCentavos`, `valorCentavos` nem totais em reais.

---

## Configuração

| Método e rota | Corpo / query | Resposta |
|---|---|---|
| `GET /configuracao` | | `{ modo, ordenhasPorDia, prazoSecagemDias, janelaSecarDias }` (cria com padrão) |
| `PATCH /configuracao` (dono) | os mesmos campos, opcionais | atualizado |

## Vacas e lactação

| Método e rota | Corpo / query | Resposta |
|---|---|---|
| `GET /vacas` | `?situacao=EM_LACTACAO\|SECA\|TODAS` | vacas de leite ativas: brinco, nome, raça, situação, DEL, início, carência até, secagem planejada |
| `GET /vacas/:animalId` | | situação, lactação atual (DEL, total, média, pico), lactações encerradas, carência, `vacaDeLeite`, secagem planejada |
| `PATCH /vacas/:animalId/vaca-de-leite` (dono) | `{ vacaDeLeite: PELA_RACA\|SIM\|NAO }` | situação; resposta traz `partoRecente { partoId, data }` quando cabe oferecer o início (FR-004b) |
| `POST /lactacoes` | `{ animalId, inicio, partoId? }` | 201; 400 não é vaca de leite, data futura ou sobreposta; 409 já em lactação |
| `GET /vacas/:animalId/curva` | `?lactacaoId=` | `[{ data, del, litros, descarte }]` |

## Ordenha

| Método e rota | Corpo / query | Resposta |
|---|---|---|
| `GET /ordenhas/turno` | `?data=&turno=` | `{ modo, data, turno, vacas[{ animalId, brinco, nome, del, litrosAnterior, carenciaAte, litros?, descarte? }], tanque? }` — no modo TANQUE, `vacas` só as em carência |
| `PUT /ordenhas/vaca` | `{ data, turno, animalId, litros, confirmarAcima? }` | upsert; `{ litros, descarte }`; 400 sem lactação aberta, litros > 80 sem confirmação, data futura, turno inválido |
| `PUT /ordenhas/tanque` | `{ data, turno, litros }` | upsert |
| `GET /ordenhas/dia` | `?data=` | por vaca e turno, total por vaca, `{ paraTanque, descartado }` |

## Carência e produtos

| Método e rota | Corpo / query | Resposta |
|---|---|---|
| `GET /produtos` | `?incluirInativos=` | produtos da fazenda por nome |
| `POST /produtos` | `{ nome, carenciaLeiteDias }` | 201; 409 nome repetido |
| `PATCH /produtos/:id` | `{ nome?, carenciaLeiteDias?, ativo? }` | não muda carências já gravadas |
| `GET /carencias` | | vacas com leite em descarte hoje: brinco, produto, data final (Manejo, FR-018) |

**Pacote inicial (comportamento novo, com o Leite ATIVO e animal fêmea)**: `POST /tratamento`,
`PATCH /tratamento/:id` e o tratamento do Manejo em lote respondem **422**
`{ codigo: 'PRODUTO_SEM_CADASTRO', produto, message: 'Cadastre o produto com a carência de leite' }`
quando o produto não está no cadastro; nada é gravado (R6).

## Secagem

| Método e rota | Corpo / query | Resposta |
|---|---|---|
| `GET /secagens/a-secar` | `?dias=` | vacas com secagem planejada até hoje + dias, atrasadas primeiro: brinco, DEL, parto previsto, secagem planejada, média 7 dias |
| `POST /secagens` | `{ animalId, data, observacao? }` | encerra a lactação; 400 data futura ou antes do início |
| `POST /secagens/:id/cancelar` | `{ motivo }` | reabre a lactação; 409 se houver lactação mais nova |

## Entregas e análises

| Método e rota | Corpo / query | Resposta |
|---|---|---|
| `GET /entregas` | `?mes=AAAA-MM` | `{ entregas[], totalLitros, paraTanque, diferenca }` + `precoLitroCentavos`, `valorCentavos`, `totalCentavos` só para o dono |
| `POST /entregas` | `{ data, litros, observacao?, precoLitroCentavos? }` | 201; preço vindo do funcionário → 403 |
| `PATCH /entregas/:id` | `{ data?, litros?, observacao? }` | |
| `POST /entregas/:id/cancelar` | `{ motivo }` | |
| `POST /entregas/:id/preco` (dono) | `{ precoLitroCentavos }` | |
| `POST /entregas/preco-do-mes` (dono) | `{ mes, precoLitroCentavos }` | aplica a todas as entregas não canceladas do mês |
| `GET /analises` | `?de=&ate=` (meses) | por mês: CCS, CBT, gordura, proteína |
| `POST /analises` | `{ mes, entregaId?, ccsMil?, cbtMil?, gordura?, proteina? }` | 201; 400 sem nenhum valor |
| `PATCH /analises/:id`, `POST /analises/:id/cancelar` | | |

## Relatórios

| Método e rota | Resposta |
|---|---|
| `GET /producao/diaria?de=&ate=` | `[{ data, paraTanque, descartado, vacasEmLactacao, mediaPorVaca }]` + totais (máx. 92 dias) |
| `GET /producao/mensal?de=AAAA-MM&ate=AAAA-MM` | `[{ mes, paraTanque, descartado, mediaPorVacaDia }]` (padrão 12, máx. 36) |
| `GET /lactacoes/encerradas?animalId=` | `[{ inicio, fim, dias, totalLitros, motivoFim }]` |

## Removido

- `GET` e `POST /modulos/leite/exemplo` (fase 0).
