# Quickstart: validar a Infraestrutura de Módulos

Roteiro para provar, de ponta a ponta, que a fase 0 funciona. Rotas e respostas em
[contracts/api.md](./contracts/api.md); tabelas e regras em [data-model.md](./data-model.md).

## Pré-requisitos

- Docker Desktop ligado.
- **Cópia de segurança do banco de dev antes de tudo** (ele tem a fazenda real):

  ```bash
  docker compose exec -T db pg_dump -U postgres -d controle_fazenda -Fc > ~/backup_antes_fase0.dump
  ```

- Backend: `npm test`, `npx tsc --noEmit` e `npm run lint` limpos; frontend: `tsc -b` e `eslint src`.
- Fazendas de teste isoladas criadas pelo registro (constituição, princípio V); a fazenda real
  só é usada para conferir contagens, nunca para lançar.

## Cenários

### 1. Migrations sem perder dados (US1)

1. Restaurar o backup num banco **cópia** (`controle_fazenda_copia`) e anotar a contagem de
   linhas de cada tabela.
2. Subir o backend novo apontando para a cópia. **Esperado**: a migration `Inicial` aparece como
   aplicada sem executar DDL; as contagens são idênticas às do passo 1 (SC-001).
3. Rodar `migration:generate` contra a cópia. **Esperado**: "No changes" — a estrutura do banco
   é idêntica às entidades.
4. Subir contra um banco **vazio**. **Esperado**: a estrutura inteira é criada pelas migrations;
   o registro de uma fazenda nova e os testes do backend funcionam (SC-002).
5. Conferir que `DB_SYNCHRONIZE` não existe mais e que mudar uma entidade sem migration **não**
   altera o banco ao subir.
6. Só então aplicar no banco de dev real e repetir a contagem.

### 2. Administrador (US2)

1. `docker compose exec backend npm run admin:criar` com senha curta. **Esperado**: recusa.
   Com senha forte: administrador criado.
2. `/admin/login` com senha errada 5 vezes. **Esperado**: na 6ª, mesmo com a senha certa,
   "Muitas tentativas"; as 6 tentativas aparecem em `admin_tentativas_login`.
3. Após 15 minutos (ou limpando a janela no banco de teste), entrar. **Esperado**: lista de
   fazendas com busca, usuários ativos e selos dos módulos; nenhum dado de rebanho.
4. Com o token do administrador, chamar `GET /animal`. **Esperado**: 401. Com o token de um
   dono, chamar `GET /admin/fazendas`. **Esperado**: 401.

### 3. Liberar, bloquear, só consulta (US2 + US3)

Na fazenda de teste A, sem módulos:

1. `GET /modulos/financeiro/exemplo` como dono. **Esperado**: 403 "Módulo não contratado".
2. No painel, liberar o Financeiro a partir de hoje, sem término. **Esperado**: em até 1 minuto,
   `GET` e `POST /modulos/financeiro/exemplo` respondem `ok: true`.
3. Tentar liberar de novo. **Esperado**: 409.
4. Liberar o Leite com término anterior ao início. **Esperado**: 400.
5. Desativar o Financeiro. **Esperado**: `GET` continua `ok`; `POST` → 403 "Módulo desativado: só
   consulta" (FR-011a).
6. Liberar o Nutrição com início amanhã. **Esperado**: hoje ele continua "não contratado".
7. Fazenda de teste B (sem nada): todas as rotas de exemplo → 403 "Módulo não contratado";
   todo o pacote inicial funciona normalmente.

### 4. Menu, vitrine e aviso (US4) — celular, 375 px

1. Fazenda B como **funcionário**. **Esperado**: grupo Módulos com os três como vitrine
   "Disponível no módulo X · fale com o suporte" (Q2 = A).
2. Abrir `/modulos/leite` pela barra de endereço. **Esperado**: vitrine do Leite, sem erro.
3. Fazenda A: Financeiro aparece como "só consulta", com a tela de espera sem botão de lançar.
4. Liberar o Leite na fazenda A com término daqui a 7 dias; entrar como **dono**. **Esperado**:
   aviso "O módulo Leite vence em 7 dias · fale com o suporte para renovar". Sair e entrar de novo:
   o aviso volta. Entrar como **funcionário**: sem aviso.
5. Configurações do dono: módulos contratados e data de término.

### 5. Suspensão (FR-025 a FR-028)

1. Com o funcionário da fazenda A logado numa aba, suspender a fazenda A no painel com motivo.
   **Esperado**: na próxima ação, a aba volta ao login com "Acesso suspenso · fale com o suporte";
   novo login recusado com a mesma mensagem.
2. Abrir a página pública de um animal da fazenda A. **Esperado**: só fazenda, brinco, raça, sexo
   e categoria, com "Informações completas indisponíveis no momento".
3. Reativar. **Esperado**: login volta; contagem de animais, partos e pesagens igual à de antes;
   página pública completa; Leite ainda ativo.

### 6. Organização (FR-024)

1. O teste de marcação passa: todo controller em `modulos/leite`, `modulos/financeiro` e
   `modulos/nutricao` tem `@Modulo`.
2. Nenhum arquivo do pacote inicial importa de `modulos/leite|financeiro|nutricao`.

## Limpeza

As fazendas de teste podem ficar no banco local. O banco `controle_fazenda_copia` pode ser
apagado depois da validação. O backup `~/backup_antes_fase0.dump` fica na pasta do usuário, fora do repositório.
