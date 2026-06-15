#! /usr/bin/env zsh

export TS_NODE_COMPILER_OPTIONS='{"module":"commonjs"}'
npx ts-node -r tsconfig-paths/register $@