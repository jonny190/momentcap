#!/bin/sh
set -e

# A host folder mapped to /data is usually owned by root. Fix that once,
# then run the app as the unprivileged user.
if [ "$(id -u)" = "0" ]; then
  mkdir -p "${DATA_DIR:-/data}"
  if [ "$(stat -c %u "${DATA_DIR:-/data}")" != "1001" ]; then
    chown -R nextjs:nodejs "${DATA_DIR:-/data}"
  fi
  exec su-exec nextjs "$@"
fi

exec "$@"
