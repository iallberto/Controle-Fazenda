# Quickstart: validar a implantação assistida

Contratos em [contracts/api.md](./contracts/api.md); decisões em [research.md](./research.md).

## Pré-requisitos

- Migration primeiro na cópia (backup, contagens, `migration:generate` sem mudanças), depois no dev.
- Conferir que todas as fazendas existentes ficaram "sem prazo" e seguem lançando.
- `URL_PUBLICA` vazia no dev; um teste com `URL_PUBLICA=https://exemplo.com.br` para o PDF.

## Cenários

### 1. Suporte (US1)

1. Administrador cria uma fazenda e entra como suporte. **Esperado**: faixa com o nome da fazenda; registro
   da entrada no painel.
2. Gera 30 códigos, cadastra 2 animais e lança uma pesagem. **Esperado**: histórico com "Suporte · <nome>".
3. Abre Usuários ou tenta trocar a senha. **Esperado**: recusado.
4. Usuário suporte tenta login por senha. **Esperado**: 401.
5. "Sair". **Esperado**: volta ao painel; saída registrada; o token de suporte deixa de valer.
6. Sessão com mais de 8 h (simulada). **Esperado**: 401.
7. Lista de Usuários do dono e contagem do painel. **Esperado**: o suporte não aparece.

### 2. Etiquetas (US2)

1. Sem `URL_PUBLICA`. **Esperado**: 409 `DOMINIO_NAO_DEFINIDO` e aviso na tela.
2. Com `URL_PUBLICA`, gera o PDF de 30 códigos. **Esperado**: 2 folhas A4; etiquetas de 57 × 32 mm; QR de
   28 mm que leva a `URL_PUBLICA/a/<código>`; número sem zeros à esquerda; marcas de corte.
3. Só 2 códigos escolhidos. **Esperado**: PDF com 2 etiquetas.

### 3. Prazo e Pix (US3)

1. Fazenda nova, antes do teste. **Esperado**: dono só consulta ("Aguardando implantação"); suporte lança.
2. Libera teste com o Leite. **Esperado**: 30 dias; pacote inicial e Leite ativos; Financeiro não.
3. Simula 4 dias para o fim. **Esperado**: aviso com valor (pacote + Leite), chave Pix e botão do WhatsApp.
4. Simula 1 dia depois do fim. **Esperado**: carência, ainda lança, aviso.
5. Simula 3 dias depois do fim. **Esperado**: só consulta (pacote e Leite); 403 `FAZENDA_SO_CONSULTA`.
6. Confirma pagamento no painel. **Esperado**: mais 30 dias a partir de hoje; volta a lançar; registro
   com valor.
7. "Próximos a vencer". **Esperado**: a fazenda aparece enquanto o prazo está a 7 dias ou menos.

### 4. Ajuda (US4)

1. "Ajuda" no menu, no celular. **Esperado**: botão abre `wa.me/5535984776552` com a mensagem e o nome da
   fazenda.
