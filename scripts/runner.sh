#! /usr/bin/env zsh

# basically uses electron's node to prevent
# mismatch in NODE_MODULE_VERSION when running
# better-sqlite3

export ELECTRON_RUN_AS_NODE=true
alias electron_node="./node_modules/.bin/electron --import tsx"
electron_node $@