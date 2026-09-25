# Controle Fazenda — Enunciado do Projeto

## 1. Contexto

Fazenda de **gado de corte com foco em reprodução (cria)**. O rebanho é alternado entre **4 pastos**. Hoje **não existe nenhum controle**: as vacas não são registradas e tudo depende do conhecimento do dia a dia. Quando uma vaca dá cria, o bezerro recém-nascido recebe o medicamento e nada fica anotado. A fazenda já conta com **balança, brete e estrutura de manejo**. Na época de estiagem o pasto não cresce o suficiente, e matrizes e crias passam a receber **silagem** como complemento, também sem nenhum controle de peso.

## 2. Objetivo

Desenvolver do zero uma **aplicação web** para registrar e consultar o ciclo reprodutivo do rebanho, começando pela realidade da fazenda e evoluindo para um **software genérico**, que possa ser usado por outras fazendas via **login e senha**.

Objetivos secundários:

- Praticar e demonstrar **Node.js + TypeScript** em um projeto com uso real.
- Aplicar orientação a objetos e arquitetura em camadas.

## 3. Usuários

- **Dono**: acesso total (cadastros, relatórios, usuários, configurações), decide descartes e manejo.
- **Funcionário/peão**: registra partos, tratamentos, pesagens e movimentações no dia a dia; não exclui registros nem gerencia outros usuários.
- **(Futuro)** Outras fazendas/usuários, cada um com seus dados isolados.

## 4. Identificação dos animais

Cada animal é identificado por **brinco** (número único dentro da fazenda) — por ora, brinco numerado de leitura visual. A busca por brinco deve ser rápida e é o principal ponto de entrada do sistema. Cada animal também pode ter um **QR code** vinculado. Diferente do cadastro comum, o QR code pode ser gerado **em lote, antes do cadastro**: o usuário imprime, por exemplo, 100 códigos, aplica nos brincos e só depois, no manejo, vincula cada código ao animal correspondente — evitando repetir o manejo. O QR code aponta para a página do animal e permite abrir o histórico completo pela câmera do celular.

## 5. Requisitos funcionais

> **MVP (Produto Mínimo Viável)**: a menor versão do sistema que já é útil de verdade e resolve o problema principal. Entrega-se cedo, usa-se no dia a dia e evolui-se com base no que se aprende. Aqui, a Versão 1 é o MVP.

### Versão 1 (MVP)

1. **Autenticação e níveis de usuário**: cadastro/login com e-mail e senha (JWT); perfis **dono** e **funcionário**, com permissões diferentes (funcionário não exclui registros nem gerencia usuários).
2. **Matrizes**: cadastrar, editar e consultar (brinco, raça — selecionada de um catálogo —, data de nascimento aproximada, status: prenhe, lactante, vazia, descartada; características visuais opcionais, como pelagem e marcas).
3. **Partos**: registrar parto de uma matriz (data, sexo do bezerro, observações). O parto cria automaticamente o registro do bezerro vinculado à mãe.
4. **Bezerros**: consultar e editar (brinco, sexo, data de nascimento, origem, mãe quando aplicável, raça — herdada da mãe, "mestiço/cruzado" ou definida manualmente).
5. **Óbito e descarte**: alterar status do animal para "morto" ou "descartado", com **motivo** (ex.: natimorto, pneumonia, acidente, idade, venda) e data. O registro **nunca é excluído** — só muda de status — para preservar histórico, relatórios e genealogia de matrizes que já tiveram crias.
6. **Animais comprados**: cadastrar diretamente, sem parto, informando origem "Comprado" e, se possível, data e procedência.
7. **Manejo sanitário**: registrar medicamento aplicado (produto, data, responsável), com **recorrência opcional** (ex.: a cada 90 dias) — o sistema calcula a próxima data esperada a partir da última aplicação.
8. **Histórico por matriz**: lista de crias, intervalo entre partos, ocorrências (bezerro morto, parto difícil).
9. **Pastos**: cadastrar os pastos e informar em qual pasto cada animal está.
10. **Tela de manejo (brete)**: fluxo pensado para o uso no curral. O usuário informa o brinco e, na mesma tela, cadastra o animal (se ainda não existir), registra tratamento, muda de pasto ou altera a categoria, com poucos toques.
11. **Relatórios básicos**: nascimentos por período, natimortos, óbitos por causa, lista de matrizes e de touros, tratamentos por período (ver seção de relatórios).
12. **Configurações do sistema**: tela central com preferências da fazenda — notificações (ativar/desativar, som), pastos e categorias, e **valores de referência da arroba por categoria** (ex.: boi gordo, boi/novilha jovem). Esses valores alimentam o cálculo de venda (Versão 4) e a exibição em @ nas pesagens (Versão 2).
13. **Painel inicial (dashboard)**: tela ao entrar no sistema, com resumo do rebanho (total de cabeças por categoria e por pasto, nascimentos e óbitos do mês) e as notificações/alertas mais urgentes em destaque.
14. **Catálogo de raças**: lista de raças (ex.: Nelore, Simental, Angus, Brahman) com gestação média em dias, usada no cadastro de animais e na previsão de parto (Versão 3). O usuário pode adicionar raças ou cruzamentos (ex.: "Nelore x Simental").
15. **Geração de códigos em lote (QR code)**: o usuário solicita um lote (ex.: "gerar 100 códigos"). O sistema cria os identificadores únicos com status **disponível** e gera um PDF com os QR codes para impressão, **antes de qualquer cadastro**. Ao gerar o lote, o sistema exibe um **aviso/sugestão de impressão em material plástico ou resistente às intempéries** (o animal fica exposto a sol e chuva; papel comum apaga ou se perde). No manejo, o código é informado ao cadastrar o animal, passando para status **vinculado**. O QR code aponta para a página do animal (`/f/{fazenda}/animal/{codigo}`) e não guarda dados fixos, então o histórico mostrado é sempre o atual. Se escaneado antes do cadastro, exibe **"Animal ainda não cadastrado"**. Também é possível **reemitir um código** para um animal já cadastrado (perda ou dano do brinco/etiqueta): busca-se o animal existente e vincula-se um novo código a ele, preservando todo o histórico (o código antigo é desativado).

