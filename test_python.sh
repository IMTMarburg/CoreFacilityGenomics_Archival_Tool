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
SECRETS_FILE=./fake_secrets.json \
TEMPLATES_PATH='./static/mail_templates.toml' \
TIMES_PATH='./static/times.toml' \
cfgat_archival_worker python/archival_tool.py $@
