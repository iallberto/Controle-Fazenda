#!/bin/sh
# O cron não repassa as variáveis do container para o job: elas ficam num
# arquivo que o backup.sh e o restaurar.sh carregam.
set -eu
export -p > /etc/backup.env
chmod 600 /etc/backup.env
echo "[backup] agendado para 03:00 ($(date +%Z)); remoto: ${BACKUP_REMOTO:-nenhum}"
exec crond -f -l 8
