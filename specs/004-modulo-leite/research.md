# Research: Módulo Leite

Decisões técnicas do plano, cada uma com o porquê e o que foi descartado.

## R1. Como o pacote inicial avisa o Leite sem importá-lo (ganchos do rebanho)

- **Decision**: um registro de ganchos simples em `backend/src/common/ganchos-rebanho.ts`
  (objeto do módulo, sem injeção): o pacote inicial **emite** e o Leite **registra** os seus
  no `onModuleInit` do `LeiteModule`. Eventos, todos chamados dentro da transação de quem emite,
  com o `manager`:
  - `partoRegistrado({ fazendaId, maeId, partoId, data, usuarioId })` — `PartoService.create`;
  - `partoAlterado({ fazendaId, maeId, partoId, dataAnterior, dataNova, usuarioId })` — `PartoService.update`;
  - `saidaDoRebanho({ fazendaId, animalId, data, usuarioId })` — `registrarSaidaDoRebanho`
    (cobre mudança de status e venda do Financeiro);
  - `tratamentoGravado({ fazendaId, animalId, tratamentoId, produto, data, usuarioId, novo })` —
    `TratamentoService.create/update` e `ManejoLoteService.tratamentoEmLote`.
  Um gancho pode lançar erro (ex.: produto sem cadastro), e a transação toda é desfeita.
- **Rationale**: o pacote inicial continua sem importar `modulos/` (teste de fronteira da fase 0);
  `registrarSaidaDoRebanho` é função solta, então o registro precisa ser alcançável sem DI.
  Tudo acontece na mesma transação (constituição II).
- **Alternatives considered**: `@nestjs/event-emitter` (dependência nova e eventos fora da
  transação); o Leite "sincronizar" partos ao abrir a ordenha (corrida e lactação atrasada);
  rota do Leite para parto e tratamento como a compra do Financeiro (duplicaria telas e o Manejo
  em lote).

## R2. Quando um parto inicia lactação

- **Decision**: o gancho `partoRegistrado` do Leite inicia lactação quando: (1) o Leite da fazenda
  está ATIVO ou SO_CONSULTA (edge case da spec: não perder o início); (2) a mãe é **vaca de leite**
  (`vacaDeLeite = SIM`, ou `PELA_RACA` com raça `leiteira = true`). Vale para bezerro vivo e
  natimorto. Se há lactação aberta, ela é encerrada no dia anterior com motivo `NOVO_PARTO`.
  `partoAlterado` move o início da lactação ligada ao parto (`partoId`).
- **Rationale**: FR-004, FR-004a, FR-004b e FR-008.

## R3. Vaca de leite e raça leiteira

- **Decision**: colunas no pacote base: `racas.leiteira boolean default false` e
  `animais.vaca_de_leite enum('PELA_RACA','SIM','NAO') default 'PELA_RACA'`. As raças padrão
  ganham Holandesa 280, Girolando 285, Jersey 279, Gir 290 com `leiteira = true` na lista
  `RACAS_PADRAO` do `RacaService` (mesmo mecanismo das de corte) e a migration marca as quatro
  como leiteiras se já existirem. A função pura `ehVacaDeLeite(animal, raca)` fica no Leite.
  Mudar `vacaDeLeite` é rota do Leite, só dono (FR-002).
- **Rationale**: dados simples do animal e da raça, úteis mesmo sem o módulo (FR-030); a regra
  fica no módulo.

## R4. Lactação e situação leiteira

- **Decision**: tabela `lactacoes` (uma aberta por vaca, índice único parcial `fim IS NULL`).
  Situação leiteira derivada: lactação aberta = "em lactação"; senão, se já teve lactação =
  "seca"; senão, nenhuma. DEL = hoje − início (função pura). Início manual (FR-006) com data não
  futura, recusado se já houver aberta ou se a data cair dentro de outra lactação.
- **Rationale**: sem coluna duplicada no animal; histórico de lactações completo (FR-008, US5).

## R5. Ordenha: uma linha por vaca e turno, ou por tanque e turno

- **Decision**: tabela `ordenhas` com `tipo VACA | TANQUE`, `data`, `turno` (1–3), `animalId` e
  `lactacaoId` (VACA), `litros decimal(7,1)`, `descarte boolean`. Únicos parciais:
  `(fazenda, data, turno, animal)` para VACA e `(fazenda, data, turno)` para TANQUE. Gravar é
  **upsert** (substitui, FR-014). Lançamento em lote: a tela manda uma vaca por vez (`PUT`),
  para não perder o que já foi digitado se o sinal cair no curral. No modo tanque, as vacas em
  carência são linhas VACA com `descarte = true` (FR-012a), e o TANQUE é só o leite para o tanque.
- **Rationale**: FR-009 a FR-014, SC-001; a correção não soma.
- **Validação**: litros 0–80 por vaca (acima de 80 exige `confirmarAcima: true`), tanque ≥ 0;
  data não futura; vaca com lactação aberta na data; turno ≤ ordenhas por dia da configuração.

## R6. Carência: cadastro de produtos e prazo por tratamento

