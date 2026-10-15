# Controle Fazenda — Pós-Versão 1: Complemento 01

> Adendos à avaliação pós-V1, identificados **depois** da publicação de [`MELHORIAS_POS_V1.md`](./MELHORIAS_POS_V1.md).
> O documento original permanece inalterado; este arquivo continua a numeração de melhorias (M17 em diante).

| | |
|---|---|
| **Documento base** | `MELHORIAS_POS_V1.md` (M1–M16, decisões D1–D10) |
| **Origem** | Novo uso da V1 em protótipo |
| **Status** | Itens registrados · diagnóstico de M17 pendente |
| **Legenda** | 🔴 Alta · 🟡 Média · 🟢 Baixa |

---

## 1. Resumo

Dois pontos ligados ao fluxo de **códigos/brincos** (M1 do documento base):

1. **Os QR codes gerados não estão acessíveis para conferência e impressão.** O requisito 15 da V1 previa o PDF para impressão; na prática, o usuário não os encontra. Tratado como **falha da V1**, não só melhoria.
2. **No cadastro do animal, o código deve ser escolhido por seleção** entre os disponíveis, em vez de digitado, reduzindo erros e atrito no curral.

---

## 2. Melhorias

### 🔴 M17 — QR codes acessíveis para conferência e impressão

**Problema observado:** após gerar um lote, o usuário não encontra os QR codes para conferir ou imprimir.

**Diagnóstico pendente** (define o tamanho da correção):

- [ ] O PDF **não é gerado/baixado** ao criar o lote (falha de implementação), ou
- [ ] O PDF é gerado, mas **não existe tela para rever os lotes** depois (falha de fluxo).

**Escopo proposto:**

- [ ] **Lista de lotes gerados:** data, quantidade, faixa de números (ex.: `#0001–#0100`), contagem de disponíveis e vinculados.
- [ ] **Visualização do lote:** grade com cada QR e o **número em destaque** ao lado, para conferência visual.
- [ ] **Download/reimpressão do PDF** do lote completo.
- [ ] **Reimpressão apenas dos códigos disponíveis** (útil quando parte do lote já foi usada).
- [ ] Manter o **aviso de impressão em material plástico/resistente às intempéries** (requisito 15 da V1).
- [ ] No PDF, o **número curto** (código = brinco, decisão D1) aparece grande junto ao QR, legível de longe.

**Cenários de teste**

- [ ] Gerar lote de 100 disponibiliza o PDF para download imediatamente.
- [ ] Reabrir a tela depois lista o lote criado, com faixa e contagens corretas.
- [ ] Visualização do lote mostra 100 QRs, cada um com seu número.
- [ ] Reimpressão de "somente disponíveis" exclui os já vinculados.
- [ ] QR do PDF aponta para `/f/{fazenda}/animal/{codigo}` e resolve pelo UUID.
- [ ] Lotes de uma fazenda não aparecem para outra (isolamento de dados).

---

### 🟡 M18 — Seleção do código no cadastro do animal

**Problema observado:** no cadastro, o código do brinco é digitado, o que gera erro e retrabalho.

**Comportamento desejado:** após gerados os códigos, o usuário **seleciona** o código (entre os **disponíveis**) que corresponde ao brinco colocado no animal.

**Propostas de detalhe** *(a confirmar)*:

- [ ] **Campo filtrável:** lista só com códigos de status **disponível**, filtrada enquanto se digita (ex.: "0187" mostra só ele). Evita rolar uma lista longa.
- [ ] **Sugestão do próximo código disponível** pré-selecionado, já que os brincos costumam ser aplicados em ordem.
- [ ] **Validação no backend ao salvar:** se o código já foi vinculado por outro usuário no intervalo, responder **409** e atualizar a lista, sem confiar apenas no que a tela carregou.
- [ ] Ao vincular, o código passa de **disponível** para **vinculado** na mesma transação do cadastro do animal.
- [ ] Evolução futura (já prevista na V3): **escanear o QR do brinco** pela câmera para preencher o código.

**Regras de negócio**

1. Apenas códigos com status **disponível** podem ser escolhidos.
2. Código escolhido torna-se **vinculado** ao salvar; falha no cadastro do animal **não** o consome.
3. Código desativado por reemissão (D10) **nunca** reaparece na lista de disponíveis.

**Cenários de teste**

- [ ] A lista mostra somente códigos disponíveis da fazenda do usuário.
- [ ] Filtro por parte do número retorna os códigos correspondentes.
- [ ] Salvar o animal muda o código para vinculado.
- [ ] Falha na criação do animal mantém o código disponível (rollback).
- [ ] Dois usuários escolhendo o mesmo código: o segundo recebe 409 e a lista é atualizada.
- [ ] Código desativado por reemissão não aparece na lista.
- [ ] Sem códigos disponíveis: a tela orienta a gerar um novo lote (link para M17).

---

## 3. Impacto na modelagem

| Entidade | Mudança |
|---|---|
| `LoteCodigos` *(nova ou ampliada)* | data, quantidade, faixa inicial/final, quem gerou. Permite listar e reimprimir lotes |
| `CodigoIdentificacao` | Já possui status (disponível/vinculado/desativado); passa a vincular ao lote de origem |

---

## 4. Relação com o documento base

| Item | Relaciona-se com |
|---|---|
| M17 | M1 (código simplificado) · requisito 15 da V1 |
| M18 | M1 · M12 (vincular código após perda do brinco) · D1 e D10 |

**Ordem sugerida:** M17 antes de M18 (sem códigos acessíveis e conferidos, a seleção no cadastro perde o sentido), ambos junto ou logo após M1.
