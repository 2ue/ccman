FROM debian:bookworm-slim

# 避免交互式安装
ENV DEBIAN_FRONTEND=noninteractive

# 基础工具 + Electron 运行时依赖
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    ca-certificates \
    git \
    python3 \
    make \
    g++ \
    # Xvfb 虚拟显示
    xvfb \
    # Electron 运行时依赖
    libgtk-3-0 \
    libgbm1 \
    libnss3 \
    libxss1 \
    libasound2 \
    libatk-bridge2.0-0 \
    libdrm2 \
    libx11-xcb1 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    libcups2 \
    libpango-1.0-0 \
    libcairo2 \
    libdbus-1-3 \
    libatspi2.0-0 \
    # AppImage 需要 FUSE
    fuse \
    libfuse2 \
    && rm -rf /var/lib/apt/lists/*

# 安装 Node.js 20
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

# 安装 pnpm
RUN corepack enable && corepack prepare pnpm@9.15.9 --activate

WORKDIR /app

# 先复制依赖文件，利用 Docker 缓存
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/types/package.json packages/types/
COPY packages/core/package.json packages/core/
COPY packages/cli/package.json packages/cli/
COPY packages/desktop/package.json packages/desktop/

RUN pnpm install --frozen-lockfile

# 复制全部源码
COPY . .

# 构建所有包
RUN pnpm build

# 默认运行测试脚本
CMD ["bash", "docker/test.sh"]
