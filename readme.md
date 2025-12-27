# ImageMagick 图像处理服务

全面的图像处理 Web UI，支持图片分析、调整大小、裁剪、旋转、格式转换、水印、形状裁剪、图片效果等多种功能。

## ✨ 功能特性

- 📊 **图片分析**：获取图片详细信息（尺寸、格式、颜色空间等）
- 🔧 **图像处理**：调整大小、裁剪、旋转、格式转换
- ✂️ **形状裁剪**：圆形、椭圆、五角星、三角形、菱形、心形、六边形、八边形
- 💧 **水印**：文字水印、图片水印，支持多种位置和样式
- 🎨 **图片效果**：40+ 种图片效果（模糊、锐化、滤镜、颜色调整等）
- 🐳 **Docker 支持**：一键部署，无需安装依赖

## 🚀 快速开始

### 方式一：使用 Docker（推荐）

**最简单的方式，无需安装 Node.js 或 ImageMagick！**

1. **安装 Docker**
   - Windows/Mac: [Docker Desktop](https://www.docker.com/products/docker-desktop/)
   - Linux: `sudo apt-get install docker.io`

2. **启动服务**
   ```bash
   # Windows
   docker-start.bat
   
   # Linux/Mac
   chmod +x docker-start.sh
   ./docker-start.sh
   
   # 或使用 Docker Compose
   docker-compose up -d
   ```

3. **访问服务**
   - 打开浏览器：http://localhost:1513

**详细说明请查看：**
- [Docker 部署指南](DOCKER_README.md) - 快速上手指南
- [Docker 完全指南](DOCKER_GUIDE.md) - 详细概念和操作说明

### 方式二：本地安装

**需要先安装 Node.js 和 ImageMagick**

1. **安装依赖**
   ```bash
   npm install
   ```

2. **安装 ImageMagick**
   - Windows: [下载安装包](https://imagemagick.org/script/download.php)
   - Mac: `brew install imagemagick`
   - Linux: `sudo apt-get install imagemagick`

3. **启动服务**
   ```bash
   npm start
   ```

4. **访问服务**
   - 打开浏览器：http://localhost:1513

## 📖 使用文档

- [Docker 部署指南](DOCKER_README.md) - Docker 快速上手
- [Docker 完全指南](DOCKER_GUIDE.md) - Docker 详细教程
- [API 文档](http://localhost:1513/api-docs) - Swagger API 文档（启动服务后访问）

## 🛠️ 技术栈

- **后端**: Node.js + Express
- **前端**: Vue 3 + Semantic UI
- **图像处理**: ImageMagick
- **容器化**: Docker + Docker Compose

## 📁 项目结构

```
yishe-images/
├── lib/                 # 核心库
│   └── imagemagick.js  # ImageMagick 封装
├── public/             # 前端文件
│   ├── index.html      # 主页面
│   ├── app.js          # Vue 应用
│   └── lib/            # 前端库（本地化）
├── uploads/            # 上传文件目录
├── output/             # 输出文件目录
├── template/           # 临时文件目录
├── server.js           # 服务器入口
├── Dockerfile          # Docker 镜像定义
├── docker-compose.yml  # Docker Compose 配置
└── package.json        # Node.js 依赖
```

## 🔧 配置

### 环境变量

- `PORT`: 服务端口（默认: 1513）
- `NODE_ENV`: 运行环境（production/development）

### 端口配置

默认端口是 `1513`，可以在以下位置修改：

- **Docker**: 修改 `docker-compose.yml` 中的 `ports`
- **本地**: 修改 `server.js` 中的 `PORT` 或使用环境变量

## 📝 API 端点

- `GET /api/health` - 健康检查
- `GET /api/imagemagick-status` - ImageMagick 状态
- `POST /api/upload` - 上传图片
- `POST /api/info` - 获取图片信息
- `POST /api/resize` - 调整大小
- `POST /api/crop` - 矩形裁剪
- `POST /api/shape-crop` - 形状裁剪
- `POST /api/rotate` - 旋转
- `POST /api/convert` - 格式转换
- `POST /api/watermark` - 添加水印
- `POST /api/effects` - 应用图片效果

完整 API 文档：http://localhost:1513/api-docs

## 🐳 Docker 使用

### 一、Docker 镜像构建（打包）

#### 方式一：使用 Dockerfile 构建（推荐）

**命令：**
```bash
docker build -t yishe-images:latest .
```

**命令详解：**
- `docker build`: Docker 构建命令
- `-t yishe-images:latest`: 指定镜像名称和标签
  - `yishe-images`: 镜像名称
  - `latest`: 标签（版本号，latest 表示最新版本）
  - 可以自定义标签，如：`yishe-images:v1.0.0`
- `.`: 构建上下文路径（当前目录），Dockerfile 所在目录

**构建过程说明：**
1. 从 `node:18-slim` 基础镜像开始
2. 安装 ImageMagick 和相关依赖
3. 复制 `package.json` 并安装 Node.js 依赖
4. 复制项目文件到容器
5. 创建必要的目录（uploads、output、template）
6. 设置环境变量和暴露端口

**构建时间：** 首次构建约 3-5 分钟（需要下载基础镜像和依赖），后续构建会利用缓存，约 1-2 分钟

#### 方式二：使用 Docker Compose 构建

**命令：**
```bash
docker-compose build
```

**命令详解：**
- `docker-compose build`: 根据 `docker-compose.yml` 中的配置构建镜像
- 会自动读取 `docker-compose.yml` 中的 `build` 配置
- 构建的镜像名称会使用服务名称（yishe-images）

**带参数构建：**
```bash
# 不缓存，强制重新构建
docker-compose build --no-cache

# 构建特定服务
docker-compose build yishe-images
```

### 二、Docker 容器启动

#### 方式一：使用 Docker 命令启动（直接运行）

**命令（Linux/Mac）：**
```bash
docker run -d --name yishe-images -p 1513:1513 -v $(pwd)/uploads:/app/uploads -v $(pwd)/output:/app/output -v $(pwd)/template:/app/template -e NODE_ENV=production -e PORT=1513 --restart unless-stopped --memory="2g" --cpus="2" --health-cmd="node -e \"require('http').get('http://localhost:1513/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})\"" --health-interval=30s --health-timeout=3s --health-start-period=5s --health-retries=3 yishe-images:latest
```

**命令（Windows CMD）：**
```bash
docker run -d --name yishe-images -p 1513:1513 -v %cd%\uploads:/app/uploads -v %cd%\output:/app/output -v %cd%\template:/app/template -e NODE_ENV=production -e PORT=1513 --restart unless-stopped --memory="2g" --cpus="2" --health-cmd="node -e \"require('http').get('http://localhost:1513/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})\"" --health-interval=30s --health-timeout=3s --health-start-period=5s --health-retries=3 yishe-images:latest
```

**命令详解：**
- `docker run`: 运行容器命令
- `-d`: 后台运行（detached mode）
- `--name yishe-images`: 指定容器名称
- `-p 1513:1513`: 端口映射
  - 格式：`宿主机端口:容器端口`
  - 将容器的 1513 端口映射到宿主机的 1513 端口
  - 可以修改宿主机端口，如：`-p 8080:1513`（通过 8080 访问）
- `-v $(pwd)/uploads:/app/uploads`: 数据卷挂载
  - 格式：`宿主机路径:容器内路径`
  - 将容器内的目录挂载到宿主机，实现数据持久化
  - Windows 使用：`-v %cd%\uploads:/app/uploads`
- `-e NODE_ENV=production`: 设置环境变量（生产环境）
- `-e PORT=1513`: 设置服务端口
- `--restart unless-stopped`: 自动重启策略
  - `unless-stopped`: 除非手动停止，否则总是重启
  - 其他选项：`always`（总是重启）、`on-failure`（失败时重启）
- `--memory="2g"`: 限制容器最大内存使用为 2GB
- `--cpus="2"`: 限制容器最多使用 2 个 CPU 核心
- `--health-cmd`: 健康检查命令（检查服务是否正常运行）
- `--health-interval=30s`: 健康检查间隔（每 30 秒检查一次）
- `--health-timeout=3s`: 健康检查超时时间（3 秒）
- `--health-start-period=5s`: 容器启动后的等待时间（5 秒后开始检查）
- `--health-retries=3`: 健康检查失败重试次数（3 次）
- `yishe-images:latest`: 使用的镜像名称和标签
  - 如果使用 Docker Hub 镜像，使用：`1sdesign/yishe-images:latest`

**命令（Windows PowerShell - 基础版本）：**
```powershell
docker run -d --name yishe-images -p 1513:1513 -v ${PWD}/uploads:/app/uploads -v ${PWD}/output:/app/output -v ${PWD}/template:/app/template -e NODE_ENV=production -e PORT=1513 --restart unless-stopped 1sdesign/yishe-images:latest
```

**命令（Windows PowerShell - 完整版本，含资源限制和健康检查）：**
```powershell
docker run -d --name yishe-images -p 1513:1513 -v ${PWD}/uploads:/app/uploads -v ${PWD}/output:/app/output -v ${PWD}/template:/app/template -e NODE_ENV=production -e PORT=1513 --restart unless-stopped --memory="2g" --cpus="2" --health-cmd="node -e \"require('http').get('http://localhost:1513/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})\"" --health-interval=30s --health-timeout=3s --health-start-period=5s --health-retries=3 1sdesign/yishe-images:latest
```

**注意：**
- PowerShell 中使用 `${PWD}` 而不是 `$(pwd)`
- 如果使用本地构建的镜像，将 `1sdesign/yishe-images:latest` 改为 `yishe-images:latest`
- 如果镜像不存在，需要先构建：`docker build -t yishe-images:latest .`

#### 方式二：使用 Docker Compose 启动（推荐）

**命令：**
```bash
docker-compose up -d
```

**命令详解：**
- `docker-compose up`: 启动服务
- `-d`: 后台运行（detached mode）
- 会自动读取当前目录下的 `docker-compose.yml` 配置文件
- 如果镜像不存在，会自动构建

**其他常用命令：**
```bash
# 前台运行（查看日志）
docker-compose up

# 重新构建并启动
docker-compose up -d --build

# 启动特定服务
docker-compose up -d yishe-images

# 强制重新创建容器
docker-compose up -d --force-recreate
```

### 三、容器管理命令

#### 查看容器状态

```bash
# 查看运行中的容器
docker ps

# 查看所有容器（包括已停止的）
docker ps -a

# 查看容器详细信息
docker inspect yishe-images

# 使用 Docker Compose
docker-compose ps
```

#### 查看日志

```bash
# 查看容器日志
docker logs yishe-images

# 实时查看日志（跟随输出）
docker logs -f yishe-images

# 查看最近 100 行日志
docker logs --tail 100 yishe-images

# 使用 Docker Compose
docker-compose logs -f
```

#### 停止和启动容器

```bash
# 停止容器
docker stop yishe-images

# 启动已停止的容器
docker start yishe-images

# 重启容器
docker restart yishe-images

# 使用 Docker Compose
docker-compose stop      # 停止
docker-compose start     # 启动
docker-compose restart   # 重启
docker-compose down      # 停止并删除容器
```

#### 进入容器

```bash
# 进入容器（执行命令）
docker exec -it yishe-images /bin/bash

# 查看容器内文件
docker exec yishe-images ls -la /app

# 使用 Docker Compose
docker-compose exec yishe-images /bin/bash
```

### 四、镜像管理命令

#### 查看镜像

```bash
# 查看本地镜像
docker images

# 查看特定镜像
docker images yishe-images
```

#### 导出和导入镜像

**导出镜像（打包为文件）：**
```bash
docker save -o yishe-images.tar yishe-images:latest
```

**命令详解：**
- `docker save`: 导出镜像命令
- `-o yishe-images.tar`: 输出文件名
- `yishe-images:latest`: 要导出的镜像名称和标签

**导入镜像（从文件加载）：**
```bash
docker load -i yishe-images.tar
```

**命令详解：**
- `docker load`: 导入镜像命令
- `-i yishe-images.tar`: 输入的镜像文件

**使用场景：**
- 在没有网络的环境中部署
- 备份镜像
- 在不同服务器间迁移镜像

#### 删除镜像

```bash
# 删除镜像
docker rmi yishe-images:latest

# 强制删除（即使有容器使用）
docker rmi -f yishe-images:latest

# 删除所有未使用的镜像
docker image prune -a
```

### 五、完整部署流程示例

#### 场景一：首次部署

```bash
# 1. 构建镜像
docker build -t yishe-images:latest .

# 2. 启动容器
docker-compose up -d

# 3. 查看日志确认启动成功
docker-compose logs -f

# 4. 访问服务
# 浏览器打开：http://localhost:1513
```

#### 场景二：更新部署

```bash
# 1. 停止旧容器
docker-compose down

# 2. 重新构建镜像（包含最新代码）
docker-compose build --no-cache

# 3. 启动新容器
docker-compose up -d

# 4. 查看日志
docker-compose logs -f
```

#### 场景三：导出镜像到其他服务器

```bash
# 在源服务器
# 1. 构建镜像
docker build -t yishe-images:latest .

# 2. 导出镜像
docker save -o yishe-images.tar yishe-images:latest

# 3. 传输文件到目标服务器（使用 scp、ftp 等）
scp yishe-images.tar user@target-server:/path/to/

# 在目标服务器
# 1. 导入镜像
docker load -i yishe-images.tar

# 2. 启动容器（需要先复制 docker-compose.yml）
docker-compose up -d
```

### 六、常见问题

#### 1. 端口被占用

**错误：** `bind: address already in use`

**解决：**
```bash
# 修改 docker-compose.yml 中的端口映射
# 将 "1513:1513" 改为 "8080:1513"（使用 8080 端口）

# 或停止占用端口的服务
# Windows: netstat -ano | findstr :1513
# Linux: lsof -i :1513
```

#### 2. 权限问题

**错误：** `permission denied`

**解决：**
```bash
# Linux/Mac 需要添加执行权限
chmod +x docker-start.sh

# 或使用 sudo
sudo docker-compose up -d
```

#### 3. 镜像构建失败

**解决：**
```bash
# 清理构建缓存，重新构建
docker-compose build --no-cache

# 或删除旧镜像重新构建
docker rmi yishe-images:latest
docker-compose build
```

#### 4. 容器无法启动

**排查步骤：**
```bash
# 1. 查看容器日志
docker-compose logs

# 2. 检查容器状态
docker-compose ps

# 3. 检查镜像是否存在
docker images yishe-images

# 4. 检查端口是否被占用
netstat -ano | findstr :1513  # Windows
lsof -i :1513                 # Linux/Mac
```

更多 Docker 使用说明请查看 [DOCKER_README.md](DOCKER_README.md)

## 📄 许可证

MIT

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！
