# Controle Fazenda — Mudanças de Visibilidade (parciais)

> Ajustes de **visualização e apresentação** identificados durante o uso do protótipo.
> Este arquivo reúne os itens do levantamento de **19/10/2026** (PDF `mudancas_de_visibilidade_parciais.pdf`) com a situação atual de cada um, e acrescenta novos itens.

| | |
|---|---|
| **Levantamento original** | 19/10/2026 |
| **Última atualização** | 03/11/2026 |
| **Status geral** | V1, V2, V4, V5 e V6 concluídos · V3 pendente |
| **Legenda** | ✅ Feito · 🔶 Parcial · ⬜ Pendente · 🔎 Em estudo |

---

## 1. Itens do levantamento de 19/10/2026

| # | Item | Situação |
|---|---|---|
| V1 | Exibir o brinco como **"Brinco #0001"** em vez do número solto (listas, detalhe, mãe da cria, tela de criação) | ✅ Em todas as telas: lista de animais, detalhe, Manejo, QR codes e seleção de animal, matriz e código nos formulários |
| V2 | Datas em **dia/mês/ano** em vez de ano-mês-dia | ✅ Detalhe do animal, lista de animais e relatórios |
| V3 | Mensagem de confirmação após os botões **"Salvar"** com melhor formatação (hoje "tudo jogado e grudado") | ⬜ Pendente |

## 2. Itens identificados depois

| # | Item | Situação |
|---|---|---|
| V4 | **Sexo** exibido como "Fêmea" / "Macho" em vez de F / M | ✅ Detalhe do animal, Manejo e lista de animais |
| V5 | **Formatadores centralizados:** categoria (`MATRIZ` → "Matriz"), status (`ATIVO` → "Ativo") e origem (`NASCIDO_FAZENDA` → "Nascido na fazenda") ainda aparecem em formato cru em várias telas. Reunir tudo em um único arquivo de formatadores, junto com data e sexo | ✅ Tudo em `frontend/src/utils/formatadores.ts` (brinco, datas, sexo, categoria, status, origem, parto, papel e status do código). As opções de categoria por sexo também saem de lá, e o Manejo passou a oferecer só as categorias válidas para o sexo do animal |
| V6 | **Menu recolhível ("hambúrguer") e layout responsivo** | ✅ Implementado em `components/Layout.tsx` (ver seção 3) |

---

## 3. V6 — Menu recolhível e responsivo (implementado em 03/11/2026)

**Situação atual:** o menu fica no topo da página, inclusive em celular. Com cerca de 10 itens, ocupa a tela ou quebra em várias linhas.

**Proposta:** no modelo "hambúrguer", com os itens escondidos à esquerda e exibidos após o toque. Reduz a poluição da tela e segue o padrão que as pessoas já conhecem de outros aplicativos.

### Decisões

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
| Q1 | Funcionário deve abrir direto no Manejo depois do login, em vez do painel inicial? **Decidido: não.** Todos abrem no painel; o Manejo fica a um toque pelo atalho fixo. Reavaliar depois do uso no curral |
| Q2 | A partir de qual largura o menu passa a ser fixo na lateral? **Decidido: 768 px.** Ainda vale testar no celular da fazenda |

### Como ficou

- Menu em quatro grupos: **Início** (Painel, Manejo), **Rebanho** (Animais, Pastos, QR codes), **Registrar** (Cadastrar animal, Parto, Tratamento, Pesagem, Mover animal) e **Gestão** (Relatórios, Configurações, Usuários), com o botão **Sair** no fim.
- Os links soltos no topo das telas saíram; a tela de Animais ficou só com a lista e o atalho "Cadastrar animal". Os "Voltar" das telas de formulário e do detalhe do animal continuam, como atalho de contexto.
- No celular, a tabela de animais rola sozinha, sem empurrar a página para os lados.
- Na impressão da faixa de QR codes, o menu e a barra do topo não aparecem.

### Cenários de teste (critérios de aceite)

- [x] Em tela de celular, o menu aparece recolhido e abre ao tocar no botão.
- [x] Ao escolher um item, o menu fecha e a página muda.
- [x] Tocar fora do menu ou apertar Esc fecha o menu.
- [x] O atalho do Manejo permanece visível com o menu fechado.
- [x] Em tela larga, a navegação aparece sem precisar do botão.
- [x] Funcionário não vê o item Usuários; dono vê.
- [x] O item da página atual aparece destacado.

---

## 4. Relação com os demais documentos

| Item | Relaciona-se com |
|---|---|
| V1 a V5 | Fase de **reestilização e usabilidade**, prevista após o M17 |
| V6 | Mesma fase; também com o requisito de layout para celular (requisitos não funcionais do enunciado) e com a tela de manejo (M3) |

> Cenários de teste verificados no navegador, em largura de celular (375 px) e de computador. O item "funcionário não vê Usuários" foi conferido simulando o papel no navegador, sem uma conta real de funcionário.
