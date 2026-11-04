# API Contracts: Infraestrutura de Módulos (Fase 0)

Datas `AAAA-MM-DD`; ids de rota validados como UUID. Erros no formato padrão do Nest
(`{ statusCode, message, error }`), com o campo extra `codigo` quando a tela precisa distinguir.

---

## Área da fazenda (token de fazenda)

### `GET /fazenda/modulos` — dono e funcionário (FR-013)

```json
[
  { "modulo": "LEITE", "situacao": "NAO_CONTRATADO", "dataTermino": null, "diasParaVencer": null },
  { "modulo": "FINANCEIRO", "situacao": "ATIVO", "dataTermino": "2026-11-12", "diasParaVencer": 8 },
  { "modulo": "NUTRICAO", "situacao": "SO_CONSULTA", "dataTermino": null, "diasParaVencer": null }
]
```

Sempre os três módulos, nessa ordem. `situacao` ∈ `ATIVO | SO_CONSULTA | NAO_CONTRATADO` (R3).
O aviso de vencimento (FR-016a) é decidido na tela: dono e `diasParaVencer` entre 0 e 10.

### Rotas de módulo pago (FR-009 a FR-012)

Toda rota sob `/modulos/leite`, `/modulos/financeiro` e `/modulos/nutricao`:

| Situação da fazenda no módulo | `GET` (consulta) | `POST`/`PATCH`/`DELETE` (lançamento) |
|---|---|---|
| ATIVO | atende | atende |
| SO_CONSULTA | atende | **403** `{ codigo: "MODULO_SO_CONSULTA", message: "Módulo desativado: só consulta" }` |
| NAO_CONTRATADO | **403** `{ codigo: "MODULO_NAO_CONTRATADO", message: "Módulo não contratado" }` | **403** idem |

Rotas de exemplo desta fase (R11), uma por módulo:

| Método e rota | Resposta |
|---|---|
| `GET /modulos/<modulo>/exemplo` | `{ modulo, acao: "CONSULTA", ok: true }` |
| `POST /modulos/<modulo>/exemplo` | `{ modulo, acao: "LANCAMENTO", ok: true }` |

### Fazenda suspensa (FR-026)

- `POST /auth/login` de usuário de fazenda suspensa → **403**
  `{ codigo: "ACESSO_SUSPENSO", message: "Acesso suspenso · fale com o suporte" }`.
- Qualquer rota autenticada de fazenda suspensa → **403** com o mesmo corpo (o frontend limpa a
  sessão e volta ao login com o aviso).

### Página pública do animal (FR-028)

`GET /publico/animal/:codigo` ganha a situação `FAZENDA_SUSPENSA`:

```json
{
  "situacao": "FAZENDA_SUSPENSA",
  "fazenda": "Fazenda Exemplo",
  "animal": { "brinco": "12", "raca": "Nelore", "sexo": "F", "categoria": "MATRIZ" }
}
```

Sem `pesoAtual`, `pesagens`, `tratamentos`, `dataNascimento`, `origem` nem `maeBrinco`.

---

## Área do administrador (token de administrador, `aud: "admin"`)

Token de fazenda nessas rotas → **401**. Token de administrador nas rotas de fazenda → **401**
(FR-018).

### `POST /admin/auth/login` — público

Corpo `{ email, senha }`. Respostas:

- **201** `{ accessToken, administrador: { id, nome, email } }`;
- **401** "E-mail ou senha inválidos";
- **429** `{ codigo: "LOGIN_BLOQUEADO", message: "Muitas tentativas. Tente de novo em N minutos" }`
  depois de 5 falhas seguidas em 15 minutos (FR-018a).

Toda chamada grava uma linha em `admin_tentativas_login`.

### Fazendas

| Método e rota | Corpo / query | Resposta |
|---|---|---|
| `GET /admin/fazendas` | `?busca=` (nome, parcial, sem acento) | lista: `{ id, nome, criadaEm, usuariosAtivos, suspensa, modulos: [{ modulo, situacao, dataTermino }] }` (FR-019) |
| `GET /admin/fazendas/:id` | | a mesma linha + `periodos[]` (todos os períodos de módulos, com quem liberou/desativou) + `suspensoes[]` |
| `POST /admin/fazendas/:id/modulos` | `{ modulo, dataInicio, dataTermino? }` | **201** período; **400** término < início; **409** "Este módulo já está liberado para esta fazenda" (FR-020) |
| `POST /admin/modulos/:periodoId/desativar` | | período desativado; **400** se já desativado |
| `POST /admin/fazendas/:id/suspender` | `{ motivo }` (1 a 200 caracteres) | suspensão aberta; **400** se já suspensa (FR-025) |
| `POST /admin/fazendas/:id/reativar` | | suspensão fechada; **400** se não suspensa |

Nenhuma rota do administrador devolve animais, partos, pesagens, tratamentos, reprodução,
pastos ou relatórios (FR-021). Cada liberação, desativação, suspensão e reativação limpa o
cache de módulos daquela fazenda (R5) e grava quem fez e quando (FR-023).

---

## Comando no servidor

`npm run admin:criar` (no container: `docker compose exec backend npm run admin:criar`):
pergunta nome, e-mail e senha (sem eco), valida a senha forte e cria o administrador. Recusa
e-mail repetido. Serve também para redefinir a senha de um e-mail existente, com confirmação.
