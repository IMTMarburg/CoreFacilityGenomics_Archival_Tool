#!/usr/bin/env bash
DELETED_DIR=./deleted/ \
DATA_DIR=./data \
WORKING_DIR=./working \
ARCHIVE_DIR=./archive/ \
DELETE_DIR=./deleted \
DOWNLOAD_DIR=./downloads \
SECRETS_FILE=/secrets/cfat.json \
TEMPLATES_PATH='./static/mail_templates.toml' \
TIMES_PATH='./static/times.toml' \
/nix/store/lwa65frjampm06xi6b675bxqllsvgac1-python3-3.10.9-env/bin/python python/archival_tool.py $@
