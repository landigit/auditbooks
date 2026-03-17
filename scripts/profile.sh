#! /usr/bin/env zsh

# https://nodejs.org/en/docs/guides/simple-profiling/

export TS_NODE_COMPILER_OPTIONS='{"module":"commonjs"}'

rm ./isolate-*-v8.log 2> /dev/null
rm ./profiler-output.log 2> /dev/null

export ELECTRON_RUN_AS_NODE=true
ELECTRON_NODE=./node_modules/.bin/electron

echo "running profile.ts"
$ELECTRON_NODE --require ts-node/register --require tsconfig-paths/register --prof ./scripts/profile.ts

echo "processing tick file"
$ELECTRON_NODE --prof-process ./isolate-*-v8.log > ./profiler-output.log && echo "generated profiler-output.log"
rm ./isolate-*-v8.log