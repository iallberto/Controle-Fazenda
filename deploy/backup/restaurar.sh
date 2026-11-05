#!/bin/sh
# Restauração do banco a partir de um backup (spec 007, FR-018).
# Pare o backend antes e suba depois (o roteiro mostra os comandos):
#   docker compose -f docker-compose.prod.yml stop backend
#   docker compose -f docker-compose.prod.yml exec backup restaurar.sh [arquivo]
#   docker compose -f docker-compose.prod.yml start backend
# Sem argumento, usa o diário mais recente. Com --listar, só mostra os backups.
# Busca primeiro no bucket (BACKUP_REMOTO); sem bucket, usa os do servidor.
set -eu
[ -f /etc/backup.env ] && . /etc/backup.env

DIR=/backups
PASTA="$DIR/restaurar"
mkdir -p "$PASTA"

listar() {
  if [ -n "${BACKUP_REMOTO:-}" ]; then
    rclone lsf "$BACKUP_REMOTO" --recursive --files-only --include '*.dump' | sort
  else
    (cd "$DIR" && find diarios semanais -name '*.dump' 2>/dev/null | sort)
  fi
}

if [ "${1:-}" = "--listar" ]; then
  listar
  exit 0
fi

ESCOLHIDO="${1:-$(listar | grep '^diarios/' | tail -n 1)}"
[ -n "$ESCOLHIDO" ] || { echo "Nenhum backup encontrado."; exit 1; }

if [ -n "${BACKUP_REMOTO:-}" ]; then
  echo "Baixando $ESCOLHIDO do bucket..."
  rclone copyto "$BACKUP_REMOTO/$ESCOLHIDO" "$PASTA/backup.dump"
else
  cp "$DIR/$ESCOLHIDO" "$PASTA/backup.dump"
fi

# RESTAURAR_EM: outro banco (já criado e vazio) para conferir um backup sem
# tocar no banco em uso. Ex.: docker compose ... exec -e RESTAURAR_EM=teste backup restaurar.sh
BANCO="${RESTAURAR_EM:-$PGDATABASE}"

echo "Restaurando $ESCOLHIDO em $BANCO..."
pg_restore --clean --if-exists --no-owner --exit-on-error -d "$BANCO" "$PASTA/backup.dump"
rm -f "$PASTA/backup.dump"

echo "Restauração concluída. Registros por tabela:"
psql -d "$BANCO" -At -F ' ' -c "
  SELECT table_name, (xpath('/row/c/text()', query_to_xml(format('select count(*) as c from public.%I', table_name), false, true, '')))[1]::text
  FROM information_schema.tables
  WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
  ORDER BY table_name"