### Versão 2 — Peso e suplementação

- **Pesagens individuais** por animal (a fazenda tem balança), com cálculo de ganho médio diário (GMD) e pesagem no desmame. Peso é **cadastrado em kg**; na consulta do animal, é exibido também **convertido em arrobas (@)**. A pesagem passa a fazer parte da tela de manejo.
- **Desmame como evento**: registro da separação do bezerro da mãe, com data, peso no desmame e mudança de pasto e categoria (bezerro → novilha/garrote) associada ao evento.
- **Suplementação (silagem)**: registrar o período em que matrizes e crias recebem silagem (início, fim, grupo de animais, quantidade fornecida), ligado ao pasto/lote.
- **Controle de peso na suplementação**: pesar no início do fornecimento e acompanhar periodicamente, para medir a resposta dos animais e comparar com o período sem silagem.
- Rodízio de pastos com histórico de ocupação e visão da época seca.

### Versão 3 — Reprodução e melhoramento genético

- **Cobertura/inseminação** e diagnóstico de prenhez, com **previsão de parto** (data da cobertura + gestação média da raça da matriz, do catálogo) e **alerta de matriz próxima do parto**, para separá-la em espaço menor e facilitar o manejo do recém-nascido.
- **Genealogia**: pai (touro) e mãe de cada animal, com consulta de linhagem (avós, descendentes). O **pai é opcional**: em monta natural, com mais de um touro solto no mesmo pasto durante a cobertura, não é possível saber com certeza qual touro fecundou qual matriz — nesse caso a raça da cria fica como "mestiço" ou é definida manualmente, e a genealogia paterna fica em aberto. A paternidade só é confiável quando há **um touro por lote/pasto por vez**, ou inseminação artificial.
- **Touros**: cadastro de reprodutores, com histórico das crias de cada um.
- **Indicadores de desempenho**: peso ao nascer, peso ao desmame ajustado (por exemplo, aos 205 dias), intervalo entre partos, taxa de natalidade e mortalidade.
- **Apoio à seleção**: ranking de matrizes e de touros para decidir quem permanece, quem é descartado e quais cruzamentos fazer, evitando consanguinidade.
- Base para o uso futuro de dados genéticos externos (por exemplo, DEPs de touros e sêmen).
- **Possível evolução do manejo**: integração com leitor de brinco eletrônico e balança eletrônica, se a fazenda adotar esses equipamentos; leitura do **QR code** pela câmera do celular no curral, para abrir o histórico do animal direto no manejo.

### Versão 4 — Gestão

