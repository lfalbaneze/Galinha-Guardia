@echo off
setlocal
cd /d "%~dp0"
if exist ".venv\Scripts\python.exe" goto checkdeps
where py >nul 2>nul
if errorlevel 1 goto trypython
py -3 -m venv .venv
if errorlevel 1 goto failed
goto checkdeps
:trypython
python -m venv .venv
if errorlevel 1 goto failed
:checkdeps
".venv\Scripts\python.exe" -c "import pygame; assert pygame.version.ver == '2.5.8'" >nul 2>nul
if not errorlevel 1 goto launch
".venv\Scripts\python.exe" -m pip install --disable-pip-version-check -r requirements.txt
if errorlevel 1 goto failed
:launch
".venv\Scripts\python.exe" main.py
if errorlevel 1 goto failed
exit /b 0
:failed
echo.
echo Nao foi possivel iniciar. Confira se Python 3.10 ou superior esta instalado.
echo A primeira instalacao precisa de internet para baixar pygame-ce.
echo Veja o erro acima e o arquivo README.md desta pasta.
pause
exit /b 1
