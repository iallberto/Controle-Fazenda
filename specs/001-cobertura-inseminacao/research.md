# Research: Cobertura e Inseminação no Pacote Inicial

**Feature**: [spec.md](./spec.md) · **Data**: 2026-11-03

Decisões técnicas tomadas antes do desenho. Nenhum item ficou como NEEDS CLARIFICATION: o
contexto técnico é o do projeto existente e as dúvidas de negócio foram resolvidas na spec.

---

## R1. Onde fica o código

- **Decision**: novo módulo Nest `backend/src/reproducao/`, sem `@Modulo` (é pacote inicial), com
  entidades próprias: estação, exposição, sêmen, inseminação e diagnóstico. No frontend, telas em
  `frontend/src/pages/reproducao/`, um grupo "Reprodução" no menu e os relatórios novos dentro da
  tela de relatórios por tipo que já existe.
- **Rationale**: segue a organização atual (um módulo Nest por assunto) e o princípio VI; deixa a
  reprodução isolada, pronta para o Leite depender dela.
- **Alternatives considered**: espalhar pelos módulos `animal` e `parto` (acopla demais e incha
  serviços já grandes); criar já a pasta `modulos/` da fase 0 (é pacote inicial, não módulo pago).

## R2. Uma tabela por tipo de evento, não uma tabela "cobertura" genérica

- **Decision**: `estacoes_monta` + `exposicoes_monta` (monta natural), `semens` + `inseminacoes`
  (IA/IATF) e `diagnosticos_gestacao` (que também guarda a perda de gestação, pelo campo
  `resultado`). A "cobertura mais recente" de uma fêmea é calculada juntando exposições e
  inseminações.
- **Rationale**: cada evento tem campos diferentes (período × data exata; touro × sêmen); uma
  tabela genérica com muitas colunas opcionais esconderia as regras e dificultaria validar.
- **Alternatives considered**: tabela única `coberturas` com tipo (polimórfica): mais simples de
  consultar, mas fraca para validar e para evoluir o Leite.

## R3. Status reprodutivo guardado no animal, recalculado por eventos

- **Decision**: o campo `statusReprodutivo` que já existe no animal (Prenha, Vazia, Lactante, nulo)
  continua sendo a fonte para listas e filtros. Ele é atualizado na mesma transação de cada evento
  (diagnóstico, perda, parto) e **recalculado** a partir do evento válido mais recente quando um
  registro é editado ou cancelado pelo dono. "Exposta" e "inseminada" não viram status: são
  situações derivadas das exposições e inseminações em aberto (FR-027).
- **Rationale**: o status já é usado nas telas; guardar evita recalcular o rebanho inteiro a cada
  lista, e o recálculo pontual mantém a consistência depois de correções.
- **Alternatives considered**: calcular o status sempre na leitura (consistente, porém caro em
  listas e relatórios); novos valores no enum para "exposta/inseminada" (misturaria fato e
  situação temporária).

## R4. Aptidão à cobertura calculada na leitura

- **Decision**: apta = ativa, fêmea, categoria Matriz ou Novilha, não Prenha, e último parto
  (se houver) há 45 dias ou mais (FR-003). Função única no backend, usada ao montar a estação, na
  inseminação e no relatório de vazias.
- **Rationale**: depende da data de hoje, então não pode ser guardada.

## R5. Previsão de parto calculada na leitura

- **Decision**: função de domínio `calcularPrevisaoParto` aplicada à fêmea prenhe, na ordem do
  FR-018: (1) inseminação → data + gestação média; (2) diagnóstico com idade gestacional → data do
  diagnóstico − idade + gestação média; (3) senão, meio do período de exposição + gestação média.
  O período de exposição é a união das exposições não canceladas anteriores ao diagnóstico (do
  início mais antigo ao fim mais recente; exposição ainda aberta termina na data do diagnóstico).
  A resposta inclui a base usada (`INSEMINACAO`, `TOQUE`, `ESTACAO`). Gestação média da raça da
  mãe; sem raça ou sem valor, 285 dias.
- **Rationale**: a previsão muda quando uma estação é encerrada ou um registro é corrigido;
  calcular na hora evita previsões desatualizadas. O rebanho tem centenas de animais, então
  calcular em memória é barato.
- **Alternatives considered**: gravar a previsão no diagnóstico (desatualiza ao encerrar a
  estação ou corrigir registros).

## R6. Pai da cria e candidatos

- **Decision**: ao registrar o parto, o sistema busca as coberturas não canceladas da mãe cuja
  concepção estimada caia na janela `data do parto − gestação média ± 21 dias` (um ciclo de cio).
  Os candidatos (touros do rebanho ou sêmens) são gravados em `parto_candidatos_pai`. Com um único
  candidato, o pai é preenchido nas crias: `paiId` (touro do rebanho, coluna que já existe) ou o
  novo `paiSemenId` (sêmen, cujo touro não está no rebanho). Com mais de um, o pai fica vazio e o
  dono escolhe depois entre os candidatos (FR-021). A inseminação mais próxima da janela também é
  gravada no parto (`inseminacaoId`), quando houver.
