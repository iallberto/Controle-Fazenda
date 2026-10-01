# Controle Fazenda

Aplicação web para controle do ciclo reprodutivo de um rebanho de gado de corte (fazenda de cria), desenvolvida como projeto de estudo e portfólio em Node.js, TypeScript e React.

📄 Documentação completa: [enunciado do projeto](docs/enunciado-controle-fazenda.md) e [modelagem do sistema](docs/modelagem-controle-fazenda.md).

## Stack

- **Back-end**: Node.js + TypeScript, NestJS, TypeORM, PostgreSQL
- **Front-end**: React + TypeScript, Vite, React Router, Axios
- **Autenticação**: JWT, com controle de papéis (Dono / Funcionário)
- **Documentação da API**: Swagger/OpenAPI
- **Infraestrutura**: Docker e Docker Compose
- **Testes**: Jest (back-end)

## Funcionalidades (Versão 1)

- Cadastro de fazenda e autenticação (login, JWT, papéis)
- Cadastro de matrizes, bezerros, touros (origem nascido na fazenda ou comprado)
- Registro de partos, com criação automática das crias
- Óbito e descarte de animais, com motivo (sem exclusão de registros)
- Manejo sanitário, com recorrência de tratamentos
- Movimentação entre pastos, com histórico
- Identificação por QR code, gerado em lote antes do cadastro
- Catálogo de raças (padrão e customizado por fazenda)
- Configurações da fazenda (notificações, valores de referência da arroba)
- Painel inicial e relatórios básicos (nascimentos, natimortos, óbitos, tratamentos)

## Como rodar o projeto

### Opção 1 - Tudo via Docker (recomendado para só testar a aplicação)

Pré-requisitos: Docker Desktop instalado.

1. Crie um arquivo `.env` na raiz do projeto, com:

 - JWT_SECRET=uma-frase-bem-longa-e-dificil-de-adivinhar-aqui

2. Suba tudo:

 - docker compose up --build

3. Acesse:
   - Front-end: http://localhost:8080
   - API: http://localhost:3000
   - Documentação da API (Swagger): http://localhost:3000/docs

### Opção 2 - Desenvolvimento local (back-end e front-end separados)

Pré-requisitos: Node.js 24+, Docker (para o banco de dados).

**Banco de dados:**

 - docker compose up -d db

 
**Back-end** (pasta `backend/`):

 - cd backend
 - npm install
 - npm run start:dev

Crie um `.env` dentro de `backend/`, com `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, `DB_DATABASE` e `JWT_SECRET`.

**Front-end** (pasta `frontend/`):

 - cd frontend
 - npm install
 - npm run dev

 Crie um `.env` dentro de `frontend/`, com `VITE_API_URL=http://localhost:3000`.

### Primeiro acesso

Use o endpoint `POST /auth/registrar-fazenda` (via Swagger, ou pela API diretamente) para criar a primeira fazenda e seu usuário `Dono`. A partir daí, o login funciona normalmente pela tela do front-end.

## Testes

 - cd backend
 - npm run test

 
## Decisões técnicas

- **Entidade `Animal` única**, em vez de tabelas separadas para bezerro/matriz/touro: o mesmo animal muda de categoria ao longo da vida, e uma entidade única preserva seu histórico completo (detalhes na [modelagem](docs/modelagem-controle-fazenda.md)).
- **Registros nunca são excluídos**: óbito, venda e descarte mudam o `status` do animal, preservando histórico e genealogia.
- **Isolamento multi-tenant**: toda entidade de negócio pertence a uma fazenda (`fazendaId`), obtido do token JWT, nunca informado livremente pelo cliente da API.
- **QR codes gerados em lote**, antes do cadastro do animal: o código nasce com status `DISPONIVEL` e só é vinculado ao animal durante o manejo, evitando repetir o processo.

## Estrutura do repositório

controle-fazenda/
├── docs/ # Enunciado e modelagem do projeto
├── backend/ # API em NestJS
├── frontend/ # Aplicação em React
└── docker-compose.yml