#!/bin/bash

DIST_FOLDER="dist"
WWW_FOLDER="docs"

if [[ -d $WWW_FOLDER ]]; then
	rm -rf "$WWW_FOLDER"/*
else
	mkdir "$WWW_FOLDER"
fi

cp -Rf "$DIST_FOLDER"/* "$WWW_FOLDER"

rm -rf "$WWW_FOLDER"/controls
rm -rf "$WWW_FOLDER"/control
rm -rf "$WWW_FOLDER"/controller
rm -rf "$WWW_FOLDER"/model
rm -rf "$WWW_FOLDER"/test
rm -rf "$WWW_FOLDER"/test-resources
rm -rf "$WWW_FOLDER"/view
rm -rf "$WWW_FOLDER"/localService
rm -rf "$WWW_FOLDER"/managedobject
rm -rf "$WWW_FOLDER"/mockService
rm -rf "$WWW_FOLDER"/services
rm -rf "$WWW_FOLDER"/types
find "$WWW_FOLDER" -name '*dbg*' -exec rm -f {} \;
find "$WWW_FOLDER" -name '*.ts' -exec rm -f {} \;
find "$WWW_FOLDER" -name '*debug.js.*' -exec rm -f {} \;
find "$WWW_FOLDER" -name '*copy*' -exec rm -f {} \;
find "$WWW_FOLDER" -name '*mock*' -exec rm -f {} \;
find "$WWW_FOLDER"/flags/ -name '*[^gb|^de|^pl].svg' -exec rm -f {} \;