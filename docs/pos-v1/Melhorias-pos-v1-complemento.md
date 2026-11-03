# Controle Fazenda — Pós-Versão 1: Complemento 01

> Adendos à avaliação pós-V1, identificados **depois** da publicação de [`MELHORIAS_POS_V1.md`](./MELHORIAS_POS_V1.md).
> O documento original permanece inalterado; este arquivo continua a numeração de melhorias (M17 em diante).

| | |
|---|---|
| **Documento base** | `MELHORIAS_POS_V1.md` (M1–M16, decisões D1–D10) |
| **Origem** | Novo uso da V1 em protótipo |
| **Status** | M18 concluído · M17 concluído exceto QR/PDF, que aguardam o domínio definitivo |
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

- [x] O PDF **não é gerado/baixado** ao criar o lote (falha de implementação), ou
- [x] O PDF é gerado, mas **não existe tela para rever os lotes** depois (falha de fluxo).

> **Diagnóstico (03/11/2026):** as duas coisas. Não havia PDF nem tela de conferência. A tela de QR codes foi criada (lista, filtros e impressão dos números); o QR e o PDF entram quando houver domínio definitivo, porque o link fica gravado na etiqueta.

**Escopo proposto:**

- [x] **Lista de lotes gerados:** atendida pelo filtro por **faixa de números e status** na tela de QR codes (ex.: `#0001` a `#0100`, só disponíveis), com paginação. Ao gerar um lote, a tela já mostra a faixa criada.
- [ ] **Visualização do lote:** grade com cada QR e o **número em destaque** ao lado. ⏸️ Aguarda o domínio (layout da etiqueta já definido em `Etiqueta-e-consulta-publica.md`).
- [ ] **Download/reimpressão do PDF** do lote completo. ⏸️ Aguarda o domínio e o formato pedido pela gráfica.
- [x] **Reimpressão apenas dos códigos disponíveis:** filtro de status + "Imprimir todos" imprime só o que está filtrado.
- [x] Manter o **aviso de impressão em material plástico/resistente às intempéries** (requisito 15 da V1).
- [x] O **número curto** aparece grande junto ao QR: decidido no layout da etiqueta (sem zeros à esquerda, cerca de 16 mm).

**Cenários de teste**

- [ ] Gerar lote de 100 disponibiliza o PDF para download imediatamente. ⏸️ Aguarda o domínio.
- [x] Reabrir a tela depois lista o lote criado, com faixa e contagens corretas (pelo filtro de faixa).
- [ ] Visualização do lote mostra 100 QRs, cada um com seu número. ⏸️ Aguarda o domínio.
- [x] Reimpressão de "somente disponíveis" exclui os já vinculados.
- [x] QR aponta para a página pública e resolve pelo código. **Mudança:** o endereço ficou `/a/{codigo}` (sem a fazenda no caminho), porque o código já é único em todo o sistema.
- [x] Lotes de uma fazenda não aparecem para outra (isolamento de dados).

---

### 🟡 M18 — Seleção do código no cadastro do animal

**Problema observado:** no cadastro, o código do brinco é digitado, o que gera erro e retrabalho.

**Comportamento desejado:** após gerados os códigos, o usuário **seleciona** o código (entre os **disponíveis**) que corresponde ao brinco colocado no animal.

**Propostas de detalhe** *(a confirmar)*:

- [x] **Campo filtrável:** "Buscar código pelo número" filtra a lista enquanto se digita ("0187" e "187" encontram o mesmo código).
- [x] **Sugestão do próximo código disponível** pré-selecionado (o menor número disponível).
- [x] **Validação no backend ao salvar:** a reserva do código é atômica e responde **409** se outro usuário o usou; a tela recarrega a lista.
- [x] Ao vincular, o código passa de **disponível** para **vinculado** na mesma transação do cadastro do animal.
- [ ] Evolução futura (já prevista na V3): **escanear o QR do brinco** pela câmera para preencher o código. ⏸️ Futuro.

**Regras de negócio**

1. Apenas códigos com status **disponível** podem ser escolhidos.
2. Código escolhido torna-se **vinculado** ao salvar; falha no cadastro do animal **não** o consome.
3. Código desativado por reemissão (D10) **nunca** reaparece na lista de disponíveis.

**Cenários de teste**

- [x] A lista mostra somente códigos disponíveis da fazenda do usuário.
- [x] Filtro por parte do número retorna os códigos correspondentes.
- [x] Salvar o animal muda o código para vinculado.
- [x] Falha na criação do animal mantém o código disponível (rollback).
- [x] Dois usuários escolhendo o mesmo código: o segundo recebe 409 e a lista é atualizada.
- [x] Código desativado por reemissão não aparece na lista.
- [x] Sem códigos disponíveis: a tela orienta a gerar um novo lote (link para M17).

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
