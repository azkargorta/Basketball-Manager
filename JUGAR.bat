@echo off
cd /d "%~dp0"
where py >nul 2>nul
if %errorlevel%==0 goto usepy
where python >nul 2>nul
if %errorlevel%==0 goto usepython
start "" index.html
exit /b

:usepy
start "Basketball GM - servidor local" /min py -m http.server 8772
ping 127.0.0.1 -n 2 >nul
start "" http://127.0.0.1:8772/index.html
exit /b

:usepython
start "Basketball GM - servidor local" /min python -m http.server 8772
ping 127.0.0.1 -n 2 >nul
start "" http://127.0.0.1:8772/index.html
exit /b
