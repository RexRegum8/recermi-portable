@echo off
title Lanzador Rexermi OS
echo ==========================================
echo       INICIANDO REXERMI OS PRO
echo ==========================================
echo.

if not exist node_modules (
    echo [INFO] Detectada primera ejecucion. Instalando complementos...
    call npm install --no-audit --no-fund
    if %errorlevel% neq 0 (
        echo [ERROR] No se pudieron instalar los complementos. 
        echo Asegurate de tener Node.js instalado.
        pause
        exit /b %errorlevel%
    )
    echo [OK] Complementos instalados.
)

echo [INFO] Verificando base de datos...
call npx prisma generate --schema=backend/prisma/schema.prisma
call npx prisma db push --schema=backend/prisma/schema.prisma --accept-data-loss
echo (Esta ventana se cerrara cuando cierres el programa)
set NODE_ENV=production
call npx cross-env NODE_ENV=production electron .

echo.
echo ==========================================
echo       SISTEMA CERRADO CORRECTAMENTE
echo ==========================================
pause