- **Calendário e alertas sanitários**: painel de tratamentos recorrentes (ex. vermífugo) vencidos ou próximos do vencimento, e vacinações do rebanho.
- **Vendas e compras**, com preço por arroba, usando o **peso de referência configurado em Configurações do sistema** por categoria (ex.: 15kg para animal adulto, 12–13kg para bezerro/novilha), evitando cálculo errado do valor da venda.
- Modelo multi-fazenda (SaaS) com planos e cobrança.

> A ordem das versões pode mudar. A suplementação com silagem, por exemplo, pode subir de prioridade se a estiagem for a necessidade mais urgente. O melhoramento genético depende de bons dados de brinco, mãe, pai e pesagens, e por isso a Versão 1 já é o alicerce dele.

### Relatórios (presentes em todas as versões)

Relatórios são **consultas sobre os dados registrados**, com filtros por período, categoria, pasto e animal, e exportação (CSV/PDF). Crescem junto com o sistema:

- **Versão 1**: nascimentos por período, natimortos, matrizes, touros, tratamentos por período, histórico de uma matriz.
- **Versão 2**: pesagens e GMD por animal ou grupo, comparativo com e sem silagem.
- **Versão 3**: animais por linhagem, crias por touro, ranking de matrizes, intervalo entre partos, indicadores de produtividade.
- **Versão 4**: relatórios financeiros e de vacinação.

## 6. Regras de negócio

- O brinco é **único por fazenda**.
- Um animal pode ter **origem** "Nascido na fazenda" (com parto e mãe cadastrados) ou "Comprado" (mãe desconhecida, sem parto vinculado). A mãe só é obrigatória quando a origem é "Nascido na fazenda".
- O **intervalo entre partos** de uma matriz é calculado a partir das datas dos partos.
- Um animal só pode estar em **um pasto** por vez; a movimentação gera histórico.
- Os dados de uma fazenda **nunca** são visíveis para outra.
- Registros de animais **nunca são excluídos** ao vender, morrer ou descartar — apenas mudam de status, preservando histórico e genealogia.
- Um código (QR code) reemitido preserva o histórico do animal; o código anterior é desativado, não reaproveitado.

## 7. Requisitos não funcionais

- Aplicação acessível pelo **navegador**, com layout que funcione bem no celular (uso no campo).
- **Validação** de dados em todas as entradas.
- Senhas armazenadas com **hash**; conformidade básica com a **LGPD** para dados de usuários.
- Código organizado em camadas (controller, service, repository).

## 8. Stack sugerida

- **Back-end**: Node.js + TypeScript com **NestJS**.
- **Banco**: PostgreSQL, com Prisma ou TypeORM.
- **Front-end**: React.
- **Extras**: testes automatizados, Docker, documentação da API (OpenAPI/Swagger).

## 9. Modelagem (visão inicial — a ser revisada na fase de modelagem)

> Esta seção é preliminar. O escopo vem primeiro; a modelagem será refeita depois, considerando, entre outros pontos, que o mesmo animal pode ser bezerro, matriz ou touro ao longo da vida (entidade única `Animal`).

Entidades principais: `Usuario`, `Fazenda`, `Pasto`, `Matriz`, `Bezerro`, `Parto`, `Tratamento`, `MovimentacaoPasto`.

Relações-chave: `Fazenda` 1—N `Matriz`; `Matriz` 1—N `Parto`; `Parto` 1—1 `Bezerro`; `Bezerro` 1—N `Tratamento`. Toda entidade de negócio pertence a uma `Fazenda` (isolamento de dados).

## 10. Critérios de entrega

- API funcionando com os requisitos da Versão 1.
- Testes automatizados para as regras de negócio principais.
- Aplicação rodando via Docker.
- README com instruções de execução e decisões técnicas.
- Repositório organizado e commits claros (para o portfólio).

## 11. Fora de escopo (avaliado e descartado por ora)

- **GTA (Guia de Trânsito Animal)**: registro do documento obrigatório de transporte.
- **Estação de monta**: período fixo de cada touro com um grupo de matrizes.
- **Escore de condição corporal (ECC)** e **estoque de insumos**: indicador nutricional da matriz e controle de quantidade de produtos.

## 12. Decisões tomadas

- **Back-end em NestJS** (Node.js + TypeScript) e **front-end em React**, desde o início.
- **Vacas já existentes**: serão cadastradas manualmente na fase beta, durante o manejo de cada uma, aproveitando o momento para fazer o mapeamento do rebanho. Por isso o cadastro de matriz precisa ser **rápido e simples de usar no celular, no curral**.
