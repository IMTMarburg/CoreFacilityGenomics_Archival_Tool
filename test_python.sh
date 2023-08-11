#!/usr/bin/env bash
mkdir -p data/events
mkdir -p data/tasks
mkdir -p runs/downloads
mkdir -p runs/deleted
mkdir -p runs/working
mkdir -p runs/archive

DATA_DIR=./data \
WORKING_DIR=./runs/working \
ARCHIVE_DIR=./runs/archive/ \
DELETE_DIR=./deleted \
DOWNLOAD_DIR=./runs/downloads \
SECRETS_FILE=/secrets/cfat.json \
TEMPLATES_PATH='./static/mail_templates.toml' \
TIMES_PATH='./static/times.toml' \
/nix/store/lwaq5n2iy7gc4fr25d6iaa3nm6hdzisp-python3-3.10.9-env/bin/python  python/archival_tool.py $@
