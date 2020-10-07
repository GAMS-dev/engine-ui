#!/bin/sh
ENGINE_URL_ESCAPED=$(echo ${ENGINE_URL} | sed -e 's/[&/\]/\\&/g')
BASE_URL_ESCAPED=$(echo ${BASE_URL} | sed -e 's/[&/\]/\\&/g')
find . -type f -name 'main*.chunk.js*' | xargs sed -i "s/AAAABBBBCCCC/${ENGINE_URL_ESCAPED}/g"
find . -type f -name 'main*.chunk.js*' | xargs sed -i "s/DDDDEEEEFFFF/${BASE_URL_ESCAPED}/g"
exec nginx -g "daemon off;"
