# Roteiro de publicação

Como colocar o Controle Fazenda no ar num servidor próprio, com domínio, conexão segura, backup
diário na nuvem e alertas. Decisões em `specs/007-preparacao-publicacao/`.

Tempo estimado na primeira vez: 1 hora, sem contar a espera do domínio propagar.

## 1. O que contratar antes

| Item | Sugestão | Custo |
|---|---|---|
| Servidor (VPS) | Ubuntu 24.04, 2 GB de RAM, 1 ou 2 vCPU, 40 GB de disco | a partir de ~R$ 30/mês |
| Domínio | `.com.br` no Registro.br, ou outro | ~R$ 40/ano |
| Bucket do backup | Backblaze B2 (empresa diferente do servidor) | grátis até 10 GB |
| Alerta do site | UptimeRobot | grátis |
| Alerta do backup | Healthchecks.io | grátis |

## 2. Preparar o servidor

Entre no servidor pelo terminal (`ssh root@IP_DO_SERVIDOR`) e rode:

```bash
apt update && apt upgrade -y
adduser fazenda && usermod -aG sudo fazenda
ufw allow OpenSSH && ufw allow 80 && ufw allow 443 && ufw --force enable
curl -fsSL https://get.docker.com | sh
usermod -aG docker fazenda
```

Daí em diante, entre como `fazenda` (`ssh fazenda@IP_DO_SERVIDOR`).

O firewall só deixa passar SSH, 80 e 443. O banco e o backend nunca publicam porta: só o Caddy fala
com a internet.

## 3. Apontar o domínio

No painel do domínio, crie um registro **A** com o nome escolhido (ex.: `app`) apontando para o IP
do servidor. Confira (pode levar de minutos a algumas horas):

```bash
nslookup app.seudominio.com.br
```

O endereço que aparecer tem que ser o IP do servidor. Sem isso, o certificado não sai.

## 4. Bucket do backup (Backblaze B2)

1. Crie a conta e um bucket **privado** (ex.: `controle-fazenda-backup`).
2. Em *Application Keys*, crie uma chave com acesso **só a esse bucket**, leitura e escrita.
3. Anote o *keyID*, a *applicationKey* (aparece uma vez) e o *Endpoint* do bucket
   (ex.: `s3.us-east-005.backblazeb2.com`).

## 5. Alerta do backup (Healthchecks.io)

1. Crie a conta e um *check* com período de **1 dia** e tolerância (*grace*) de **2 horas**.
2. Copie a URL de ping (ex.: `https://hc-ping.com/xxxxxxxx-...`).
3. Em *Integrations*, deixe o e-mail ligado (e o app do celular, se quiser).

## 6. Baixar o sistema e configurar

```bash
git clone https://github.com/iallberto/Controle-Fazenda.git controle-fazenda
cd controle-fazenda
cp .env.producao.example .env
openssl rand -base64 32   # use como DB_PASSWORD
openssl rand -base64 48   # use como JWT_SECRET
nano .env
```

Se o repositório for privado, o GitHub pede usuário e um *token* de acesso (Settings → Developer
settings → Personal access tokens), com permissão só de leitura no repositório.

Preencha no `.env`:

- `DOMINIO`: o domínio, sem `https://`;
- `DB_PASSWORD` e `JWT_SECRET`: os valores gerados acima;
- `BACKUP_REMOTO=nuvem:controle-fazenda-backup/controle-fazenda`;
- `BACKUP_S3_ENDPOINT=https://` + o endpoint do bucket;
- `BACKUP_S3_CHAVE` e `BACKUP_S3_SEGREDO`: o keyID e a applicationKey;
- `BACKUP_AVISO_URL`: a URL de ping do Healthchecks.io.

Guarde uma cópia do `.env` num lugar seguro fora do servidor (gerenciador de senhas): sem ele não
dá para restaurar os logins depois de perder o servidor.

## 7. Subir

```bash
docker compose -f docker-compose.prod.yml --env-file .env up -d --build
docker compose -f docker-compose.prod.yml ps
```

A primeira subida leva alguns minutos (constrói as imagens e aplica as migrations no banco vazio).
Todos os serviços devem aparecer como `running` e, depois de um minuto, `healthy`.

Confira no navegador: `https://SEU_DOMINIO` abre a tela de login, com cadeado, e
`https://SEU_DOMINIO/api/saude` mostra `{"status":"ok"}`.

## 8. Criar o administrador

