# Contratos: Preparação para publicação

Em produção, todas as rotas abaixo ficam sob `https://<domínio>/api` (o Caddy tira o prefixo).

## Saúde

| Rota | Quem | Resposta |
|---|---|---|
| `GET /saude` | público | 200 `{ "status": "ok" }`; 503 `{ "status": "erro" }` se o banco não responde |

## Senhas (usuários)

| Rota | Quem | Corpo | Resposta |
|---|---|---|---|
| `POST /auth/login` *(alterada)* | público | `{ email, senha }` | como hoje, mais `usuario.precisaTrocarSenha: boolean` |
| `POST /auth/trocar-senha` | logado (inclusive com senha provisória) | `{ senhaAtual, novaSenha }` | 200 `{ accessToken, usuario }` com token novo; 400 senha atual errada, nova curta (< 8) ou igual à atual |
| `POST /usuario/:id/redefinir-senha` | DONO | — | 201 `{ senhaProvisoria }`; 404 usuário de outra fazenda; 400 usuário desativado; 403 se o alvo for DONO |

Erros comuns:
- 403 `{ codigo: 'SENHA_PROVISORIA', message: 'Crie uma senha nova para continuar' }` em qualquer
  rota de fazenda enquanto `precisaTrocarSenha` estiver ligado (exceto `POST /auth/trocar-senha`).
- 401 em qualquer rota com token emitido antes da última troca de senha.

## Cadastro de fazendas

| Rota | Quem | Corpo | Resposta |
|---|---|---|---|
| `POST /auth/registrar-fazenda` *(removida)* | — | — | 404 |
| `POST /admin/fazendas` | ADMIN | `{ nomeFazenda, nomeDono, emailDono }` | 201 `{ fazendaId, senhaProvisoria }`; 409 e-mail já usado |
| `POST /admin/fazendas/:id/redefinir-senha-dono` | ADMIN | — | 201 `{ senhaProvisoria }`; 404 fazenda inexistente |

## Senha do administrador

| Rota | Quem | Corpo | Resposta |
|---|---|---|---|
| `POST /admin/auth/trocar-senha` | ADMIN | `{ senhaAtual, novaSenha }` | 200 `{ accessToken }`; 400 senha atual errada ou nova fraca (regra de 12 com letra e número) |

## Consulta pública

| Rota | Mudança |
|---|---|
| `GET /publico/animal/:codigo` | 429 `{ codigo: 'MUITAS_CONSULTAS' }` acima de 60 por minuto por endereço |

## Telas

- **Login** e **login do painel**: campos com `autoComplete` `username` e `current-password`.
- **Criar nova senha** (`/trocar-senha`): aberta sozinha depois do login com senha provisória; também
  pelo menu ("Trocar minha senha"). Campos `current-password` e `new-password` (duas vezes).
- **Usuários** (dono): botão "Redefinir senha" em cada funcionário ativo; a senha provisória aparece
  uma vez, com botão de copiar.
- **Painel**: "Nova fazenda" na lista; "Redefinir senha do dono" no detalhe; "Trocar minha senha" no
  menu do painel.
