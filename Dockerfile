# 使用官方 Node.js 镜像作为基础镜像
# 选择 LTS 版本，基于 Debian（包含 apt 包管理器，方便安装 ImageMagick）
FROM node:18-slim

# 设置工作目录
WORKDIR /app

# 设置维护者信息
LABEL maintainer="yishe-images"
LABEL description="Yishe Image 图像处理服务 - Docker 镜像"

# 安装 ImageMagick 和必要的依赖
# 使用 apt-get 安装 ImageMagick 7（magick 命令）
# 注意：某些系统可能需要安装 imagemagick-6-common 或 imagemagick-6.q16
RUN apt-get update && \
    apt-get install -y \
    imagemagick \
    libmagickwand-dev \
    --no-install-recommends && \
    # 清理 apt 缓存，减小镜像大小
    rm -rf /var/lib/apt/lists/* && \
    # 验证 ImageMagick 安装（尝试 magick 和 convert 命令）
    (magick --version || convert --version || echo "ImageMagick installed") && \
    # 确保 magick 命令可用（如果系统只有 convert，创建符号链接）
    (command -v magick || (command -v convert && echo "Using convert command"))

# 复制 package.json 和 package-lock.json
# 先复制依赖文件，利用 Docker 缓存层优化构建速度
COPY package*.json ./

# 安装 Node.js 依赖
RUN npm ci --only=production && \
    npm cache clean --force

# 复制项目文件
COPY . .

# 创建必要的目录（如果不存在）
RUN mkdir -p uploads output template

# 设置环境变量
ENV NODE_ENV=production
ENV PORT=1513

# 暴露端口
EXPOSE 1513

# 健康检查（可选，用于 Docker 监控容器状态）
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:1513/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# 启动应用
CMD ["node", "server.js"]

