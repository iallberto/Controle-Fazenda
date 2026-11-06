# Data Model: Implantação assistida

Migration nova: `ImplantacaoAssistida` (primeiro na cópia, como sempre).

## Fazenda *(existente, `fazendas`)*

| Campo | Tipo | Regra |
|---|---|---|
| `semPrazo` | boolean, padrão `false` | Migration marca `true` nas fazendas existentes (R7). Confirmar contratação sem prazo no painel liga. |
| `acessoAte` | date, nulo | Último dia do prazo pago ou de teste. Nulo e `semPrazo = false` = aguardando implantação. |
| `modulosPlano` | lista de `ModuloPago` (texto), padrão vazia | Módulos pagos incluídos no teste e nas renovações. |
| `telefoneContato` | varchar(30), nulo | Contato do cliente para cobrança, editado no painel. |

Situação calculada (R3): `SEM_PRAZO`, `AGUARDANDO_IMPLANTACAO`, `EM_DIA`, `CARENCIA` (até 2 dias depois de
`acessoAte`), `VENCIDO`.

## Usuario *(existente, `usuarios`)*

| Campo | Tipo | Regra |
|---|---|---|
| `suporte` | boolean, padrão `false` | Usuário criado pelo acesso de suporte (R1): papel DONO, não entra por senha, fica fora das listas e contagens (R2). Um por administrador e fazenda. |

## SessaoSuporte *(nova, `sessoes_suporte`)*

| Campo | Tipo | Regra |
|---|---|---|
| `id` | uuid | |
| `administradorId` | uuid → administradores | Quem entrou |
| `fazendaId` | uuid → fazendas | Onde |
| `usuarioId` | uuid → usuarios | O usuário suporte usado |
| `entradaEm` | timestamptz | |
| `saidaEm` | timestamptz, nulo | Preenchido em "Sair"; nulo + mais de 8 h = expirada |

## RegistroAcesso *(nova, `registros_acesso`)*

Histórico do prazo da fazenda, só inserção.

| Campo | Tipo | Regra |
|---|---|---|
| `id` | uuid | |
| `fazendaId` | uuid | |
| `tipo` | enum `TESTE`, `PAGAMENTO`, `EXTENSAO`, `SEM_PRAZO` | |
| `de` | date, nulo | Fim anterior (nulo no teste) |
| `ate` | date, nulo | Novo fim (nulo em SEM_PRAZO) |
| `modulos` | lista de `ModuloPago` | Módulos do plano naquele momento |
| `valorCentavos` | int, nulo | Só em PAGAMENTO |
| `administradorId` | uuid | Quem registrou |
| `criadoEm` | timestamptz | |

## PrecoPlano *(nova, `precos_plano`)*

| Campo | Tipo | Regra |
|---|---|---|
| `item` | enum `PACOTE_INICIAL`, `LEITE`, `FINANCEIRO`, `NUTRICAO` (chave) | Uma linha por item |
| `valorCentavos` | int ≥ 0 | Editado no painel; começa em 0 |
| `atualizadoEm` | timestamptz | |

Valor da renovação = `PACOTE_INICIAL` + soma dos `modulosPlano`.

## ModuloFazenda *(existente)*

Sem campos novos. Teste e renovações criam ou estendem períodos dos módulos do plano até `acessoAte + 2`
(R4).

## Configuração do servidor (variáveis)

`URL_PUBLICA` (ex.: `https://app.dominio.com.br`), `PIX_CHAVE`, `SUPORTE_WHATSAPP` (`5535984776552`).
