# Controle Fazenda — Avaliação Pós-Versão 1

> Melhorias de usabilidade, design e domínio identificadas **após o uso da Versão 1 (MVP)**.
> A V1 foi construída a partir do enunciado; este documento registra o que o uso real mostrou.

| | |
|---|---|
| **Origem** | Uso da V1 em protótipo (ainda sem teste em campo) |
| **Documento de apoio** | `MUDANÇAS_DE_USABILIDADE_E_DESIGN.pdf` (15 itens originais) |
| **Status** | Decisões tomadas · implementação pendente |
| **Legenda** | 🔴 Alta · 🟡 Média · 🟢 Baixa · ⏸️ Adiado |

---

## 1. Resumo executivo

A V1 cobriu o ciclo reprodutivo, mas o uso revelou três pontos centrais:

1. **Identificação no manejo:** o código do QR (`d9459e89`) é inviável de digitar no curral. Passa a existir um **número sequencial curto por fazenda**, que é o próprio **brinco** (código unificado).
2. **Peso é dado essencial:** sobe da V2 para a **V1 estendida**. A fazenda tem balança.
3. **O manejo é em lote:** tratamentos e pesagens ocorrem com o lote inteiro, com exceções pontuais. Surge a **sessão de manejo rastreável**.

Além disso: regras de domínio (sexo × categoria), responsável pela aplicação sem digitação, pasto no cadastro, relatórios por tipo e identidade visual.

---

## 2. Decisões tomadas

| # | Decisão | Motivo |
|---|---|---|
| D1 | **Código unificado:** brinco = código do QR. No banco, o identificador real é UUID; ao usuário é exibido o **número sequencial curto por fazenda** (`UNIQUE (fazenda_id, numero)`) | Evita dois números por animal; digitável no curral; menos retrabalho no backend |
| D2 | **Peso entra na V1** (pesagem simples, em kg, exibição em @) | Fazenda possui balança; dado crítico |
| D3 | **Categorias condicionadas ao sexo**, incluindo **garrote** e **boi** | Regra de domínio; usadas nas versões seguintes |
| D4 | **Veterinário sem login.** Cadastro de veterinários usado apenas na combo "aplicado por", feito por **dono ou funcionário**, com registro de auditoria | Simplicidade; histórico exato sem gerenciar acessos externos |
| D5 | **Auditoria mínima** (quem criou/alterou e quando), sem log completo antes/depois | "Fazer o necessário" |
| D6 | **Tratamento em lote rastreável:** um tratamento por animal; exceções registradas com motivo opcional | O alerta de "próximo tratamento" não pode sumir |
| D7 | **Pasto informado no cadastro** do animal/parto, gerando a movimentação inicial | Evita retrabalho em fazendas com rebanho já distribuído |
| D8 | **Foto do animal:** adiada | Decisão técnica de armazenamento pendente |
| D9 | **Tela de manejo (brete)** construída agora, já com peso | Ponto central do uso no curral |
| D10 | **Reemissão por perda do brinco:** o animal recebe **novo número** e o **número antigo fica no histórico** (ex.: "antes era #0042") | Preserva o histórico e evita que o peão se perca no curral |

> **Nota sobre o item 10 original** (usuário veterinário com login): substituído por D4. Não existirá papel `VETERINARIO` por ora. O `aplicadoPor` aponta para um cadastro de pessoa, o que permite evoluir para login no futuro sem retrabalho.

---

## 3. Melhorias por prioridade

### 🔴 Prioridade alta

- [ ] **M1 — Código simplificado (orig. 9)**
  Número sequencial por fazenda, gerado junto ao lote de QR codes (ex.: `#0001` a `#0100`). Impresso em destaque ao lado do QR. UUID permanece interno e na URL do QR.
- [ ] **M2 — Registro de peso (orig. 13)**
  Entidade `Pesagem` (animal, peso em kg, data, quem pesou, quem lançou). Exibição em @ conforme valor de referência das Configurações. GMD calculado entre pesagens. **Opcional por fazenda** (configuração "possui balança").
