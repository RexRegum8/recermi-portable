@echo off
title Iniciando Rexermi OS Portable
color 0b

echo ===================================================
echo     INICIANDO REXERMI OS (MODO PORTABLE ONLINE)
echo ===================================================
echo.
echo Verificando dependencias necesarias. Por favor, espere...
echo.

:: Check if node_modules exists, otherwise install
IF NOT EXIST "node_modules\" (
    echo [1/3] Descargando componentes del nucleo (Internet requerido)...
    npm install
) ELSE (
    echo [1/3] Componentes verificados.
)

IF NOT EXIST "backend\node_modules\" (
    echo [2/3] Configurando el Motor de Base de Datos...
    cd backend
    npm install
    cd ..
) ELSE (
    echo [2/3] Base de datos verificada.
)

echo [3/3] Compilando e iniciando la Interfaz Grafica...
echo.
echo No cierre esta ventana. El programa de Ventas se abrira en breve.
npm run electron:start
