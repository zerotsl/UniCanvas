@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo Starting UniCanvas standalone server (visible log)...
set "NODE=%~dp0node.exe"
if exist "%USERPROFILE%\.dsh\dsh-runtimes\dsh-primary-runtime\dependencies\node\bin\node.exe" set "NODE=%USERPROFILE%\.dsh\dsh-runtimes\dsh-primary-runtime\dependencies\node\bin\node.exe"
start "" "%NODE%" "%~dp0server.mjs"
timeout /t 1 /nobreak >nul
set "CHROME=C:\Program Files\Google\Chrome\Application\chrome.exe"
if not exist "%CHROME%" set "CHROME=C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
if not exist "%CHROME%" (
  start "" http://127.0.0.1:47822/
) else (
  start "" "%CHROME%" --app=http://127.0.0.1:47822/ --window-size=1500,940 --window-position=90,60 --user-data-dir="%LOCALAPPDATA%\InfiniteCanvas\browser" --no-first-run --no-default-browser-check
)
