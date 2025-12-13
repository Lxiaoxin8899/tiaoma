@echo off
chcp 65001 >nul
echo ========================================
echo    条码管理系统 - 打包 Windows 应用
echo ========================================
echo.
echo [1/2] 正在构建前端资源...
call npm run build
if %errorlevel% neq 0 (
    echo 构建失败！
    pause
    exit /b 1
)
echo.
echo [2/2] 正在打包 Electron 应用...
call npx electron-builder --win
if %errorlevel% neq 0 (
    echo 打包失败！
    pause
    exit /b 1
)
echo.
echo ========================================
echo 打包完成！
echo 输出目录: release/
echo ========================================
explorer release
pause
