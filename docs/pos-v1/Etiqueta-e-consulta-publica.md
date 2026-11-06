# Controle Fazenda — Etiqueta do brinco e consulta pública

> Decisões sobre a etiqueta adesiva colada no brinco e a página que abre quando alguém escaneia o QR code.

| | |
|---|---|
| **Data** | 03/11/2026 |
| **Status** | Página pública implementada · etiqueta definida · PDF para a gráfica pronto (spec 008); falta a folha de teste com o domínio definitivo |
| **Foto de referência** | `docs/brinco-modelo.png` (o número "240" da foto é do fornecedor e não é usado) |

---

## 1. Etiqueta do brinco

| Item | Decisão |
|---|---|
| Área útil do brinco | 60 × 35 mm (parte retangular de baixo) |
| Tamanho da etiqueta | **57 × 32 mm**, com cantos arredondados. A folga de 1,5 mm em cada lado evita que a borda descole |
| Material | Etiqueta adesiva feita por gráfica local, colada no brinco. O brinco é reaproveitado: quando o animal sai do rebanho, a etiqueta é trocada |
| Fundo | Branco, para o QR ter contraste máximo |
| Layout | Número à esquerda, QR de **28 mm** à direita (invertido em 06/11/2026, a pedido do dono do produto) |
| Número | **Sem zeros à esquerda** (`240`, não `0240`), dígitos com cerca de 16 mm. Passa a 4 dígitos só a partir do 1000. As telas do sistema continuam mostrando `#0240`, e a busca aceita as duas formas |
| Conteúdo do QR | **Link da página pública**: `https://<domínio>/a/<código>`. Usa o código aleatório (ex.: `d9459e89`), não o número, para ninguém percorrer o rebanho trocando números |

### Distâncias de leitura

| Uso | Distância |
|---|---|
| Número, a olho, no brete | Legível a 3–5 m |
| QR pelo celular | 20–45 cm. Funciona no brete com a mão estendida; não funciona com o animal em movimento ou de longe |

### Pendências

- [ ] **Domínio definitivo**: fica para a publicação. Nenhuma etiqueta deve ser impressa antes, porque o endereço fica gravado no QR para sempre. Não usar endereço provisório (localhost, subdomínio de teste).
- [x] **Formato do arquivo para a gráfica**: PDF em folha A4 com marcas de corte; a gráfica imprime no adesivo e corta (decisão de 06/11/2026).
- [x] **Geração do QR**: a tela de QR codes gera o PDF A4 para a gráfica (24 etiquetas por folha, marcas de corte), com o QR apontando para `URL_PUBLICA`, que vem do domínio definitivo (spec 008).

---

## 2. Página pública do animal

Endereço: `/a/<código>`, sem login. API: `GET /publico/animal/<código>`.

### O que aparece

| Sempre visível | Recolhido ("ver mais") |
|---|---|
| Nome da fazenda | Histórico de pesagens, com ganho médio diário |
| Brinco, categoria, raça e sexo | Vacinas e tratamentos (produto e data) |
| **Peso atual** (última pesagem) em kg e **em arrobas**, e a data | |
| Idade, nascimento, origem e mãe | |

### Peso em arrobas

As arrobas usam o peso de referência que a fazenda configurou para a categoria do animal, em **Configurações → Peso de referência da arroba** (hoje: Bezerro 12 kg, Novilha e Garrote 13 kg, Matriz, Boi e Touro 15 kg). Sem configuração, vale 15 kg. Uma casa decimal: 1.000 kg de um touro = 66,7 arrobas.

### O que nunca aparece

Quem lançou ou aplicou cada registro · pasto · motivo de saída · observações internas · valores de arroba · identificadores internos.

### Situações

| Situação | O que a página mostra |
|---|---|
| Animal ativo | Os dados acima |
| Vendido, morto ou descartado | "Este animal não faz mais parte do rebanho desta fazenda", sem dados do animal |
| Etiqueta substituída (reemissão) | Aviso para escanear a etiqueta atual |
| Código inexistente ou ainda não vinculado | "Etiqueta não encontrada" |

### Proteções

- O código é validado (8 caracteres hexadecimais) antes de consultar o banco.
- Limite de 30 consultas por minuto por IP, para dificultar varreduras.
- A resposta é montada campo a campo, então um campo novo no cadastro não vaza para a página por engano.

### Prévia no sistema

Na tela de QR codes, cada código vinculado tem o link **"Ver página pública"**, que abre a página como o comprador vai vê-la.
