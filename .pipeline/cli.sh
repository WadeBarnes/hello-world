#!/usr/bin/env sh
set -e

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null && pwd )"

cd $DIR
curl -sSL 'https://raw.githubusercontent.com/cvarjao-o/node-oc-cli-wrapper/094654871b419a02f1e79a6a1c7cdb13b4a12368/cli.sh' | bash -s "$@"