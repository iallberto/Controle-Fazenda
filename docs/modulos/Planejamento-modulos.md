# Controle Fazenda — Planejamento dos módulos

> Como o sistema passa a ser vendido em partes: um pacote inicial e módulos adicionais liberados por cliente.
> Este documento registra as decisões, o escopo de cada módulo e a ordem de execução. As seções 2 (infraestrutura, fase 0), 3 (cobertura e inseminação) e 5 (Financeiro) já foram implementadas; Leite e Nutrição ainda não.

| | |
|---|---|
| **Data** | 03/11/2026 |
| **Status** | Decisões tomadas, sem questões em aberto · seção 3 concluída (spec 001) · fase 0 concluída (spec 002) · Financeiro concluído (spec 003) · Leite e Nutrição não iniciados |
| **Base** | Versão atual (reprodução e rebanho), com o bloco pós-V1 concluído |
| **Legenda** | ✅ Decidido · ❓ Em aberto · ⏸️ Depois · ✔️ Concluído |

---

## 1. Decisões

| # | Decisão |
|---|---|
| D1 | ✅ **Pacote inicial = Reprodução e Rebanho**: tudo o que existe hoje (animais, partos, pastos, manejo, pesagens, tratamentos, QR codes, relatórios). Toda fazenda tem. |
| D2 | ✅ **Módulos adicionais comprados separadamente**: **Leite**, **Financeiro** e **Nutrição**. Cada um é liberado só para a fazenda que comprou. |
| D3 | ✅ **Leite depende da Reprodução**: as vacas de leite são cobertas ou inseminadas, e Leite e Reprodução formam um produto para a fazenda leiteira. Como a Reprodução já está em todo cliente (D1), a dependência é sempre atendida. |
| D8 | ✅ **Cobertura e inseminação entram no pacote inicial**, não no Leite. O padrão é a **monta natural** (o caso da fazenda de referência); **IA e IATF** ficam disponíveis como opção para quem usar. Assim a fazenda de corte também tem o controle de cobertura e prenhez. |
| D9 | ✅ **Sem período de teste grátis.** A liberação de um módulo vale até ser desativada; a data de término fica opcional só para contratos com prazo. |
| D10 | ✅ **Preços definidos só na publicação.** Não afetam o código. |
| D4 | ✅ **Liberação manual**: o dono do software ativa e desativa os módulos de cada cliente. Sem cobrança automática nesta fase. |
| D5 | ✅ **Um sistema só**: mesma aplicação, mesmo banco e mesmo deploy, com cada módulo em pastas próprias. Não são sistemas separados. |
| D6 | ✅ **Cada módulo funciona sozinho**; quando a fazenda tem também o Financeiro, os outros módulos lançam receitas e despesas nele automaticamente. |
| D7 | ✅ **Migrations antes de qualquer módulo**: com clientes pagando, o `synchronize` do TypeORM deixa de ser aceitável, porque pode apagar dados ao mudar uma entidade. |

### Questões resolvidas

| # | Questão | Decisão |
|---|---|---|
| Q1 | A inseminação fica só no Leite? | Não: cobertura e inseminação vão para o pacote inicial (D8) |
| Q2 | Preço de cada módulo | Fica para a publicação (D10) |
| Q3 | Período de teste grátis | Não haverá (D9) |

---

## 2. Infraestrutura de módulos (fase 0) ✔️ Concluído

É o que permite vender por partes. Vem antes de qualquer módulo.

