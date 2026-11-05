# Quickstart: validar a preparação para publicação

Contratos em [contracts/api.md](./contracts/api.md); decisões em [research.md](./research.md).

## Pré-requisitos

- Docker no ar; migration nova primeiro na cópia (backup em `pg_dump`, contagens,
  `migration:generate` sem mudanças), depois no dev.
- Testes, tipos e lint do backend (zero avisos) e do frontend.
- Para os cenários 4 a 6: o compose de produção sobe na máquina local com `DOMINIO=localhost`, banco
  vazio, e um remoto local do `rclone` no lugar do bucket.

## Cenários

### 1. Senhas (US1)

1. Funcionário troca a própria senha com a atual certa. **Esperado**: a nova funciona, a antiga não;
   o token antigo de outra aba recebe 401.
2. Senha atual errada, nova com 7 caracteres ou igual à atual. **Esperado**: 400, nada muda.
3. Dono redefine a senha do funcionário. **Esperado**: senha provisória mostrada uma vez; o
   funcionário entra com ela, cai em "Criar nova senha" e recebe 403 `SENHA_PROVISORIA` em qualquer
   outra rota até trocar.
4. Dono tenta redefinir a de outro dono ou de usuário de outra fazenda. **Esperado**: recusado.
5. Administrador redefine a senha do dono pelo painel. **Esperado**: mesmo fluxo do item 3.
6. Administrador troca a própria senha com 11 caracteres. **Esperado**: recusado; com 12, aceito.

### 2. Cadastro de fazendas (US5)

1. `POST /auth/registrar-fazenda`. **Esperado**: 404.
2. Administrador cria "Fazenda Teste" com o dono. **Esperado**: senha provisória; o dono entra,
   troca a senha e vê a fazenda vazia com o pacote inicial.
3. Criar outra com o mesmo e-mail. **Esperado**: 409, nada criado.

### 3. Limites (US4)

1. 5 senhas erradas no login do usuário. **Esperado**: a 6ª é recusada mesmo certa; log com o
   bloqueio, sem a senha.
2. 61 consultas públicas em menos de um minuto. **Esperado**: a 61ª recebe 429; no minuto seguinte
   volta.

### 4. Produção local (US2)

1. Subir o compose de produção. **Esperado**: `https://localhost` abre o site; `http://` redireciona;
   `https://localhost/api/saude` responde ok; `/api/docs` não existe; cabeçalhos de segurança
   presentes.
2. Tentar `localhost:5432`, `:3000` e `:8080`. **Esperado**: nada responde.
3. Pausar o backend (`docker pause`). **Esperado**: o autoheal o reinicia em poucos minutos.
4. Reiniciar o Docker. **Esperado**: tudo volta sozinho em menos de 2 minutos.
5. Login pelo site com o administrador criado pelo roteiro; navegador oferece salvar a senha.

### 5. Backup e restauração (US3)

1. Rodar o backup na hora. **Esperado**: arquivo do dia no servidor e no remoto; a URL de aviso foi
   chamada (ou a de falha, se o remoto estiver errado).
2. Criar dados, anotar contagens, apagar o volume do banco e seguir o roteiro de restauração.
   **Esperado**: contagens iguais, em menos de 30 minutos.
3. Arquivos com mais de 7 dias (diários) e 28 (semanais), simulados. **Esperado**: apagados.

### 6. Arrumação

1. `oxlint`. **Esperado**: zero avisos.
