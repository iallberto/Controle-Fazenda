#!/bin/sh
# Backup do banco (spec 007, FR-016, FR-017, FR-019).
#  1. pg_dump em formato custom (cópia consistente, sem metade de operação);
#  2. guarda em /backups/diarios e, no domingo, também em /backups/semanais;
#  3. envia para o bucket (BACKUP_REMOTO, ex.: nuvem:meu-bucket/controle-fazenda);
#  4. apaga diários com mais de 7 dias e semanais com mais de 28, aqui e no bucket;
#  5. avisa o Healthchecks.io no sucesso (BACKUP_AVISO_URL) e em /fail no erro.
# Rodar na hora:  docker compose -f docker-compose.prod.yml exec backup backup.sh
set -u
[ -f /etc/backup.env ] && . /etc/backup.env

DIR=/backups
HOJE=$(date +%F)
ARQUIVO="$DIR/diarios/controle_fazenda_$HOJE.dump"

avisar() {
  if [ -n "${BACKUP_AVISO_URL:-}" ]; then
    curl -fsS -m 10 --retry 3 "${BACKUP_AVISO_URL}$1" > /dev/null || echo "[backup] não consegui avisar o monitoramento"
  fi
}

falhar() {
  echo "[backup] $(date '+%F %T') ERRO: $1"
  avisar /fail
  exit 1
}

echo "[backup] $(date '+%F %T') início"
mkdir -p "$DIR/diarios" "$DIR/semanais" || falhar "não consegui criar as pastas"

pg_dump -Fc -f "$ARQUIVO.parcial" || falhar "pg_dump falhou"
mv "$ARQUIVO.parcial" "$ARQUIVO" || falhar "não consegui gravar o arquivo"
pg_restore --list "$ARQUIVO" > /dev/null || falhar "o arquivo gerado não é um backup válido"

# Domingo (7): cópia semanal
if [ "$(date +%u)" = "7" ]; then
  cp "$ARQUIVO" "$DIR/semanais/" || falhar "não consegui gravar a cópia semanal"
fi

# Guarda: 7 dias de diários e 4 semanas de semanais
find "$DIR/diarios" -name '*.dump' -mtime +6 -delete
find "$DIR/semanais" -name '*.dump' -mtime +27 -delete

if [ -n "${BACKUP_REMOTO:-}" ]; then
  rclone copy "$DIR" "$BACKUP_REMOTO" --include '*.dump' --stats-log-level NOTICE \
    || falhar "envio para $BACKUP_REMOTO falhou"
  # A partir da raiz do remoto: funciona mesmo antes de existir a pasta semanais/
  rclone delete "$BACKUP_REMOTO" --include 'diarios/*.dump' --min-age 7d     || falhar "limpeza dos diários no remoto falhou"
  rclone delete "$BACKUP_REMOTO" --include 'semanais/*.dump' --min-age 28d     || falhar "limpeza dos semanais no remoto falhou"
else
  echo "[backup] ATENÇÃO: BACKUP_REMOTO vazio; cópia só neste servidor"
fi

TAMANHO=$(du -h "$ARQUIVO" | cut -f1)
echo "[backup] $(date '+%F %T') ok: $(basename "$ARQUIVO") ($TAMANHO)"
avisar ""