> **Concluído em 04/11/2026** pela spec `specs/002-infraestrutura-modulos`. Decisões novas em
> relação ao rascunho abaixo (clarify da spec):
> - módulo **desativado ou vencido fica "só consulta"**: a fazenda vê o que lançou, mas não lança;
>   quem nunca contratou recebe "módulo não contratado";
> - a situação do módulo é **calculada pelas datas** (sem job): ativo, só consulta ou não
>   contratado; o cache é de 60 s e é limpo a cada ação do painel;
> - por padrão, `GET` é consulta e o resto é lançamento; um teste exige `@Modulo` em todo
>   controller de módulo e outro proíbe importações entre o pacote inicial e os módulos;
> - **suspensão de fazenda** pelo painel: ninguém da fazenda entra, sessões abertas caem, a página
>   pública do animal mostra só o básico, e nada é apagado;
> - **administrador** em tabela própria, com token separado; senha de 12 caracteres ou mais e
>   bloqueio de 15 minutos depois de 5 erros; conta criada por `npm run admin:criar`;
> - vitrine para dono e funcionário; **aviso de vencimento** só para o dono, nos 10 dias antes, a
>   cada login;
> - `synchronize` desligado também em desenvolvimento, para o banco de dev não divergir do de
>   produção.

### 2.1 Migrations
- Desligar o `synchronize` e gerar a migration inicial a partir do banco atual.
- Toda mudança de tabela passa a ser uma migration versionada, revisada e aplicada no deploy.

### 2.2 Módulos por fazenda
- Tabela `modulos_fazenda`: fazenda, módulo (`LEITE`, `FINANCEIRO`, `NUTRICAO`), ativo, data de início, data de término (opcional, só para contrato com prazo; não há teste grátis), quem liberou.
- A Reprodução não entra na tabela: é o pacote inicial, sempre ativo.

### 2.3 Bloqueio no backend
- Cada rota de módulo pago é marcada com o módulo dela (`@Modulo('LEITE')`).
- Uma fazenda sem o módulo recebe **403 "módulo não contratado"**, mesmo chamando a API direto. Esconder o botão na tela não basta.
- A lista de módulos da fazenda fica em cache por alguns minutos, para não consultar o banco a cada requisição; ao liberar um módulo, o cache daquela fazenda é limpo.

### 2.4 Frontend
- `GET /fazenda/modulos` devolve os módulos ativos; o menu mostra só os grupos contratados.
- Módulos não contratados aparecem como vitrine: "Disponível no módulo Leite · fale com o suporte".
- Uma rota de módulo não contratado, aberta pela URL, mostra essa mesma tela, e não um erro.

### 2.5 Administrador do sistema
- Novo papel **ADMIN**, fora das fazendas, só para o dono do software.
- Painel simples: lista de fazendas clientes, módulos de cada uma, liberar e desativar (data de término opcional, para contrato com prazo).
- Login separado do login das fazendas, e o ADMIN não enxerga dados de rebanho dos clientes, só o cadastro e os módulos.

### 2.6 Organização do código

```
backend/src/
  (pastas atuais = pacote Reprodução e Rebanho)
  modulos/
    acesso/        tabela modulos_fazenda, decorator @Modulo, guard, cache
    admin/         painel do dono do software
    leite/
    financeiro/
    nutricao/
frontend/src/
  pages/           (telas atuais)
  modulos/
    leite/  financeiro/  nutricao/
```

---

## 3. Cobertura e inseminação (pacote inicial) ✔️ Concluído

> **Concluído em 03/11/2026** pela spec `specs/001-cobertura-inseminacao` (especificação, plano, contratos e
> tarefas lá). O que mudou em relação ao rascunho abaixo, por decisão no clarify:
> - um touro por estação, e abrir a estação leva o touro para o pasto;
> - depois do parto a vaca fica **Lactante** e volta a ser apta 45 dias depois; novilha que pare vira matriz;
> - idade gestacional informada em meses e dias no toque;
> - só o dono edita ou cancela registros de reprodução, sempre com motivo, e nada é excluído;
> - a previsão de parto usa, nesta ordem, a inseminação, a idade gestacional do toque ou o meio da estação;
> - relatórios entregues: vacas a parir, indicadores reprodutivos (taxa de prenhez por estação, touro e sêmen;
>   intervalo entre partos) e vacas vazias; a página do animal ganhou a linha do tempo reprodutiva.
> - Protocolo de IATF por etapas e registro de cio continuam fora (⏸️ depois).

