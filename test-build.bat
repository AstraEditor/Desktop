@echo off
echo Testing build process...
echo.

echo 1. Testing webpack compilation...
call npm run webpack:compile
if %errorlevel% neq 0 (
    echo Webpack compilation failed
    exit /b 1
)

echo.
echo 2. Creating required directories...
if not exist dist-library-files mkdir dist-library-files
if not exist dist-extensions mkdir dist-extensions
if not exist dist-renderer-webpack mkdir dist-renderer-webpack

echo.
echo 3. Testing extension preparation...
call node scripts/prepare-extensions.mjs
if %errorlevel% neq 0 (
    echo Extension preparation failed, but continuing...
)

echo.
echo 4. Testing electron packaging...
call npm run electron:package:dir
if %errorlevel% neq 0 (
    echo Electron packaging failed
    exit /b 1
)

echo.
echo Build test completed successfully!
pause