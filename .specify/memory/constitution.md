# Controle Fazenda Constitution

## Core Principles

### I. Isolamento por Fazenda (NÃO NEGOCIÁVEL)

- Toda leitura e escrita DEVE ser restrita à fazenda do usuário logado, obtida do token, nunca
  de um id vindo da URL ou do corpo da requisição.
- Toda referência a outro registro (mãe, pai, raça, pasto, usuário, veterinário, código) DEVE
  ser validada no backend como pertencente à mesma fazenda (ou ao catálogo padrão do sistema).
- Registro de outra fazenda DEVE responder **404**, como se não existisse; nunca 403 que
  confirme a existência.
- Rotas públicas (sem login) DEVEM montar a resposta campo a campo, expondo só o que foi
  decidido, e DEVEM ter limite de requisições.

**Rationale**: o produto é vendido para várias fazendas no mesmo banco; vazar ou alterar dado
de um cliente para outro é a falha mais grave possível.

### II. Regras de Negócio no Backend

- Regras de domínio (sexo × categoria, parto só de matriz, animal fora do rebanho não recebe
  manejo, código disponível só uma vez) DEVEM ser aplicadas no service/DTO do backend.
- O frontend PODE espelhar as regras para orientar o usuário, mas NUNCA é a única barreira.
- Operações que alteram mais de um registro DEVEM rodar numa transação; recursos disputados
  (códigos, numeração) DEVEM ser reservados de forma atômica.
- Acesso a módulos pagos DEVE ser bloqueado no backend; esconder o botão não basta.

**Rationale**: qualquer pessoa com o token pode chamar a API direto; só o backend garante a
consistência.

### III. Histórico Preservado e Auditável

- Animais e registros de manejo NÃO DEVEM ser excluídos; saídas do rebanho (venda, morte,
  descarte) são mudanças de status com data e motivo.
- Registros principais DEVEM guardar quem criou e quem alterou por último, com data.
- Em tratamento e pesagem, quem aplicou/pesou DEVE ser separado de quem lançou.
- Substituições (ex.: reemissão de brinco) DEVEM manter o valor anterior no histórico.

**Rationale**: o dono precisa confiar no histórico do rebanho, e o comprador consulta esse
histórico pela etiqueta.

### IV. Feito para o Curral

- Telas DEVEM funcionar no celular (sem rolagem lateral da página) e alvos de toque DEVEM ter
  no mínimo 44 px.
- Fluxos do dia a dia (manejo, pesagem, tratamento) DEVEM exigir poucos toques e evitar
  digitação: seleção em listas, valores pré-preenchidos, o próximo código já sugerido.
- Todo salvamento DEVE dar retorno claro e distinguível entre sucesso e erro (componente
  `Aviso`, som opcional), dizendo o que foi gravado.
- Textos exibidos DEVEM estar em português e passar pelos formatadores centrais (brinco,
  datas dd/mm/aaaa no fuso local, sexo, categoria, status, peso, arrobas); valores crus da
  API não aparecem na tela.

**Rationale**: o sistema é usado no brete, com pressa, luva e mão suja, por quem não é técnico.

### V. Verificação Antes de Entregar

- Toda regra de negócio nova DEVE ter teste unitário no backend, incluindo os casos de recusa.
- `tsc` e lint DEVEM passar sem erros no backend e no frontend antes de qualquer commit.
- Mudanças de tela DEVEM ser conferidas no navegador, em largura de celular, antes de serem
  dadas como prontas; o que não puder ser verificado DEVE ser declarado.
- Testes que gravam dados DEVEM usar uma fazenda de teste isolada, nunca os dados reais.

**Rationale**: o dono testa no próprio rebanho; um erro que chega ao curral custa caro.

### VI. Simplicidade e Produto Modular

- O sistema é uma aplicação só (um backend, um frontend, um banco, um deploy).
- O pacote inicial (Reprodução e Rebanho) é sempre ativo; Leite, Financeiro e Nutrição são
  módulos em pastas próprias, liberados por fazenda, e cada um DEVE funcionar sozinho.
- Integrações entre módulos acontecem só quando os dois estão ativos na fazenda.
- Dependências novas DEVEM ser justificadas; preferir o que a stack já oferece.

**Rationale**: software pequeno, para comércio inicial pequeno; complexidade só quando ela se
paga.

## Restrições Técnicas

- Stack: NestJS + TypeORM + PostgreSQL no backend; React + Vite + TypeScript no frontend;
  Docker Compose para rodar tudo.
- `synchronize` do TypeORM só em desenvolvimento; antes do primeiro módulo pago, o schema
  passa a evoluir por migrations versionadas.
- Datas sem hora trafegam como `AAAA-MM-DD` e são tratadas no fuso local; nunca derivar a
  data do dia com `toISOString()`.
- Segredos (JWT, senha do banco) ficam em `.env`, fora do repositório; `.env.example`
  documenta as variáveis.
- Ids de rota são validados (`ParseUUIDPipe`); entradas passam por DTOs com `class-validator`.

## Fluxo de Desenvolvimento

- Funcionalidades novas seguem o Spec Kit: especificar → esclarecer → planejar → tarefas →
  implementar. Specs ficam em `specs/`, decisões de produto em `docs/`.
- O dono do produto testa localmente antes de cada entrega. Depois da aprovação, o trabalho
  vai para um branch curto, é integrado ao `main` por fast-forward e enviado ao GitHub.
- Mensagens de commit em português, no imperativo, descrevendo o porquê.
- Itens que dependem de terceiros (domínio, gráfica, preços) ficam registrados como
  pendência, sem bloquear o restante.

## Governance

- Esta constituição prevalece sobre preferências individuais. Specs e planos DEVEM ser
  conferidos contra ela; violação de um princípio exige justificativa registrada no plano.
- Emendas são feitas com `/speckit-constitution`, registradas no Sync Impact Report e
  aprovadas pelo dono do produto.
- Versionamento semântico: MAJOR para remover ou redefinir princípio; MINOR para princípio ou
  seção nova; PATCH para redação.

**Version**: 1.0.0 | **Ratified**: 2026-11-03 | **Last Amended**: 2026-11-03