Parte nova da Reprodução, disponível para **todas** as fazendas (D8). Pode ser feita a qualquer momento, sem depender da fase 0, porque não é módulo pago.

### 3.1 Cobertura
- **Monta natural (padrão)**: touro (já cadastrado no rebanho), matrizes e data de entrada e saída do touro no lote ou pasto. A cobertura individual é opcional, para quem anota.
- **Inseminação (opcional)**: tipo **IA** ou **IATF**, data, quem inseminou e o sêmen usado.
- **Cadastro de sêmen** (só para quem insemina): touro, raça, central, doses em estoque.
- **Protocolo de IATF** (depois, se houver demanda): lote de vacas e as datas de cada etapa.

### 3.2 Prenhez e parto
- **Diagnóstico de gestação**: data, resultado (prenhe/vazia), método (toque, ultrassom). Atualiza o status reprodutivo que já existe (`PRENHA`, `VAZIA`).
- **Previsão de parto**: data da cobertura ou inseminação + gestação média da raça (o campo já existe no cadastro de raças). Na monta natural, sem data exata, a previsão sai do diagnóstico.
- **Vaca vazia** depois do diagnóstico volta para a lista de aptas à cobertura.
- O **parto** continua na tela atual; quando houver cobertura ou inseminação registrada, o parto aponta para ela e o pai da cria é preenchido.
- Relatórios: taxa de prenhez, vacas a parir nos próximos dias, intervalo entre partos.

---

## 4. Módulo Leite

Para fazendas com vacas de ordenha. Usa os animais, partos, tratamentos e a cobertura/inseminação do pacote inicial.

### 4.1 Lactação e ordenha
- Novos status: **em lactação** e **seca**. A lactação começa no parto e termina na secagem.
- **Ordenha**: produção diária por vaca (uma ou mais ordenhas no dia) ou só do tanque, para quem não mede vaca a vaca.
- **Dias em lactação (DEL)** e **curva de lactação** por vaca.
- **Secagem**: data planejada (ex.: 60 dias antes do parto previsto) e data real.

### 4.2 Carência de medicamentos
- Tratamento com **carência de leite** (dias) marca a vaca: o leite dela é **descarte** até o fim do prazo.
- Aviso no Manejo e na ordenha quando a vaca está em carência. Aproveita os tratamentos que já existem.

### 4.3 Qualidade e entrega
- **Entregas ao laticínio**: data, litros, preço por litro.
- **Análises do laticínio**: CCS, CBT, gordura, proteína, por entrega ou por mês.
- Com o Financeiro ativo, cada entrega vira uma receita.

### 4.4 Relatórios do Leite
- Produção diária e mensal da fazenda; por vaca; litros por vaca em lactação.
- Vacas a secar nos próximos dias e litros por lactação.
- Os relatórios de prenhez e partos ficam no pacote inicial (seção 3).

### 4.5 Ajustes no pacote base
- Raças leiteiras padrão: Holandesa, Girolando, Jersey, Gir (com a gestação média de cada uma).

---

## 5. Módulo Financeiro ✔️ Concluído

> **Concluído em 04/11/2026** pela spec `specs/003-modulo-financeiro`. Decisões do clarify:
> - **só o dono vê valores**; o funcionário registra os itens usados ou trazidos, sem R$, e o
>   dono informa o valor depois (vira despesa) ou descarta com motivo;
> - venda de animais numa operação só (pesagem, saída do rebanho, receita), com lembrete de
>   retirar o brinco só dos animais que embarcarem; cancelar a venda devolve os animais;
> - com o Financeiro ativo, "Vendido" pela mudança de status é recusado: a venda é no Financeiro;
> - compra de animal com valor (0,00 para não lançar); compras cadastradas pelo funcionário ficam
>   pendentes, com aviso ao dono a cada login;
> - valores em centavos inteiros; gráficos em SVG próprio, sem biblioteca nova.
> - Integrações com Leite e Nutrição (5.4) ficam para quando esses módulos existirem.

