# Contratos: Implantação assistida

Em produção, sob `https://<domínio>/api`.

## Acesso de suporte

| Rota | Quem | Resposta |
|---|---|---|
| `POST /admin/fazendas/:id/suporte` | ADMIN | 201 `{ accessToken, usuario: { …, suporte: true }, fazenda: { id, nome, suspensa } }` — abre a sessão e devolve o token de fazenda do usuário suporte |
| `GET /admin/fazendas/:id` *(alterada)* | ADMIN | + `sessoesSuporte: [{ administrador, entradaEm, saidaEm, expirada }]` (últimas 20) e `acesso` (abaixo) |
| `POST /auth/encerrar-suporte` | token de suporte | 200 — grava a saída |
| `POST /auth/login` *(alterada)* | público | 401 para usuário suporte |

Erros: 401 quando a sessão de suporte saiu ou passou de 8 h; 403 `{ codigo: 'ACAO_SO_DO_DONO' }` em
Usuários e troca de senha com token de suporte.

## Prazo de acesso

| Rota | Quem | Corpo | Resposta |
|---|---|---|---|
| `GET /fazenda/acesso` | logado | — | `{ situacao, acessoAte, diasRestantes, diasCarencia, whatsappSuporte }`; para o dono também `{ valorCentavos, pixChave, modulosPlano }` |
| `POST /admin/fazendas/:id/teste` | ADMIN | `{ modulos: ModuloPago[] }` | 201 — `acessoAte = hoje + 30`; 409 se a fazenda já tem prazo ou é sem prazo |
| `POST /admin/fazendas/:id/pagamento` | ADMIN | `{ valorCentavos? }` (padrão: preço do plano) | 201 — `acessoAte = max(acessoAte, hoje) + 30` |
| `POST /admin/fazendas/:id/prazo` | ADMIN | `{ acessoAte }` | 201 — extensão |
| `POST /admin/fazendas/:id/sem-prazo` | ADMIN | — | 201 — cliente sem prazo |
| `PATCH /admin/fazendas/:id` | ADMIN | `{ telefoneContato }` | 200 |
| `GET /admin/vencimentos` | ADMIN | — | `[{ fazendaId, nome, dono: { nome, email }, telefoneContato, acessoAte, situacao, valorCentavos }]` |
| `GET /admin/precos` / `PUT /admin/precos` | ADMIN | `{ PACOTE_INICIAL, LEITE, FINANCEIRO, NUTRICAO }` em centavos | preços |

Erro comum: 403 `{ codigo: 'FAZENDA_SO_CONSULTA', situacao }` em qualquer lançamento de fazenda
aguardando implantação ou vencida (exceto suporte e troca de senha).

## Etiquetas

| Rota | Quem | Resposta |
|---|---|---|
| `GET /codigo/etiquetas.pdf?ids=…` ou `?numeroDe=&numeroAte=` | DONO (inclui suporte) | `application/pdf`, A4, 24 etiquetas por folha; 409 `DOMINIO_NAO_DEFINIDO` sem `URL_PUBLICA` válida |

## Telas

- **Faixa de suporte** (todas as telas da fazenda): "Você está na <fazenda> como suporte · Sair".
- **Aviso do prazo** (topo, dono): teste/em dia com N dias; nos últimos 5 dias, carência e vencido: valor,
  chave Pix (copiar) e "Enviar comprovante no WhatsApp". Funcionário: só "Fazenda só para consulta" quando
  vencida ou aguardando implantação.
- **QR codes**: "Gerar etiquetas (PDF)" para o lote ou os códigos marcados.
- **Ajuda** (`/ajuda`, menu): botão "Falar com o suporte no WhatsApp".
- **Painel**: no detalhe da fazenda, "Entrar como suporte", "Liberar teste de 30 dias" (módulos), "Confirmar
  pagamento", "Estender prazo", "Cliente sem prazo", telefone de contato, sessões de suporte; páginas
  "Próximos a vencer" e "Preços".