- [ ] **M3 — Tela de manejo (brete)**
  Fluxo: **brinco → peso → tratamento → pasto/categoria**, com poucos toques. Aceita sessão em lote (ver M4).
- [ ] **M4 — Sessão de manejo em lote rastreável**
  Grupo (pasto/categoria) → todos marcados por padrão → desmarca-se exceções → confirma. Um registro por animal tratado; exceções guardadas com motivo.
- [ ] **M5 — Sexo × categoria (orig. 1 e 2)**
  Regras no **backend** (service/DTO) e espelhadas no front. Parto apenas para matriz.

### 🟡 Prioridade média

- [ ] **M6 — "Aplicado por" sem digitação (orig. 4 e 10)**
  Seleção do tipo (funcionário / veterinário / dono) e combo com os cadastrados. Se o usuário logado é dono, vem preenchido.
- [ ] **M7 — Cadastro de veterinários (D4)**
  Nome, CRMV opcional, ativo/inativo. Criável por dono ou funcionário. Nunca excluído, apenas inativado.
- [ ] **M8 — Auditoria mínima (D5)**
  `criadoPor`, `criadoEm`, `atualizadoPor`, `atualizadoEm` nos registros principais. Em tratamento e pesagem, separar **quem aplicou/pesou** de **quem lançou**.
- [ ] **M9 — Pasto no cadastro (orig. 6)**
  Campo de pasto no cadastro de animal e no parto (cria), gerando `MovimentacaoPasto` inicial na mesma transação.
- [ ] **M10 — Relatórios por tipo (orig. 11)**
  Tela inicial pergunta o tipo: por animal · por tipo de animal · tratamentos realizados · **próximos tratamentos** · por raça. Datas só depois.
- [ ] **M11 — Dados gerais do animal (orig. 3)**
  Exibir mãe (quando houver) e origem "Comprado".

### 🟢 Prioridade baixa

- [ ] **M12 — Vincular código após perda do brinco (orig. 5)**
  Separar na interface "vincular código a animal novo" de "reemitir por perda/extravio", com texto explicativo. Na reemissão, o número antigo é guardado no histórico do animal (D10) e a busca por ele redireciona ao número atual.
- [ ] **M13 — Confirmação de senha (orig. 7)**
- [ ] **M14 — Som de notificação (orig. 8)**
  Seleção e reprodução do som já previsto nas Configurações.
- [ ] **M15 — Títulos das páginas (orig. 14)** — substituir "frontend".
- [ ] **M16 — Logo e favicon (orig. 15)**

### ⏸️ Adiado

- **Foto do animal (orig. 12):** definir onde armazenar (volume Docker ou serviço de objetos) e compressão no celular.

---

## 4. Impacto na modelagem

| Entidade | Mudança |
|---|---|
| `Animal` | Novo campo `numero` (sequencial por fazenda, único); `sexo` restringe `categoria`; novas categorias **garrote** e **boi** |
| `CodigoIdentificacao` | Passa a refletir o número sequencial; unificado ao brinco |
| `HistoricoNumero` *(nova)* | animal, número anterior, número novo, data, motivo, quem reemitiu. Alimenta o "antes era #0042" |
| `Pesagem` *(nova)* | animal, pesoKg, data, pesadoPor, lancadoPor, observação |
| `Veterinario` *(nova)* | nome, crmv (opcional), ativo, criadoPor |
| `Tratamento` | `aplicadoPor` deixa de ser texto: tipo + referência (usuário ou veterinário); `lancadoPor` |
| `SessaoManejo` *(nova)* | data, tipo (tratamento/pesagem), produto, aplicador, pasto de origem |
| `ItemSessaoManejo` *(nova)* | sessão, animal, aplicado (sim/não), motivo da exceção |
| `ConfiguracaoFazenda` | Novo campo "possui balança" |
| Registros principais | Colunas de auditoria mínima |

Como o protótipo não tem dados de campo, **não há migração de tratamentos antigos**.

---

## 5. Regras de negócio novas

