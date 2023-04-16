#!/bin/bash -eu
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")"; pwd)" # Figure out where the script is running
. "$SCRIPT_DIR"/robust-bash.sh

require_binary npm

"${SCRIPT_DIR}"/prepare-release.sh
VERSION="$("$SCRIPT_DIR/get-version.sh")"

echo "--> Preparing npmrc file"
"$SCRIPT_DIR"/create_npmrc_file.sh

echo "--> Releasing version ${VERSION}"

echo "--> Releasing artifacts"
echo "    Publishing pact@${VERSION}..."
cd dist
npm publish --access public --tag latest
echo "    done!"
cd ..
cd dist-web
echo "    Publishing pact-web@${VERSION}..."
npm publish --access public --tag latest
echo "    done!"
