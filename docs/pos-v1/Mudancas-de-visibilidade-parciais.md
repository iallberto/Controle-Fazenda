# Controle Fazenda — Mudanças de Visibilidade (parciais)

> Ajustes de **visualização e apresentação** identificados durante o uso do protótipo.
> Este arquivo reúne os itens do levantamento de **19/10/2026** (PDF `mudancas_de_visibilidade_parciais.pdf`) com a situação atual de cada um, e acrescenta novos itens.

| | |
|---|---|
| **Levantamento original** | 19/10/2026 |
| **Última atualização** | 29/10/2026 |
| **Status geral** | Parte aplicada · restante e novos itens ficam para a fase de reestilização |
| **Legenda** | ✅ Feito · 🔶 Parcial · ⬜ Pendente · 🔎 Em estudo |

---

## 1. Itens do levantamento de 19/10/2026

| # | Item | Situação |
|---|---|---|
| V1 | Exibir o brinco como **"Brinco #0001"** em vez do número solto (listas, detalhe, mãe da cria, tela de criação) | 🔶 Aplicado no Manejo, no detalhe do animal (título, mãe e crias) e na tela de QR codes. Falta revisar as demais telas |
| V2 | Datas em **dia/mês/ano** em vez de ano-mês-dia | 🔶 Aplicado no detalhe do animal (nascimento, partos, pesagens, tratamentos e reemissão). Falta listas, relatórios e demais telas |
| V3 | Mensagem de confirmação após os botões **"Salvar"** com melhor formatação (hoje "tudo jogado e grudado") | ⬜ Pendente |

## 2. Itens identificados depois

| # | Item | Situação |
|---|---|---|
| V4 | **Sexo** exibido como "Fêmea" / "Macho" em vez de F / M | 🔶 Aplicado no detalhe do animal e no Manejo |
| V5 | **Formatadores centralizados:** categoria (`MATRIZ` → "Matriz"), status (`ATIVO` → "Ativo") e origem (`NASCIDO_FAZENDA` → "Nascido na fazenda") ainda aparecem em formato cru em várias telas. Reunir tudo em um único arquivo de formatadores, junto com data e sexo | ⬜ Pendente |
| V6 | **Menu recolhível ("hambúrguer") e layout responsivo** | 🔎 Em estudo (ver seção 3) |

---

## 3. V6 — Menu recolhível e responsivo (em estudo)

**Situação atual:** o menu fica no topo da página, inclusive em celular. Com cerca de 10 itens, ocupa a tela ou quebra em várias linhas.

**Proposta:** no modelo "hambúrguer", com os itens escondidos à esquerda e exibidos após o toque. Reduz a poluição da tela e segue o padrão que as pessoas já conhecem de outros aplicativos.

### Decisões propostas *(a confirmar na implementação)*

- **Responsivo:** em tela grande, o menu pode ficar fixo na lateral. Só vira hambúrguer abaixo de uma largura de referência (cerca de 768 px).
- **Atalho do Manejo sempre visível:** a tela de manejo (brete) é usada no curral, com pouco tempo e mão suja. Ela não deve ficar escondida atrás do menu. Manter um atalho fixo para **Manejo** na barra do topo, ao lado do botão do menu.
- **Botão do menu grande**, para toque com luva ou mão suja (mínimo de cerca de 44 px).
- **Fechamento:** o menu fecha ao escolher um item, ao tocar fora dele e ao apertar Esc.
- **Perfis:** o item **Usuários** continua visível só para o dono.
- **Página atual:** destacar o item da página em que a pessoa está.
- **Acessibilidade:** botão com `aria-label` e `aria-expanded`.

### Questões em aberto

| # | Questão |
|---|---|
| Q1 | Funcionário deve abrir direto no Manejo depois do login, em vez do painel inicial? |
| Q2 | A partir de qual largura o menu passa a ser fixo na lateral? Testar no celular da fazenda antes de fixar o valor |

### Cenários de teste (critérios de aceite)

- [ ] Em tela de celular, o menu aparece recolhido e abre ao tocar no botão.
- [ ] Ao escolher um item, o menu fecha e a página muda.
- [ ] Tocar fora do menu ou apertar Esc fecha o menu.
- [ ] O atalho do Manejo permanece visível com o menu fechado.
- [ ] Em tela larga, a navegação aparece sem precisar do botão.
- [ ] Funcionário não vê o item Usuários; dono vê.
- [ ] O item da página atual aparece destacado.

---

## 4. Relação com os demais documentos

| Item | Relaciona-se com |
|---|---|
| V1 a V5 | Fase de **reestilização e usabilidade**, prevista após o M17 |
| V6 | Mesma fase; também com o requisito de layout para celular (requisitos não funcionais do enunciado) e com a tela de manejo (M3) |

> **Fora de escopo por ora:** implementação do V6. Por enquanto é só estudo, registrado para a fase de reestilização.
