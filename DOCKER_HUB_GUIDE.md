# 🚀 Docker Hub 推送完整指南

## 📋 目录

1. [准备工作](#准备工作)
2. [构建镜像](#构建镜像)
3. [推送到 Docker Hub](#推送到-docker-hub)
4. [在其他设备使用](#在其他设备使用)
5. [常见问题](#常见问题)

---

## 准备工作

### 步骤 1：注册 Docker Hub 账号

1. 访问 [Docker Hub](https://hub.docker.com/)
2. 点击右上角 **"Sign Up"** 注册账号
3. 填写用户名、邮箱、密码
4. 验证邮箱（检查收件箱）

**重要**：记住你的用户名，例如：`yourusername`

### 步骤 2：登录 Docker Hub

打开终端（Windows: PowerShell 或 CMD，Mac/Linux: Terminal）

```bash
docker login
```

**输入信息：**
- Username: 你的 Docker Hub 用户名
- Password: 你的 Docker Hub 密码

**成功提示：**
```
Login Succeeded
```

---

## 构建镜像

### 步骤 3：进入项目目录

```bash
cd D:\workspace\yishe-images
```

### 步骤 4：构建镜像

**格式：**
```bash
docker build -t <DockerHub用户名>/<镜像名>:<标签> .
```

**示例：**
```bash
# 如果你的 Docker Hub 用户名是 myusername
docker build -t myusername/yishe-images:latest .

# 或者指定版本号
docker build -t myusername/yishe-images:v1.0.0 .
```

**参数说明：**
- `-t`: 给镜像打标签（tag）
- `myusername/yishe-images`: 镜像名称（格式：用户名/镜像名）
- `:latest`: 标签（版本号，latest 表示最新版）
- `.`: 当前目录（Dockerfile 所在位置）

**构建过程：**
```
Sending build context to Docker daemon...
Step 1/10 : FROM node:18-slim
 ---> 下载基础镜像...
Step 2/10 : WORKDIR /app
 ---> 设置工作目录...
Step 3/10 : RUN apt-get update && apt-get install -y imagemagick
 ---> 安装 ImageMagick...
...
Successfully built abc123def456
Successfully tagged myusername/yishe-images:latest
```

**构建时间：** 首次构建可能需要 5-10 分钟（下载基础镜像和安装依赖）

### 步骤 5：验证镜像

```bash
docker images
```

**应该看到：**
```
REPOSITORY                    TAG       IMAGE ID       CREATED         SIZE
myusername/yishe-images       latest    abc123def456   2 minutes ago   500MB
```

---

## 推送到 Docker Hub

### 步骤 6：推送镜像

**格式：**
```bash
docker push <DockerHub用户名>/<镜像名>:<标签>
```

**示例：**
```bash
docker push myusername/yishe-images:latest
```

**推送过程：**
```
The push refers to repository [docker.io/myusername/yishe-images]
abc123def456: Pushing [==================================================>]  500MB/500MB
...
latest: digest: sha256:abc123... size: 1234
```

**推送时间：** 取决于镜像大小和网络速度（通常 2-5 分钟）

### 步骤 7：验证推送成功

1. 访问 [Docker Hub](https://hub.docker.com/)
2. 登录你的账号
3. 点击右上角头像 → **"Repositories"**
4. 应该能看到 `yishe-images` 仓库

**或者使用命令行：**
```bash
docker search myusername/yishe-images
```

---

## 在其他设备使用

### 步骤 8：在新设备上拉取镜像

**在新设备上（只需要安装 Docker，无需其他依赖）：**

```bash
# 1. 拉取镜像
docker pull myusername/yishe-images:latest

# 2. 运行容器
docker run -d \
  --name yishe-images \
  -p 1513:1513 \
  -v $(pwd)/uploads:/app/uploads \
  -v $(pwd)/output:/app/output \
  myusername/yishe-images:latest

# 3. 访问服务
# 浏览器打开: http://localhost:1513
```

**或者使用 Docker Compose：**

创建 `docker-compose.yml`：
```yaml
version: '3.8'

services:
  yishe-images:
    image: myusername/yishe-images:latest
    container_name: yishe-images
    ports:
      - "1513:1513"
    volumes:
      - ./uploads:/app/uploads
      - ./output:/app/output
    restart: unless-stopped
```

然后运行：
```bash
docker-compose up -d
```

---

## 完整操作流程示例

### 场景：第一次推送

```bash
# 1. 登录 Docker Hub
docker login

# 2. 进入项目目录
cd D:\workspace\yishe-images

# 3. 构建镜像（替换 yourusername 为你的用户名）
docker build -t yourusername/yishe-images:latest .

# 4. 验证镜像
docker images | grep yishe-images

# 5. 推送镜像
docker push yourusername/yishe-images:latest

# 6. 完成！现在可以在任何设备上使用
```

### 场景：更新镜像（代码更新后）

```bash
# 1. 重新构建镜像
docker build -t yourusername/yishe-images:latest .

# 2. 推送新版本
docker push yourusername/yishe-images:latest

# 3. 在其他设备上更新
docker pull yourusername/yishe-images:latest
docker-compose down
docker-compose up -d
```

---

## 版本管理最佳实践

### 使用版本标签

```bash
# 构建并推送多个版本
docker build -t yourusername/yishe-images:v1.0.0 .
docker build -t yourusername/yishe-images:v1.0.1 .
docker build -t yourusername/yishe-images:latest .

# 推送所有版本
docker push yourusername/yishe-images:v1.0.0
docker push yourusername/yishe-images:v1.0.1
docker push yourusername/yishe-images:latest
```

### 查看所有版本

访问：`https://hub.docker.com/r/yourusername/yishe-images/tags`

---

## 常见问题

### Q1: 推送失败，提示 "denied: requested access to the resource is denied"

**原因：** 镜像名称格式不正确或未登录

**解决：**
```bash
# 1. 确保已登录
docker login

# 2. 确保镜像名称格式正确：用户名/镜像名
docker tag yishe-images:latest yourusername/yishe-images:latest

# 3. 重新推送
docker push yourusername/yishe-images:latest
```

### Q2: 如何修改镜像名称？

```bash
# 使用 docker tag 命令
docker tag 旧名称:标签 新名称:标签

# 示例
docker tag yishe-images:latest yourusername/yishe-images:latest
```

### Q3: 如何删除本地镜像？

```bash
# 删除镜像
docker rmi yourusername/yishe-images:latest

# 强制删除（如果容器正在使用）
docker rmi -f yourusername/yishe-images:latest
```

### Q4: 如何查看推送进度？

推送时会自动显示进度条，例如：
```
abc123: Pushing [==========>                                        ]  100MB/500MB
```

### Q5: 推送速度很慢怎么办？

- 使用国内镜像加速器（阿里云、腾讯云等）
- 或者使用代理

### Q6: 如何设置镜像为公开/私有？

1. 访问 Docker Hub
2. 进入你的仓库
3. 点击 **"Settings"** → **"Visibility"**
4. 选择 **Public**（公开）或 **Private**（私有）

**注意：** 免费账号只能创建一个私有仓库

---

## 快速参考命令

```bash
# ========== 构建和推送 ==========
# 构建镜像
docker build -t yourusername/yishe-images:latest .

# 推送镜像
docker push yourusername/yishe-images:latest

# ========== 本地测试 ==========
# 运行容器
docker run -d -p 1513:1513 yourusername/yishe-images:latest

# ========== 在其他设备 ==========
# 拉取镜像
docker pull yourusername/yishe-images:latest

# ========== 管理 ==========
# 查看本地镜像
docker images

# 查看推送历史
docker history yourusername/yishe-images:latest

# 删除镜像
docker rmi yourusername/yishe-images:latest
```

---

## 📝 检查清单

推送前确保：

- [ ] Docker Hub 账号已注册
- [ ] 已登录 Docker Hub (`docker login`)
- [ ] 镜像名称格式正确（`用户名/镜像名:标签`）
- [ ] 镜像构建成功 (`docker images` 能看到)
- [ ] 网络连接正常

---

## 🎯 总结

**完整流程：**
1. 注册 Docker Hub 账号
2. `docker login` 登录
3. `docker build -t 用户名/镜像名:标签 .` 构建
4. `docker push 用户名/镜像名:标签` 推送
5. 完成！可以在任何设备上 `docker pull` 使用

**就是这么简单！** 🎉