### 5.1 Lançamentos
- **Receitas e despesas** com data, valor, categoria, descrição e, quando fizer sentido, o animal ou lote ligado.
- **Categorias** padrão (venda de animais, venda de leite, ração, medicamentos, mão de obra, manutenção…) e personalizadas pela fazenda.

### 5.2 Venda de animais
- Animal ou lote, data, **peso**, **arrobas** (pelo peso de referência das Configurações), **preço por arroba** ou valor total, comprador.
- A venda muda o animal para **Vendido** automaticamente, usando o status que já existe, e fecha a permanência no pasto.
- Gera a receita no mesmo passo.

### 5.3 Gráficos e relatórios
- **Receita × despesa por mês** e **lucro** do período.
- **Valores de venda**: total vendido, preço médio da arroba ao longo do tempo, animais vendidos por categoria.
- **Custo por categoria de despesa** (para onde vai o dinheiro).

### 5.4 Integrações
- Leite: entregas ao laticínio → receitas.
- Nutrição: compras de insumos → despesas.
- Tratamentos (opcional): custo do produto → despesa.

### ⏸️ Depois
- Contas a pagar e a receber com vencimento, conciliação bancária, emissão de notas.

---

## 6. Módulo Nutrição

Pode ser feito em paralelo ao Leite.

### 6.1 Insumos e estoque
- **Cadastro de insumos**: silagem, ração, sal mineral, núcleo, feno, concentrado, com unidade (kg, saco, tonelada).
- **Entradas** (compra ou produção própria) e **baixas** (fornecimento ou perda).
- **Estoque atual** e **alerta de estoque baixo**.
- Com o Financeiro ativo, cada compra vira uma despesa.

### 6.2 Silo
- Cadastro do silo: tipo (trincheira, superfície, bag), volume ou toneladas ensiladas, data de fechamento e de abertura.
- **Consumo diário** e **previsão de quantos dias o silo ainda dura**.

### 6.3 Dietas e fornecimento
- **Dieta** por categoria ou lote: insumos e quantidade por animal por dia.
- **Fornecimento diário** por pasto ou lote, dando baixa no estoque (aproveita o mesmo jeito de escolher grupos do Manejo em lote).
- **Custo de alimentação** por animal por dia e por lote.

---

## 7. Ordem de execução

| Fase | Entrega | Depende de |
|---|---|---|
| 0 | ✔️ Migrations · módulos por fazenda · bloqueio no backend e no menu · painel do administrador — concluída | — |
| — | ✔️ **Cobertura e inseminação** no pacote inicial (monta natural, IA/IATF opcional, diagnóstico, previsão de parto) — concluída | Nada; pode entrar antes, durante ou depois da fase 0 |
| 1 | ✔️ **Financeiro** (lançamentos, venda de animais, gráficos) — concluído | Fase 0 |
| 2a | **Leite** (lactação, ordenha, carência, entregas) | Fase 0 e cobertura/inseminação |
| 2b | **Nutrição** (insumos, silo, dietas, fornecimento) | Fase 0 |
| 3 | Integrações com o Financeiro (leite → receita, compras → despesa) | 1 e 2 |

O Financeiro vem primeiro por ser o mais simples, por aproveitar a venda de animais que já existe e por ser a base das integrações. Leite e Nutrição não dependem um do outro e podem andar em paralelo.

---

## 8. Relação com os documentos anteriores

| Item | Relaciona-se com |
|---|---|
| Venda de animais (Financeiro) | Status "Vendido" e arroba de referência por categoria (pacote base) |
| Cobertura, inseminação e previsão de parto (pacote inicial) | Status reprodutivo, cadastro de raças com gestação média, registro de partos |
| Carência de medicamentos (Leite) | Tratamentos e recorrência (M6, M10) |
| Fornecimento por lote (Nutrição) | Manejo em lote (M4) |
| Fase 0 (migrations) | Pendência registrada na revisão de segurança |
