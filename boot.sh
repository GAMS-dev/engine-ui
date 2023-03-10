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

if [ -z ${ENGINE_HTTP_PORT+x} ]
then
    echo "ENGINE_HTTP_PORT is unset, using default 80"
    export ENGINE_HTTP_PORT=80
fi

if [ "$DISABLE_REQUEST_LIMIT" == "true" ]
then
   sed -i '/^limit_req/d' /etc/nginx/conf.d/default.conf
fi

if [ -n ${mount_url+x} ] && [ "$mount_url" != "" ] && [ "$mount_url" != "/" ] && [ "$mount_url" != "/engine" ]
then
   ln -s /usr/share/nginx/engine /usr/share/nginx${mount_url}
fi

BASE_URL_STRIPPED=$(echo ${BASE_URL} | sed -e 's@/$@@g')
find /usr/share/nginx/engine -type f -name 'main*.js*' | xargs sed -i "s@AAAABBBBCCCC@${ENGINE_URL}@g"
find /usr/share/nginx/engine -type f -name 'main*.js*' | xargs sed -i "s@DDDDEEEEFFFF@${BASE_URL}@g"
grep -lr "GGGGHHHHIIIIJJJJ" /usr/share/nginx/engine | xargs -r sed -i "s@GGGGHHHHIIIIJJJJ@${BASE_URL_STRIPPED}@g"
sed -i -E "s/listen [0-9]+;/listen ${ENGINE_HTTP_PORT};/" /etc/nginx/conf.d/default.conf