- **Decision**: tabelas do Leite: `produtos_leite` (nome, `carenciaLeiteDias`, ativo; nome único
  por fazenda sem acento e sem maiúscula) e `carencias_leite` (tratamentoId único, animalId,
  produtoId, data do tratamento, `carenciaDias` copiada, `dataFim` = data + dias). O tratamento
  do pacote inicial **não muda de tabela**: o gancho `tratamentoGravado`, com o Leite ATIVO e
  animal fêmea, procura o produto pelo nome normalizado; sem cadastro → 422
  `{ codigo: 'PRODUTO_SEM_CADASTRO', produto }` (a tela abre o cadastro rápido e repete). Na
  correção do tratamento, a carência é recalculada (novo produto ou nova data); carência 0 não
  cria linha.
- **Leite descarte**: a vaca está em carência na data D se existe `carencias_leite` com
  `data <= D <= dataFim` (vale a maior, FR-016). Ao gravar ordenha, `descarte` é calculado no
  servidor. Quando uma carência muda, as ordenhas da vaca entre a menor e a maior data afetada
  têm `descarte` recalculado na mesma transação.
- **Rationale**: escolha do dono (Q3: cadastro de produtos); o tratamento guarda o prazo do dia
  (FR-015a); a regra fica no backend.
- **Alternatives considered**: coluna `carencia` em `tratamentos` (pacote base passaria a saber
  de leite); calcular descarte só na leitura (relatórios mais lentos e mais complexos).

## R7. Secagem

- **Decision**: tabela `secagens` (lactacaoId, data, observação, auditoria e cancelamento).
  Registrar = fechar a lactação com `fim = data`, motivo `SECAGEM`; cancelar (com motivo) =
  reabrir, se não houver lactação mais nova. Secagem planejada = previsão de parto − prazo
  (`configuracoes_leite.prazoSecagemDias`, padrão 60), usando `SituacaoService.previsoesParto` do
  pacote inicial (o Leite pode importar o base). "A secar" = planejada ≤ hoje + janela (padrão 15),
  atrasadas primeiro.
- **Rationale**: FR-019 a FR-021, reaproveita a previsão do FR-018 da spec 001.

## R8. Configurações do Leite

- **Decision**: tabela `configuracoes_leite` (fazendaId PK, `modo POR_VACA | TANQUE`,
  `ordenhasPorDia 1–3`, `prazoSecagemDias 30–90`, `janelaSecarDias 1–60`), criada com padrão
  (POR_VACA, 2, 60, 15) na primeira leitura. Só o dono altera. Mudar o modo vale para os próximos
  lançamentos; cada ordenha guarda o seu tipo.

## R9. Entregas, preço e papéis

- **Decision**: `entregas_leite` (data, `litros decimal(8,1)`, `precoLitroCentavos` nulo,
  observação, auditoria, cancelamento) e `analises_leite` (mês `AAAA-MM`, entregaId nulo, CCS e
  CBT inteiros em mil, gordura e proteína `decimal(4,2)`, auditoria, cancelamento). Preço por
  rota própria `@Roles(DONO)` (por entrega ou por mês, aplicando a todas as não canceladas do mês).
  As respostas das rotas de leitura passam por `semValores()` quando o papel é FUNCIONARIO: tiram
  `precoLitroCentavos`, `valorCentavos` e totais em reais. Um teste de papéis confere as rotas de
  preço e que a resposta ao funcionário não tem campo de dinheiro.
- **Rationale**: FR-002 (Q2: igual ao Financeiro) e SC-006 do Financeiro estendido ao Leite.

## R10. Relatórios

- **Decision**: agregação em SQL por `data` (diário) e `to_char(data,'YYYY-MM')` (mensal), com
  `para_tanque = soma(litros) onde não descarte` e `descartado`. Vacas em lactação por dia =
  lactações abertas naquela data (`inicio <= d e (fim is null ou fim >= d)`), via
  `generate_series`. Curva da vaca: soma por data da lactação, com DEL. Índice
  `ordenhas(fazenda_id, data)`. Período diário máximo 92 dias; mensal 12 (máximo 36).
- **Rationale**: FR-026 a FR-029, SC-006 (≈ 73 mil linhas por ano para 100 vacas e 2 ordenhas).

## R11. Gráficos compartilhados

- **Decision**: `GraficoMensal` e `GraficoLinha` saem de `frontend/src/modulos/financeiro/graficos/`
  para `frontend/src/components/graficos/` e são usados pelos dois módulos. Sem biblioteca nova.
- **Rationale**: um módulo não importa outro (D6); constituição VI.

## R12. Tela da ordenha (curral)

- **Decision**: uma vaca por vez em destaque (brinco grande, nome, DEL, litros da ordenha
  anterior), campo numérico com `inputmode="decimal"` e foco automático, botões "Gravar e
  próxima" e "Pular"; abaixo, a lista do turno com situação (lançada, pulada, faltando). Vaca em
  carência aparece com faixa vermelha "Leite descarte até DD/MM" antes do campo. Turno padrão pela
  hora (antes das 12 h = 1.º; depois = 2.º; com 3 ordenhas, 3.º depois das 18 h).
- **Rationale**: FR-010, FR-017, FR-031, SC-001 (30 vacas em 5 min = 10 s por vaca).

## R13. Rotas de exemplo da fase 0

- **Decision**: o `ExemploController` do Leite sai; o teste de marcação continua valendo para os
  controllers novos. Com o Leite ativo ou só consulta, `/modulos/leite` abre as telas do módulo.