1. Fêmea: **novilha** (inclui a bezerra, fêmea jovem) **ou matriz**. Macho: **bezerro, garrote, boi ou touro**.
2. Somente **matrizes** possuem histórico de parto.
3. O número do brinco é **único por fazenda** (garantido pelo banco).
4. Em sessão de manejo, **nenhum animal desmarcado recebe registro de aplicação**; a exceção fica gravada e o alerta de próximo tratamento **continua pendente**.
5. Veterinários e usuários **nunca são excluídos**, só inativados.
6. Peso é armazenado em **kg**; @ é apenas exibição, calculada pelo valor de referência da categoria.
7. Na reemissão de código, o número antigo é **desativado, nunca reaproveitado**, e permanece consultável no histórico do animal.
8. Ao buscar um **número antigo** (reemitido), o sistema **encontra o animal e avisa o número atual** (ex.: "agora é o #0187"), nunca responde "não encontrado".

---

## 6. Questões em aberto

| # | Questão |
|---|---|
| Q1 | Offline e concorrência entre funcionários (já levantado): tratar como épico próprio, pois afeta a geração de números e a sessão de manejo em lote |
| Q2 | Edição de uma sessão de manejo já confirmada: permitida? Com que auditoria? |

---

## 7. Cenários de teste (critérios de aceite)

**Código e brinco**
- [ ] Gerar lote de 100: numeração sequencial sem lacunas, por fazenda.
- [ ] Duas fazendas distintas podem ter o mesmo número sem conflito.
- [ ] Número duplicado na mesma fazenda é rejeitado pelo banco (409).
- [ ] QR escaneado resolve pelo UUID; busca manual resolve pelo número.
- [ ] Reemissão: o animal passa a ter o novo número e o antigo aparece no histórico ("antes era #0042").
- [ ] Número antigo desativado não é reaproveitado em novos lotes.
- [ ] Busca pelo número antigo encontra o animal e exibe o aviso "agora é o #0187".
- [ ] Busca por número que nunca existiu continua retornando "não encontrado" (404).

**Sexo × categoria**
- [ ] Fêmea com categoria `TOURO` é rejeitada (400).
- [ ] Macho com categoria `MATRIZ` é rejeitado (400).
- [ ] Registrar parto para animal que não é matriz é rejeitado.

**Peso**
- [ ] Pesagem em kg exibe @ corretamente (ex.: 450 kg com referência de 15 kg = 30 @).
- [ ] GMD calculado entre duas pesagens em datas diferentes.
- [ ] Fazenda sem balança: campo de peso opcional, sem erro.

**Tratamento em lote**
- [ ] Lote com 20 animais e 2 exceções cria 18 tratamentos.
- [ ] Os 2 animais de exceção continuam com tratamento **pendente** nos alertas.
- [ ] Motivo da exceção fica registrado e consultável.
- [ ] Recorrência calcula a próxima data para cada animal tratado.

**Aplicador e auditoria**
- [ ] Dono logado: "aplicado por" vem preenchido com ele.
- [ ] Funcionário e dono conseguem cadastrar veterinário; o registro mostra quem cadastrou.
- [ ] Veterinário inativo não aparece na combo, mas aparece nos tratamentos antigos.
- [ ] `lancadoPor` difere de `aplicadoPor` quando o funcionário lança para o veterinário.

**Pasto**
- [ ] Cadastrar animal com pasto cria a movimentação inicial na mesma transação.
- [ ] Falha na criação da movimentação desfaz o cadastro do animal.

---

## 8. Ordem sugerida de implementação

1. M5 (regras de domínio) e M11 (exibição), base sem dependências.
2. M1 (código/brinco unificado), pois impacta cadastro, QR e telas.
3. M9 (pasto no cadastro) e M8 (auditoria mínima).
4. M2 (peso) e M7 (veterinários).
5. M6 e M4 (aplicado por + sessão de manejo em lote).
6. M3 (tela de manejo reunindo tudo).
7. M10 (relatórios por tipo) e M12–M16 (acabamento e identidade visual).

---

## 9. Fora de escopo nesta etapa

Foto do animal · login de veterinário · log completo de alterações (antes/depois) · leitor de brinco eletrônico · integração com balança eletrônica.
