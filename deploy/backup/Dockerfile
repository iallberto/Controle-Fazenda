# Backup diário do banco (spec 007, R4): pg_dump às 03:00 (horário de
# Brasília), guarda local e cópia num bucket S3 compatível com rclone.
FROM postgres:16-alpine

RUN apk add --no-cache rclone curl tzdata     && mkdir -p /root/.config/rclone && touch /root/.config/rclone/rclone.conf

COPY backup.sh restaurar.sh entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/backup.sh /usr/local/bin/restaurar.sh /usr/local/bin/entrypoint.sh \
    && echo '0 3 * * * /usr/local/bin/backup.sh > /proc/1/fd/1 2>&1' > /etc/crontabs/root

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
