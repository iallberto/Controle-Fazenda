# Implementation Plan: Preparação para publicação

**Branch**: `007-preparacao-publicacao` | **Date**: 2026-11-05 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/007-preparacao-publicacao/spec.md`

## Summary

Deixar o sistema pronto para subir num servidor VPS com domínio próprio e começar a vender. O
levantamento do código mostrou que o bloqueio de login já existe nos dois logins, então o plano tem
cinco partes:

1. **Senhas sem e-mail:** troca pelo próprio usuário; redefinição pelo dono (funcionário) e pelo
   administrador (dono), com senha provisória e troca obrigatória; sessões antigas encerradas pela
   data da última troca (R6).
2. **Cadastro só pelo administrador:** a rota pública sai; o painel ganha "Nova fazenda" (R7).
3. **Produção:** compose próprio com Caddy (HTTPS automático, `/api`, cabeçalhos), partes internas
   fechadas, Swagger desligado, rota `/saude` e autoheal (R1–R3).
4. **Backup e alertas:** dump diário enviado a um bucket na nuvem, guarda de 7 dias e 4 semanas,
   restauração testada; UptimeRobot no site e Healthchecks.io no backup (R4–R5).
5. **Ajustes:** limite de 60 consultas por minuto na consulta pública, log dos bloqueios, login que
   o navegador consegue salvar, zero avisos de lint (R8, R9, R11).

Fica também um roteiro de publicação em `docs/publicacao/` para o dia em que domínio e servidor
chegarem.

## Technical Context

**Language/Version**: TypeScript (Node 24) no backend e no frontend; shell (`sh`) nos scripts de
backup.

**Primary Dependencies**: NestJS 12, TypeORM 1.x, React 19. Nenhuma dependência nova de código.
Imagens Docker novas em produção: `caddy:2-alpine`, `willfarrell/autoheal`, e `postgres:16-alpine`
com `rclone` para o backup.

**Storage**: PostgreSQL 16. Migration `Publicacao`: `precisa_trocar_senha` e `senha_alterada_em` em
`usuarios`; `senha_alterada_em` em `administradores`. Backups em arquivo, no servidor e num bucket
S3 compatível.

**Testing**:
- Jest: troca e redefinição de senha, guard da senha provisória, recusa de token anterior à troca,
  criação de fazenda pelo administrador, limite da consulta pública, papéis.
- Quickstart na cópia (cenários 1 a 3) e com o compose de produção local (4 a 6).

**Target Platform**: servidor Linux (VPS) com Docker; acesso por celular e computador.

**Project Type**: aplicação web.

**Performance Goals**: restauração completa em menos de 30 minutos; sistema de volta em menos de
2 minutos depois de reiniciar o servidor.

**Constraints**:
- um servidor só;
- sem e-mail;
- produção começa vazia;
- nada de senha em texto no log, no banco ou no aparelho.

**Scale/Scope**:
- 7 rotas novas ou alteradas e 1 removida;
- 1 tela nova (Criar nova senha) e 4 alteradas: Login, Usuários, lista e detalhe do painel;
- 6 arquivos de infraestrutura: compose de produção, `Caddyfile`, scripts de backup e restauração,
  `.env` de exemplo e roteiro.

## Constitution Check

| Princípio | Como o plano atende | Situação |
|---|---|---|
| I. Isolamento por fazenda | O dono só redefine senha de funcionário da própria fazenda (404 fora dela); o administrador é a única exceção, como já é no painel. | ✅ |
| II. Regras no backend | A troca obrigatória é imposta por um guard no servidor, não só pela tela. A regra de tamanho da senha, os limites e a recusa de tokens antigos também ficam no servidor. | ✅ |
| III. Histórico preservado | Nada é apagado; a troca de senha só grava a data. Backup diário com guarda de 4 semanas. | ✅ |
| IV. Feito para o curral | Senha salva pelo navegador; senha provisória curta e sem caracteres que se confundem. | ✅ |
| V. Verificação | Testes, migration na cópia, ensaio completo de produção e restauração na máquina local. | ✅ |
| VI. Simplicidade | Sem dependência nova de código; limites em memória; um servidor; serviços gratuitos de alerta. | ✅ |
| Restrições técnicas | Segredos em `.env` no servidor, documentados em `.env.producao.example`; migrations versionadas. | ✅ |

Complexity Tracking não se aplica.

## Project Structure

### Documentation (this feature)

```text
specs/007-preparacao-publicacao/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/api.md
└── tasks.md            # /speckit-tasks
```

### Source Code

```text
docker-compose.prod.yml                     # db, backend, frontend, caddy, backup, autoheal
.env.producao.example                       # variáveis de produção
deploy/
├── Caddyfile                               # HTTPS, /api, cabeçalhos
└── backup/
    ├── Dockerfile                          # postgres:16-alpine + rclone + cron
    ├── backup.sh                           # dump, guarda, envio, aviso
    └── restaurar.sh                        # baixa e restaura
docs/publicacao/Roteiro-de-publicacao.md    # servidor, domínio, subir, admin, atualizar, restaurar, alertas

backend/src/
├── saude/saude.controller.ts               # GET /saude (+ module)
├── common/limite-por-ip.guard.ts           # 60/min na consulta pública (+ spec)
├── database/migrations/…-Publicacao.ts
├── auth/
│   ├── auth.service.ts / .controller.ts    # trocar-senha; precisaTrocarSenha; sem registrar-fazenda
│   ├── senha-provisoria.ts                 # gerar senha provisória (+ spec)
│   ├── guards/senha-provisoria.guard.ts    # 403 SENHA_PROVISORIA (+ spec)
│   └── strategies/jwt.strategy.ts          # recusa token anterior à troca
├── usuario/usuario.service.ts / .controller.ts   # redefinir-senha (DONO); mínimo 8
├── modulos/admin/
│   ├── admin-fazendas.service.ts / admin.controller.ts  # criar fazenda; redefinir senha do dono
│   ├── admin-auth.service.ts               # trocar a própria senha
│   └── admin-jwt.strategy.ts               # recusa token anterior à troca
└── main.ts                                 # trust proxy

frontend/
├── Dockerfile                              # VITE_API_URL=/api no build de produção
└── src/
    ├── pages/Login.tsx                     # autoComplete; precisaTrocarSenha → /trocar-senha
    ├── pages/TrocarSenha.tsx               # nova
    ├── pages/Usuarios.tsx                  # Redefinir senha
    ├── components/Layout.tsx               # menu "Trocar minha senha"
    ├── api/client.ts                       # 403 SENHA_PROVISORIA → /trocar-senha
    └── modulos/admin/                      # Nova fazenda, redefinir senha do dono, trocar a própria
```

**Structure Decision**: aplicação web existente (`backend/`, `frontend/`), mais uma pasta `deploy/`
na raiz com a infraestrutura de produção e o roteiro em `docs/publicacao/`.
