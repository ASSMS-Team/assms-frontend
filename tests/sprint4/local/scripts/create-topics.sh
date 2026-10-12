#!/bin/bash
set -euo pipefail
for topic in job-created job-assigned job-status-changed; do
  partitions=1
  if [ "$topic" = job-status-changed ]; then partitions=3; fi
  /opt/kafka/bin/kafka-topics.sh --bootstrap-server kafka:29092 --create --if-not-exists --topic "$topic" --partitions "$partitions" --replication-factor 1
done
