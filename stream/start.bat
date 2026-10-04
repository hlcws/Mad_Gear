@echo off
title MadGear Overlays
cd /d "%~dp0"
node obsuild.mjs
node server.mjs
pause
