# Quickstart: validar Cobertura e Inseminação

Roteiro para provar, de ponta a ponta, que a feature funciona. Rotas e regras de cada passo
estão em [contracts/api.md](./contracts/api.md) e [data-model.md](./data-model.md).

## Pré-requisitos

- Docker Desktop ligado e o sistema no ar:

  ```bash
  docker compose up -d --build
  ```

- **Fazenda de teste isolada** (constituição, princípio V): nunca validar com a fazenda real.
  Criar uma fazenda nova pelo registro, com um dono e um funcionário, e cadastrar:
  - 2 pastos ("Pasto Monta" e "Pasto Maternidade");
  - 1 touro e, no Pasto Monta, 6 fêmeas: 4 Matrizes e 2 Novilhas;
  - 1 matriz com parto registrado há 20 dias (para conferir que ela **não** fica apta).
- Backend: `npm test` passando e `npx tsc --noEmit` sem erros; frontend: `tsc -b` e `eslint` limpos.

## Cenários

Executar no navegador em largura de celular (375 px), logado como **funcionário**, salvo quando
indicado.

### 1. Estação de monta (User Story 1)

1. Reprodução → Estações → Nova estação: escolher o touro e o Pasto Monta.
   **Esperado**: 6 fêmeas aptas listadas, todas marcadas; a matriz parida há 20 dias **não** aparece.
2. Desmarcar uma novilha sem motivo e confirmar. **Esperado**: bloqueio pedindo o motivo.
3. Informar o motivo e confirmar. **Esperado**: aviso "Estação aberta com 5 fêmeas. 1 ficou de fora".
4. Tentar abrir outra estação com o mesmo touro. **Esperado**: recusa informando a estação aberta.
5. Mover uma das fêmeas expostas para o Pasto Maternidade (Mover animal).
   **Esperado**: na estação, a exposição dela termina na data da movimentação.

### 2. Diagnóstico em lote (User Story 2)

1. Reprodução → Diagnóstico: grupo Pasto Monta; marcar 3 Prenhe (uma com "2 meses e 10 dias") e
   1 Vazia; método Toque. **Esperado**: aviso "3 prenhes e 1 vazia registradas".
2. Abrir uma das prenhes. **Esperado**: status Prenha e previsão de parto; a que teve idade
   informada mostra "estimada pelo toque", as outras "estimada pela estação".
3. Tentar registrar diagnóstico no touro. **Esperado**: recusa.

### 3. Vacas a parir (User Story 3)

1. Relatórios → Vacas a parir, janela 90 dias (ajustar datas de teste para cair na janela).
   **Esperado**: as prenhes em ordem de previsão, com touro e pasto.

### 4. Parto ligado à cobertura (User Story 4)

1. Registrar o parto de uma prenhe exposta só a esse touro, cria viva.
   **Esperado**: cria com o touro como pai; mãe com status Lactante.
2. Registrar o parto de uma **Novilha** prenhe. **Esperado**: parto aceito e ela vira Matriz.
3. Com uma fêmea exposta a dois touros (duas estações no mesmo pasto), registrar o parto.
   **Esperado**: pai em branco com os dois candidatos; o dono escolhe um depois.

### 5. Inseminação (User Story 5)

1. Reprodução → Sêmen: cadastrar com 2 doses. Registrar 2 inseminações.
   **Esperado**: estoque 0.
2. Tentar uma terceira. **Esperado**: "sêmen sem doses".
3. Como **dono**, cancelar uma inseminação com motivo. **Esperado**: estoque volta a 1; o registro
   aparece cancelado no histórico do animal.

### 6. Correções só pelo dono (FR-026)

1. Como funcionário, procurar editar ou cancelar um diagnóstico. **Esperado**: opção ausente na
   tela; chamada direta à API responde 403.
2. Como dono, cancelar um diagnóstico Prenhe (o último da fêmea). **Esperado**: status recalculado
   a partir do evento anterior.

### 7. Indicadores (User Story 6)

1. Relatórios → Indicadores reprodutivos. **Esperado**: taxa de prenhez da estação = prenhes ÷
   (prenhes + vazias), conferida à mão; fêmeas sem diagnóstico contadas à parte.

### 8. Isolamento (SC-006)

1. Logado na fazenda real, abrir a URL de uma estação da fazenda de teste. **Esperado**: 404.

## Limpeza

A fazenda de teste pode ficar no banco local; não aparece para outras fazendas.
