#!/bin/bash

set -e

for i in *; do
  if [[ -d $i ]]; then
    echo -------------------------------------------------
    echo ---- $i
    echo -------------------------------------------------
    pushd "$i"
    npm i
    rm -rf "node_modules/@you54f/pact"
    echo "linking pact"
    npm link @you54f/pact
    npm t
    popd
  fi  
done
