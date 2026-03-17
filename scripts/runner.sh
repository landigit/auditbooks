#! /usr/bin/env zsh

# basically uses electron's node to prevent
# mismatch in NODE_MODULE_VERSION when running
# better-sqlite3

export ELECTRON_RUN_AS_NODE=true
ELECTRON_NODE="./node_modules/.bin/electron"
# Use register for CommonJS support after removing "type": "module"
$ELECTRON_NODE --require ts-node/register --require tsconfig-paths/register $@