# 🚀 快速推送到 Docker Hub

## 📋 前提条件

1. ✅ 已构建镜像（你已经完成）
2. ⬜ 注册 Docker Hub 账号
3. ⬜ 登录 Docker Hub

---

## 🔑 步骤 1：登录 Docker Hub

```powershell
docker login
```

**输入信息：**
- Username: 你的 Docker Hub 用户名
- Password: 你的密码

**成功提示：**
```
Login Succeeded
```

---

## 🏷️ 步骤 2：检查镜像名称

查看你构建的镜像：

```powershell
docker images
```

**找到你的镜像，例如：**
```
REPOSITORY          TAG       IMAGE ID       CREATED
yishe-images        latest    abc123def456   5 minutes ago
```

---

## ✏️ 步骤 3：给镜像打标签（如果需要）

### 情况 A：镜像名称已经是 `用户名/镜像名` 格式

如果你的镜像名已经是 `yourusername/yishe-images:latest`，可以直接推送。

### 情况 B：镜像名称不是 Docker Hub 格式

如果你的镜像名是 `yishe-images` 或其他名称，需要重新打标签：

```powershell
# 格式：docker tag 旧名称:标签 新名称:标签
docker tag yishe-images:latest yourusername/yishe-images:latest

# 示例（假设你的用户名是 zhangsan）
docker tag yishe-images:latest zhangsan/yishe-images:latest
```

**参数说明：**
- `yishe-images:latest`：你现有的镜像名称和标签
- `yourusername/yishe-images:latest`：Docker Hub 格式（用户名/镜像名:标签）

---

## 📤 步骤 4：推送到 Docker Hub

```powershell
# 格式：docker push 用户名/镜像名:标签
docker push yourusername/yishe-images:latest

# 示例
docker push zhangsan/yishe-images:latest
```

**推送过程：**
```
The push refers to repository [docker.io/zhangsan/yishe-images]
abc123def456: Pushing [==================================================>]  500MB/500MB
...
latest: digest: sha256:abc123... size: 1234
```

**推送时间：** 取决于镜像大小和网络速度（通常 2-5 分钟）

---

## ✅ 步骤 5：验证推送成功

1. **访问 Docker Hub**
   - 打开：https://hub.docker.com/
   - 登录你的账号

2. **查看仓库**
   - 点击右上角头像 → **"Repositories"**
   - 应该能看到 `yishe-images` 仓库

3. **或使用命令行验证**
   ```powershell
   docker search yourusername/yishe-images
   ```

---

## 🌐 步骤 6：其他人如何使用

### 方法一：直接拉取运行

```bash
# 拉取镜像
docker pull yourusername/yishe-images:latest

# 运行容器
docker run -d \
  --name yishe-images \
  -p 1513:1513 \
  -v $(pwd)/uploads:/app/uploads \
  -v $(pwd)/output:/app/output \
  yourusername/yishe-images:latest
```

### 方法二：使用 Docker Compose

创建 `docker-compose.yml`：

```yaml
version: '3.8'

services:
  yishe-images:
    image: yourusername/yishe-images:latest
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

## 📝 完整命令示例

假设你的 Docker Hub 用户名是 `zhangsan`，镜像名是 `yishe-images`：

```powershell
# 1. 登录
docker login

# 2. 查看镜像
docker images

# 3. 如果镜像名不是 Docker Hub 格式，重新打标签
docker tag yishe-images:latest zhangsan/yishe-images:latest

# 4. 推送
docker push zhangsan/yishe-images:latest

# 5. 完成！
```

---

## 🔍 常见问题

### Q1: 推送失败，提示 "denied: requested access to the resource is denied"

**原因：** 镜像名称格式不正确或未登录

**解决：**
```powershell
# 1. 确保已登录
docker login

# 2. 确保镜像名称格式正确：用户名/镜像名
docker tag yishe-images:latest yourusername/yishe-images:latest

# 3. 重新推送
docker push yourusername/yishe-images:latest
```

### Q2: 如何推送多个版本？

```powershell
# 构建不同版本
docker build -t yourusername/yishe-images:v1.0.0 .
docker build -t yourusername/yishe-images:latest .

# 推送所有版本
docker push yourusername/yishe-images:v1.0.0
docker push yourusername/yishe-images:latest
```

### Q3: 如何设置镜像为公开/私有？

1. 访问 Docker Hub
2. 进入你的仓库
3. 点击 **"Settings"** → **"Visibility"**
4. 选择 **Public**（公开）或 **Private**（私有）

**注意：** 免费账号只能创建一个私有仓库

---

## 🎯 快速检查清单

推送前确保：

- [ ] Docker Hub 账号已注册
- [ ] 已登录 Docker Hub (`docker login`)
- [ ] 镜像已构建成功 (`docker images` 能看到)
- [ ] 镜像名称格式正确（`用户名/镜像名:标签`）
- [ ] 网络连接正常

---

## 💡 提示

- **镜像名称格式**：必须是 `用户名/镜像名:标签`
- **推送时间**：取决于镜像大小（通常 2-5 分钟）
- **公开 vs 私有**：默认是公开的，任何人都可以拉取
- **版本管理**：建议使用版本标签（`v1.0.0`、`latest` 等）

---

**现在就开始推送吧！** 🚀

