@echo off
echo === 开始复制扩展文件 ===
set source=C:\AstraEditor\extensions\build
set dest=C:\AstraEditor\Desktop\dist-extensions

echo 源目录: %source%
echo 目标目录: %dest%

if exist "%dest%" (
    echo 删除已存在的目标目录...
    rmdir /S /Q "%dest%"
)

echo 创建目标目录...
mkdir "%dest%"

echo 复制文件中...
xcopy /E /Y /I "%source%\*" "%dest%\"

if %errorlevel% equ 0 (
    echo === 复制成功 ===
    dir /S "%dest%" | find "个文件"
) else (
    echo === 复制失败 ===
    exit /b 1
)