```bash
docker compose -f docker-compose.prod.yml exec backend npm run admin:criar
```

Informe e-mail, nome e senha (12 caracteres ou mais, com letras e números). Entre em
`https://SEU_DOMINIO/admin/login`.

O mesmo comando redefine a senha do administrador, se ele for esquecido.

## 9. Conferir a segurança

De outro computador:

```bash
curl -sI https://SEU_DOMINIO | grep -iE "strict-transport|x-frame|x-content-type"
curl -sI http://SEU_DOMINIO | head -1          # deve redirecionar (308) para https
curl -s https://SEU_DOMINIO/api/docs | head -c 100   # não deve mostrar a documentação
nc -zv -w 3 IP_DO_SERVIDOR 5432                # deve falhar (banco fechado)
nc -zv -w 3 IP_DO_SERVIDOR 3000                # deve falhar (backend fechado)
```

## 10. Backup

Rode um backup na hora e confira:

```bash
docker compose -f docker-compose.prod.yml exec backup backup.sh
docker compose -f docker-compose.prod.yml exec backup restaurar.sh --listar
```

O arquivo do dia aparece em `diarios/`, e o Healthchecks.io marca o check como *up*. Daí em diante,
o backup roda sozinho às 03:00. Diários ficam 7 dias; o de domingo fica 4 semanas.

## 11. Alerta do site (UptimeRobot)

1. Crie um monitor **HTTP(s) – Keyword** para `https://SEU_DOMINIO/api/saude`, procurando a palavra
   `ok`, a cada 5 minutos.
2. Em *Alert contacts*, ligue o e-mail e o app do celular.

O UptimeRobot avisa quando o site cai e quando volta.

## 12. Primeiros clientes

No painel do administrador: **Nova fazenda** → nome da fazenda, nome e e-mail do dono. Entregue a
senha provisória ao dono (ela aparece uma vez). Na fazenda, libere os módulos contratados.

## Rotina

### Atualizar para uma versão nova

```bash
cd ~/controle-fazenda
docker compose -f docker-compose.prod.yml exec backup backup.sh
git pull
docker compose -f docker-compose.prod.yml --env-file .env up -d --build
docker compose -f docker-compose.prod.yml ps
```

As migrations rodam sozinhas quando o backend sobe. Confira `https://SEU_DOMINIO/api/saude`.

### Restaurar um backup

```bash
docker compose -f docker-compose.prod.yml exec backup restaurar.sh --listar
docker compose -f docker-compose.prod.yml stop backend
docker compose -f docker-compose.prod.yml exec backup restaurar.sh diarios/controle_fazenda_AAAA-MM-DD.dump
docker compose -f docker-compose.prod.yml start backend
```

Sem o nome do arquivo, usa o diário mais recente. No fim, mostra os registros por tabela. No ensaio,
a restauração de um banco pequeno a partir do bucket levou menos de 30 segundos.

### Conferir um backup sem mexer no banco em uso

Uma vez por mês, vale restaurar o backup mais recente num banco separado e olhar as contagens:

```bash
docker compose -f docker-compose.prod.yml exec db createdb -U postgres conferencia
docker compose -f docker-compose.prod.yml exec -e RESTAURAR_EM=conferencia backup restaurar.sh
docker compose -f docker-compose.prod.yml exec db dropdb -U postgres conferencia
```

Servidor perdido: contrate outro, refaça os passos 2, 3 e 6 com o **mesmo `.env`**, suba (passo 7)
e restaure como acima. O DNS precisa apontar para o IP novo.

### Ver o que está acontecendo

```bash
docker compose -f docker-compose.prod.yml logs --tail 100 backend
docker compose -f docker-compose.prod.yml logs --tail 100 caddy
docker compose -f docker-compose.prod.yml logs --tail 50 backup
```

Os bloqueios de login e da consulta pública aparecem no log do backend, sem senhas.

### Problemas comuns

- **Sem cadeado / erro de certificado**: o domínio ainda não aponta para o servidor (passo 3) ou as
  portas 80 e 443 estão fechadas no firewall da hospedagem. Veja o log do `caddy`.
- **Site fora e UptimeRobot avisando**: `docker compose -f docker-compose.prod.yml ps`; um serviço
  travado é reiniciado sozinho pelo `autoheal` em poucos minutos.
- **Healthchecks.io avisou que o backup não rodou**: veja o log do `backup` e rode `backup.sh` na hora.
