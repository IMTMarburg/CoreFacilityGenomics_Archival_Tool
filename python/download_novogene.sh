#!/usr/bin/env bash
set -euo pipefail

BATCH_NO="${1:?Usage: $0 BATCH_NO PASSWORD}"
PASSWORD="${2:?Usage: $0 BATCH_NO PASSWORD}"

DOWNLOAD_DIR="${WORKING_DIR}/Novogene/${BATCH_NO}"
META_DIR="${WORKING_DIR}/Novogene/meta/${BATCH_NO}"
SENTINEL="${META_DIR}/done"

if [[ -f "$SENTINEL" ]]; then
    echo "Batch $BATCH_NO already complete, skipping."
    exit 0
fi

mkdir -p "$DOWNLOAD_DIR"
mkdir -p "$META_DIR"

if [[ ! -f $META_DIR/downloads.txt ]]; then
    curl -s -X POST https://data-deliver.novogene.com/api/user/Login \
        -H "Content-Type: application/x-www-form-urlencoded" \
        --data-urlencode "UserName=$BATCH_NO" \
        --data-urlencode "Password=$PASSWORD" \
        -c $META_DIR/cookies.txt \
        -o $META_DIR/response.json

    TOKEN=$(jq -r .User.token < $META_DIR/response.json)

    curl -s -b $META_DIR/cookies.txt -H "Token: $TOKEN" \
        "https://data-deliver.novogene.com/api/file/GetBatchFiles?BatchNo=$BATCH_NO" \
        | jq -r '.Files[].Endpoint' > $META_DIR/downloads.txt

    echo "Found $(wc -l < $META_DIR/downloads.txt) files to download."
else
    echo "$META_DIR/downloads.txt exists, skipping login and fetch."
fi

FAILED=0
while IFS= read -r url; do
    wget \
        --continue \
        --tries=5 \
        --waitretry=10 \
        --progress=bar:force \
        -P "$DOWNLOAD_DIR" \
        "$url" || { echo "FAILED: $url"; FAILED=$((FAILED+1)); }
done < $META_DIR/downloads.txt

if [[ $FAILED -eq 0 ]]; then
    touch "$SENTINEL"
    echo "All done. Sentinel written: $SENTINEL"
else
    echo "$FAILED file(s) failed."
    exit 1
fi
