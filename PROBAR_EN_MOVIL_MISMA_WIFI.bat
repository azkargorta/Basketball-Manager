@echo off
cd /d "%~dp0"
echo =====================================================
echo  Basketball GM Beta - prueba en movil por Wi-Fi
 echo =====================================================
echo.
echo 1. Conecta el movil a la MISMA Wi-Fi que este PC.
echo 2. Busca abajo la IPv4 del PC (normalmente 192.168.x.x o 10.x.x.x).
echo 3. En el movil abre: http://ESA_IP:8772
echo.
echo Si Windows pregunta por el firewall, permite acceso en redes PRIVADAS.
echo Esta prueba por HTTP sirve para jugar; para instalar como PWA usa un enlace HTTPS.
echo.
ipconfig | findstr /I "IPv4"
echo.
where py >nul 2>nul
if %errorlevel%==0 goto usepy
where python >nul 2>nul
if %errorlevel%==0 goto usepython
echo No se ha encontrado Python. Usa GitHub Pages o instala Python para esta prueba local.
pause
exit /b
:usepy
py -m http.server 8772 --bind 0.0.0.0
exit /b
:usepython
python -m http.server 8772 --bind 0.0.0.0
exit /b
