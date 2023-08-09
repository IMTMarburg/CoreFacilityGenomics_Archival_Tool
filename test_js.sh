#/usr/bin/env bash
mkdir -p data/events
mkdir -p data/tasks
mkdir -p data/downloads
DATA_DIR=./data REMOTE_USER=flo DOWNLOAD_DIR=./runs/downloads/ yarn dev
