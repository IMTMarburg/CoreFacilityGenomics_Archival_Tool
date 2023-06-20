# sveltekit-nix

Reproducible builds for Sveltekit using Nix flakes.

## One-liner for testing

```
ORIGIN=http://localhost:3000 nix run github:knarkzel/sveltekit-nix
```

## Development

```
cd ./
nix develop
# now something like this to run the webserver.
DATA_DIR=./data REMOTE_USER=flo DOWNLOAD_DIR=./downloads/ yarn dev
(port / url will be printed)

# and something like this to run the background task
DELETED_DIR=./deleted/ DATA_DIR=./data WORKING_DIR=./working ARCHIVE_DIR=./archive/ DELETE_DIR=./deleted DOWNLOAD_DIR=./downloads SECRETS_FILE=/secrets/cfat.json python python/archival_tool.py
```
