# 🔧 Docker 网络连接问题解决方案

## 错误信息

```
ERROR: failed to build: failed to solve: failed to fetch oauth token: 
Post "https://auth.docker.io/token": dial tcp 31.13.95.17:443: 
connectex: A connection attempt failed...
```

**原因：** 无法连接到 Docker Hub（可能是网络问题或需要镜像加速器）

---

## 🚀 解决方案

### 方案一：配置 Docker 镜像加速器（推荐，适用于中国大陆）

Docker Desktop 配置镜像加速器：

#### Windows/Mac Docker Desktop：

1. **打开 Docker Desktop**
2. **点击右上角设置图标（齿轮）**
3. **选择 "Docker Engine"**
4. **在 JSON 配置中添加以下内容：**

```json
{
  "registry-mirrors": [
    "https://docker.mirrors.ustc.edu.cn",
    "https://hub-mirror.c.163.com",
    "https://mirror.baidubce.com"
  ]
}
```

5. **点击 "Apply & Restart"** 应用并重启

#### Linux 系统：

编辑 `/etc/docker/daemon.json`：

```bash
sudo nano /etc/docker/daemon.json
```

添加内容：

```json
{
  "registry-mirrors": [
    "https://docker.mirrors.ustc.edu.cn",
    "https://hub-mirror.c.163.com",
    "https://mirror.baidubce.com"
  ]
}
```

重启 Docker：

```bash
sudo systemctl daemon-reload
sudo systemctl restart docker
```

---

### 方案二：检查网络连接

```powershell
# 测试网络连接
Test-NetConnection auth.docker.io -Port 443

# 或使用 ping
ping auth.docker.io
```

如果无法连接，可能是：
- 防火墙阻止
- 需要代理
- DNS 解析问题

---

### 方案三：使用代理（如果有）

#### 方法 1：Docker Desktop 代理设置

1. **打开 Docker Desktop**
2. **Settings → Resources → Proxies**
3. **启用代理并配置：**
   - HTTP Proxy: `http://proxy.example.com:8080`
   - HTTPS Proxy: `http://proxy.example.com:8080`
   - No Proxy: `localhost,127.0.0.1`

#### 方法 2：环境变量

```powershell
# 设置代理环境变量
$env:HTTP_PROXY="http://proxy.example.com:8080"
$env:HTTPS_PROXY="http://proxy.example.com:8080"

# 然后运行构建命令
docker build -t yourname/yishe-images:latest .
```

---

### 方案四：使用国内镜像源构建（临时方案）

如果只是构建时下载基础镜像失败，可以：

1. **手动拉取基础镜像：**

```powershell
# 使用国内镜像源拉取
docker pull docker.mirrors.ustc.edu.cn/library/node:18-slim

# 重新标记
docker tag docker.mirrors.ustc.edu.cn/library/node:18-slim node:18-slim
```

2. **然后重新构建：**

```powershell
docker build -t yourname/yishe-images:latest .
```

---

### 方案五：修改 Dockerfile 使用国内镜像源

临时修改 Dockerfile 的第一行：

```dockerfile
# 原版（可能连接失败）
FROM node:18-slim

# 改为使用国内镜像源
FROM docker.mirrors.ustc.edu.cn/library/node:18-slim
```

**注意：** 构建完成后建议改回原版，以便推送到 Docker Hub。

---

## 🔍 验证配置是否生效

```powershell
# 查看 Docker 配置
docker info | Select-String -Pattern "Registry Mirrors"

# 或查看完整配置
docker info
```

应该能看到你配置的镜像源。

---

## 📋 常用国内镜像源列表

| 镜像源 | 地址 |
|--------|------|
| 中科大 | `https://docker.mirrors.ustc.edu.cn` |
| 网易 | `https://hub-mirror.c.163.com` |
| 百度云 | `https://mirror.baidubce.com` |
| 阿里云 | `https://<你的ID>.mirror.aliyuncs.com`（需要注册）|

---

## ✅ 推荐操作步骤

1. **配置镜像加速器**（方案一）
2. **重启 Docker Desktop**
3. **重新尝试构建：**

```powershell
cd D:\workspace\yishe-images
docker build -t yourname/yishe-images:latest .
```

---

## 🆘 如果还是不行

1. **检查 Docker Desktop 是否正常运行**
2. **尝试重启 Docker Desktop**
3. **检查防火墙设置**
4. **尝试使用手机热点（排除网络问题）**
5. **查看 Docker Desktop 日志**

---

## 💡 提示

配置镜像加速器后，Docker 会：
- 优先从国内镜像源下载镜像（更快）
- 如果镜像源没有，会自动回退到 Docker Hub
- 不影响正常使用和推送

