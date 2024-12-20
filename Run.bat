pushd %~dp0
call npm install --no-audit
REM call npm run plugins:update
title ST - Staging
start /min RunChrome.bat
node server.js --autorun=false
popd
