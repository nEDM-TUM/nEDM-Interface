#!/bin/bash

hash jsdoc 2>/dev/null || { echo >&2 "I require jsdoc but it's not installed.  Aborting."; exit 1; }

if [ "$#" -ne 1 ] || ! [ -d "$1" ] ; then
  echo "`cat <<EOF
Requires 'jsdoc'

Usage: $0 DIRECTORY

EOF`" >&2
  exit 1
fi
jsdoc -d $1 --readme ./README.md -u ./tutorials head/lib/*.js