- **Rationale**: guardar os candidatos no momento do parto deixa a decisão estável e auditável,
  mesmo que estações sejam editadas depois.
- **Alternatives considered**: calcular candidatos sempre na leitura (instável); exigir que o
  usuário escolha o pai no parto (contraria o objetivo de não digitar).

## R7. Fim automático de exposições e estações

- **Decision**: uma função `encerrarExposicoesPorSaida(manager, animalIds, data, pastoDestinoId?)`
  no serviço de reprodução, chamada **dentro das transações já existentes** de mover animal
  (individual e em lote) e de mudar status (venda, morte, descarte); o parto não encerra
  exposições. Fêmea que
  sai do pasto da estação tem a exposição encerrada na data; touro que sai do pasto ou do rebanho
  encerra a estação inteira (FR-007).
- **Rationale**: as saídas já acontecem nesses pontos; tratar ali garante que não há exposição
  "fantasma" e mantém tudo na mesma transação (princípio II).
- **Alternatives considered**: tarefa agendada que fecha exposições (atraso e complexidade);
  calcular o fim na leitura cruzando movimentações (consultas complexas e frágeis).

## R8. Baixa de dose do sêmen

- **Decision**: `UPDATE semens SET doses = doses - 1 WHERE id = :id AND doses > 0` dentro da
  transação da inseminação; zero linhas afetadas → 409 "sêmen sem doses" (FR-011). Cancelar uma
  inseminação devolve a dose.
- **Rationale**: mesmo padrão atômico já usado na reserva de códigos de brinco.

## R9. Correção e cancelamento só pelo dono

- **Decision**: colunas `cancelado`, `canceladoEm`, `canceladoPorId`, `motivoCancelamento` em
  estação, exposição, inseminação e diagnóstico; rotas de edição e cancelamento com
  `@Roles(DONO)`. Registros cancelados ficam no histórico e saem de cálculos, listas e
  candidatos. Após editar ou cancelar, o status reprodutivo da fêmea é recalculado (R3).
- **Rationale**: FR-026 e princípio III (nada é excluído, tudo é auditado).

## R10. Idade gestacional

- **Decision**: guardada em dias inteiros (`idadeGestacionalDias`). A tela tem dois campos, meses e
  dias; a conversão (meses × 30 + dias) e a exibição de volta ("3 meses e 22 dias") ficam nos
  formatadores do frontend. A API recebe e devolve dias.
- **Rationale**: um único número simplifica cálculo e validação; a forma de falar do veterinário
  fica na tela, onde importa.

## R11. Parto de novilha e status após o parto

- **Decision**: `PartoService.create` passa a aceitar Matriz e Novilha; a Novilha vira Matriz na
  mesma transação (FR-031). O status da mãe vira Lactante com cria viva e Vazia em natimorto
  (FR-022).
- **Rationale**: mudança pequena no serviço existente, coberta pelos testes atuais mais casos novos.

## R12. Taxa de prenhez

- **Decision**: por estação (e por touro, que é o mesmo número já que cada estação tem um touro) e
  por sêmen: entre as fêmeas expostas/inseminadas e não canceladas, considera o primeiro
  diagnóstico não cancelado feito depois do início da cobertura e em até 300 dias. Taxa =
  prenhes ÷ (prenhes + vazias). Fêmeas sem diagnóstico, inclusive as que saíram do rebanho antes
  dele, ficam fora do denominador e aparecem contadas à parte ("sem diagnóstico", "saíram").
- **Rationale**: FR-028 e SC-004 (precisa bater com a contagem manual).

## R13. Schema

- **Decision**: as tabelas novas entram pelo `synchronize` de desenvolvimento, como as anteriores.
  A troca para migrations (constituição, restrições técnicas) acontece na fase 0, antes do
  primeiro módulo pago, e vai gerar a migration inicial já com estas tabelas.
- **Rationale**: a constituição exige migrations antes do primeiro módulo pago; esta feature é do
  pacote inicial e ainda não há clientes em produção.

## R14. Telas no celular

- **Decision**: estação e diagnóstico em lote reaproveitam o padrão do Manejo em lote (grupo →
  lista marcada → exceções com motivo). No diagnóstico em lote, cada linha tem dois botões grandes
  (Prenhe / Vazia, 44 px) e um campo opcional de idade gestacional; o Manejo ganha um bloco
  "Reprodução" com a situação e o registro rápido de diagnóstico.
- **Rationale**: princípio IV e SC-001/SC-002 (50 fêmeas em menos de 2 e 5 minutos).
