@echo off
chcp 65001 >nul
echo ========================================
echo   Docker Hub 推送脚本
echo ========================================
echo.

REM 检查 Docker 是否安装
echo [1/5] 检查 Docker...
docker --version >nul 2>&1
if errorlevel 1 (
    echo [错误] Docker 未安装！
    echo 请先安装 Docker Desktop: https://www.docker.com/products/docker-desktop/
    pause
    exit /b 1
)
echo [成功] Docker 已安装
echo.

REM 提示输入 Docker Hub 用户名
echo [2/5] 输入 Docker Hub 信息
set /p DOCKER_USERNAME="请输入你的 Docker Hub 用户名: "
if "%DOCKER_USERNAME%"=="" (
    echo [错误] 用户名不能为空！
    pause
    exit /b 1
)

set /p IMAGE_TAG="请输入镜像标签 (默认: latest): "
if "%IMAGE_TAG%"=="" set IMAGE_TAG=latest

set IMAGE_NAME=%DOCKER_USERNAME%/yishe-images:%IMAGE_TAG%
echo.
echo 镜像名称: %IMAGE_NAME%
echo.

REM 检查是否已登录
echo [3/5] 检查 Docker Hub 登录状态...
docker info | findstr "Username" >nul 2>&1
if errorlevel 1 (
    echo [提示] 需要登录 Docker Hub
    docker login
    if errorlevel 1 (
        echo [错误] 登录失败！
        pause
        exit /b 1
    )
) else (
    echo [成功] 已登录 Docker Hub
)
echo.

REM 构建镜像
echo [4/5] 构建 Docker 镜像...
echo 这可能需要几分钟时间，请耐心等待...
docker build -t %IMAGE_NAME% .
if errorlevel 1 (
    echo [错误] 镜像构建失败！
    pause
    exit /b 1
)
echo [成功] 镜像构建完成
echo.

REM 推送镜像
echo [5/5] 推送到 Docker Hub...
echo 这可能需要几分钟时间，请耐心等待...
docker push %IMAGE_NAME%
if errorlevel 1 (
    echo [错误] 推送失败！
    pause
    exit /b 1
)
echo [成功] 镜像推送完成
echo.

echo ========================================
echo   推送成功！
echo ========================================
echo.
echo 镜像地址: https://hub.docker.com/r/%DOCKER_USERNAME%/yishe-images
echo.
echo 在其他设备上使用:
echo   docker pull %IMAGE_NAME%
echo   docker run -d -p 1513:1513 %IMAGE_NAME%
echo.
pause

