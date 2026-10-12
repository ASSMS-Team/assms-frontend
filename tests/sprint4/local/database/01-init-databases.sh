#!/bin/bash
set -euo pipefail
for service in customer job dispatch reporting; do
  password_key="${service^^}_DB_PASSWORD"
  password="${!password_key}"
  # Values are generated alphanumerically; never concatenate arbitrary SQL input.
  [[ "$password" =~ ^[A-Za-z0-9]+$ ]] || { echo 'Use setup_local_config.py to generate database credentials.'; exit 1; }
  MYSQL_PWD="$MYSQL_ROOT_PASSWORD" mysql --protocol=socket -u root <<SQL
CREATE DATABASE ${service}db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER '${service}_svc'@'%' IDENTIFIED BY '${password}';
GRANT ALL PRIVILEGES ON ${service}db.* TO '${service}_svc'@'%';
SQL
done
