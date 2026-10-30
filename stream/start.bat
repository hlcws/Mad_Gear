@echo off
title MadGear Overlays
cd /d "%~dp0"
node obs\build.mjs
node server.mjs
pause
