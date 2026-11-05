# Data Model: Preparação para publicação

Migration nova: `Publicacao` (aplicada primeiro na cópia, como sempre).

## Usuario *(existente, `usuarios`)*

| Campo | Tipo | Regra |
|---|---|---|
| `precisaTrocarSenha` | boolean, não nulo, padrão `false` | Ligado ao criar o dono pelo painel e em toda redefinição; desligado quando o próprio usuário troca a senha. Enquanto ligado, só a troca de senha é aceita (403 `SENHA_PROVISORIA`). |
| `senhaAlteradaEm` | timestamptz, nulo | Gravado em toda troca e redefinição. Token com `iat` anterior a este segundo é recusado (401). |

Regras de senha de usuário: 8 ou mais caracteres na criação, na troca e no cadastro de funcionário
(senhas antigas mais curtas continuam valendo até a próxima troca); a nova senha deve ser diferente
da atual.

## Administrador *(existente, `administradores`)*

| Campo | Tipo | Regra |
|---|---|---|
| `senhaAlteradaEm` | timestamptz, nulo | Gravado na troca pelo painel e pelo comando `criar-admin`; token anterior é recusado. |

Regra de senha: a que já existe (12 ou mais, com letra e número).

## Tentativas de login *(sem mudança)*

- Usuários: em memória no `AuthService` (5 falhas em 15 minutos por e-mail).
- Administrador: tabela existente de tentativas, por e-mail e endereço.

## Contador da consulta pública *(em memória, sem tabela)*

Mapa endereço → (início do minuto, quantidade). Entradas velhas são limpas a cada minuto.

## Backup *(arquivos, fora do banco)*

- `diarios/controle_fazenda_AAAA-MM-DD.dump` — um por dia, guardados 7 dias.
- `semanais/controle_fazenda_AAAA-MM-DD.dump` — o de domingo, guardados 28 dias.
- Mesma estrutura no servidor (`/backups`) e no bucket da nuvem.
