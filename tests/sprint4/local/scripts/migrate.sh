#!/bin/bash
set -euo pipefail
for service in customer job dispatch reporting; do
  password_key="${service^^}_DB_PASSWORD"
  export MYSQL_PWD="${!password_key}"
  db="${service}db"
  mysql=(mysql --host=mysql --user="${service}_svc" "$db")
  ready=0
  for attempt in $(seq 1 60); do
    if "${mysql[@]}" -e 'SELECT 1' >/dev/null 2>&1; then ready=1; break; fi
    sleep 2
  done
  [ "$ready" = 1 ] || { echo "Database $db did not become ready"; exit 1; }
  "${mysql[@]}" -e 'CREATE TABLE IF NOT EXISTS schema_migrations (filename VARCHAR(255) NOT NULL PRIMARY KEY, applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP);'
  while IFS= read -r file; do
    filename=$(basename "$file")
    [[ "$filename" =~ ^V[0-9]+__[A-Za-z0-9_]+\.sql$ ]] || { echo 'Invalid migration filename'; exit 1; }
    applied=$("${mysql[@]}" --batch --skip-column-names -e "SELECT COUNT(*) FROM schema_migrations WHERE filename='$filename';")
    if [ "$applied" = 0 ]; then
      echo "Applying $service / $filename"
      "${mysql[@]}" < "$file"
      "${mysql[@]}" -e "INSERT INTO schema_migrations(filename) VALUES ('$filename');"
    fi
  done < <(find "/migrations/$service" -name 'V*.sql' | sort -V)
done
echo 'All database migrations applied.'
