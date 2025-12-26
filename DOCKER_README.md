# Docker 部署指南

## 📦 Docker 是什么？

Docker 是一个容器化平台，可以将应用程序及其所有依赖（Node.js、ImageMagick 等）打包成一个独立的"容器"。

### 为什么使用 Docker？

1. **一次构建，到处运行**：在任何安装了 Docker 的设备上都能运行
2. **环境隔离**：不会影响宿主机的其他软件
3. **易于部署**：不需要手动安装 Node.js、ImageMagick 等依赖
4. **版本控制**：可以精确控制软件版本

---

## 🚀 快速开始

### 前提条件

只需要安装 Docker：
- **Windows**: 下载 [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- **Mac**: 下载 [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- **Linux**: 
  ```bash
  # Ubuntu/Debian
  sudo apt-get update
  sudo apt-get install docker.io
  sudo systemctl start docker
  sudo systemctl enable docker
  ```

### 方法一：使用 Docker Compose（推荐）

1. **构建并启动容器**
   ```bash
   docker-compose up -d
   ```
   - `-d` 表示后台运行（detached mode）

2. **查看运行状态**
   ```bash
   docker-compose ps
   ```

3. **查看日志**
   ```bash
   docker-compose logs -f
   ```

4. **停止服务**
   ```bash
   docker-compose down
   ```

5. **访问服务**
   - 打开浏览器访问：`http://localhost:1513`

### 方法二：使用 Docker 命令

1. **构建镜像**
   ```bash
   docker build -t yishe-images:latest .
   ```
   - `-t yishe-images:latest`：给镜像打标签（名称:版本）
   - `.`：使用当前目录作为构建上下文

2. **运行容器**
   ```bash
   docker run -d \
     --name yishe-images \
     -p 1513:1513 \
     -v $(pwd)/uploads:/app/uploads \
     -v $(pwd)/output:/app/output \
     -v $(pwd)/template:/app/template \
     yishe-images:latest
   ```
   
   **参数说明：**
   - `-d`：后台运行
   - `--name yishe-images`：容器名称
   - `-p 1513:1513`：端口映射（宿主机:容器）
   - `-v`：数据卷挂载（数据持久化）
   - `yishe-images:latest`：使用的镜像

3. **查看运行状态**
   ```bash
   docker ps
   ```

4. **查看日志**
   ```bash
   docker logs -f yishe-images
   ```

5. **停止容器**
   ```bash
   docker stop yishe-images
   ```

6. **删除容器**
   ```bash
   docker rm yishe-images
   ```

---

## 📋 常用 Docker 命令

### 镜像管理

```bash
# 查看所有镜像
docker images

# 删除镜像
docker rmi yishe-images:latest

# 查看镜像详细信息
docker inspect yishe-images:latest
```

### 容器管理

```bash
# 查看运行中的容器
docker ps

# 查看所有容器（包括已停止的）
docker ps -a

# 进入容器内部（调试用）
docker exec -it yishe-images bash

# 查看容器日志
docker logs yishe-images

# 查看容器资源使用情况
docker stats yishe-images

# 停止容器
docker stop yishe-images

# 启动已停止的容器
docker start yishe-images

# 重启容器
docker restart yishe-images

# 删除容器
docker rm yishe-images

# 强制删除运行中的容器
docker rm -f yishe-images
```

### Docker Compose 命令

```bash
# 构建镜像
docker-compose build

# 启动服务（后台）
docker-compose up -d

# 启动服务（前台，查看日志）
docker-compose up

# 停止服务
docker-compose down

# 停止服务并删除数据卷
docker-compose down -v

# 查看日志
docker-compose logs -f

# 重启服务
docker-compose restart

# 查看服务状态
docker-compose ps

# 进入容器
docker-compose exec yishe-images bash
```

---

## 🔧 配置说明

### 端口配置

默认端口是 `1513`，如果需要修改：

**方法一：修改 docker-compose.yml**
```yaml
ports:
  - "8080:1513"  # 宿主机端口:容器端口
```

**方法二：使用环境变量**
```bash
docker run -d -p 8080:1513 -e PORT=1513 yishe-images:latest
```

### 数据持久化

项目使用以下目录存储数据：
- `uploads/`：上传的原始图片
- `output/`：处理后的图片
- `template/`：临时下载的文件

这些目录通过 `volumes` 挂载到宿主机，确保数据不会丢失。

### 环境变量

可以通过环境变量配置：

```bash
docker run -d \
  -e PORT=1513 \
  -e NODE_ENV=production \
  yishe-images:latest
```

---

## 🐛 故障排查

### 1. 容器无法启动

```bash
# 查看容器日志
docker logs yishe-images

# 查看详细错误信息
docker-compose logs
```

### 2. ImageMagick 未安装

```bash
# 进入容器检查
docker exec -it yishe-images bash
magick --version
```

### 3. 端口被占用

```bash
# Windows
netstat -ano | findstr :1513

# Linux/Mac
lsof -i :1513

# 修改端口映射或停止占用端口的程序
```

### 4. 权限问题（Linux）

```bash
# 确保 Docker 有权限访问目录
sudo chown -R $USER:$USER uploads output template
```

---

## 📦 导出和导入镜像

### 导出镜像（用于在其他设备使用）

```bash
# 导出镜像为 tar 文件
docker save -o yishe-images.tar yishe-images:latest

# 压缩镜像（可选，减小文件大小）
gzip yishe-images.tar
```

### 导入镜像

```bash
# 加载镜像
docker load -i yishe-images.tar

# 或者从压缩文件加载
gunzip -c yishe-images.tar.gz | docker load
```

---

## 🌐 部署到服务器

### 1. 将项目文件上传到服务器

```bash
# 使用 scp
scp -r . user@server:/path/to/yishe-images

# 或使用 git
git clone <your-repo-url>
cd yishe-images
```

### 2. 在服务器上构建和运行

```bash
# 构建镜像
docker-compose build

# 启动服务
docker-compose up -d

# 查看日志
docker-compose logs -f
```

### 3. 配置 Nginx 反向代理（可选）

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:1513;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

## 🔄 更新镜像

当代码更新后：

```bash
# 停止旧容器
docker-compose down

# 重新构建镜像
docker-compose build --no-cache

# 启动新容器
docker-compose up -d
```

---

## 📝 注意事项

1. **数据备份**：定期备份 `uploads` 和 `output` 目录
2. **资源限制**：处理大图片时注意内存和 CPU 使用
3. **安全**：生产环境建议配置防火墙和 HTTPS
4. **日志**：定期清理日志文件，避免占用过多空间

---

## 🎯 总结

使用 Docker 后，你只需要：
1. 安装 Docker
2. 运行 `docker-compose up -d`
3. 访问 `http://localhost:1513`

就这么简单！无需安装 Node.js、ImageMagick 或其他任何依赖。

