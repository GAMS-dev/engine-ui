#!/bin/sh
if [ -z ${ENGINE_URL+x} ]
then
    echo "ENGINE_URL is unset, using default /api"
    export ENGINE_URL=/api
fi

if [ -z ${BASE_URL+x} ]
then
    echo "BASE_URL is unset, using default /"
    export BASE_URL=/
fi

BASE_URL_STRIPPED=$(echo ${BASE_URL} | sed -e 's@/$@@g')
find /usr/share/nginx/engine -type f -name 'main*.chunk.js*' | xargs sed -i "s@AAAABBBBCCCC@${ENGINE_URL}@g"
find /usr/share/nginx/engine -type f -name 'main*.chunk.js*' | xargs sed -i "s@DDDDEEEEFFFF@${BASE_URL}@g"
grep -lr "GGGGHHHHIIIIJJJJ" /usr/share/nginx/engine | xargs -r sed -i "s@GGGGHHHHIIIIJJJJ@${BASE_URL_STRIPPED}@g"

