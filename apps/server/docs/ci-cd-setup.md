# ControlX CI/CD 配置文档

**更新日期**: 2026-04-05

本文档介绍 ControlX 项目的 CI/CD 配置和自动化构建流程。

---

## CI/CD 架构

### 构建流程

```
代码提交 → 自动测试 → 构建 → 发布
    ↓           ↓         ↓       ↓
  GitHub    GitHub Actions  Artifact  Release
```

### 支持的 CI/CD 平台

| 平台 | 配置文件 | 状态 |
|------|----------|------|
| GitHub Actions | `.github/workflows/` | 推荐 |
| GitLab CI | `.gitlab-ci.yml` | 可选 |
| Jenkins | `Jenkinsfile` | 可选 |

---

## GitHub Actions 配置

### 服务端构建

**文件**: `.github/workflows/server-build.yml`

```yaml
name: Server Build

on:
  push:
    branches: [main, develop]
    paths:
      - 'Server/**'
  pull_request:
    branches: [main]
    paths:
      - 'Server/**'

jobs:
  build:
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout
        uses: actions/checkout@v4
        
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          
      - name: Install pnpm
        uses: pnpm/action-setup@v2
        with:
          version: 10
          
      - name: Install dependencies
        working-directory: Server
        run: pnpm install --frozen-lockfile
        
      - name: Type check
        working-directory: Server
        run: pnpm type-check
        
      - name: Build
        working-directory: Server
        run: pnpm build
        
      - name: Test
        working-directory: Server
        run: pnpm test
        
      - name: Upload artifact
        uses: actions/upload-artifact@v4
        with:
          name: server-dist
          path: Server/dist/
```

### 客户端构建

**文件**: `.github/workflows/android-build.yml`

```yaml
name: Android Build

on:
  push:
    branches: [main, develop]
    paths:
      - 'AndroidClient/**'
  pull_request:
    branches: [main]
    paths:
      - 'AndroidClient/**'

jobs:
  build:
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout
        uses: actions/checkout@v4
        
      - name: Setup JDK
        uses: actions/setup-java@v4
        with:
          distribution: 'temurin'
          java-version: '17'
          
      - name: Setup Android SDK
        uses: android-actions/setup-android@v2
        
      - name: Grant execute permission
        working-directory: AndroidClient
        run: chmod +x gradlew
        
      - name: Build Debug APK
        working-directory: AndroidClient
        run: ./gradlew assembleDebug
        
      - name: Test
        working-directory: AndroidClient
        run: ./gradlew testDebugUnitTest
        
      - name: Upload APK
        uses: actions/upload-artifact@v4
        with:
          name: app-debug
          path: AndroidClient/app/build/outputs/apk/debug/app-debug.apk
```

---

## 发布流程

### 服务端发布

```yaml
  release:
    needs: build
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    
    steps:
      - name: Download artifact
        uses: actions/download-artifact@v4
        with:
          name: server-dist
          
      - name: Create release
        uses: softprops/action-gh-release@v1
        with:
          files: dist/*
          tag_name: v${{ github.run_number }}
```

### 客户端发布

```yaml
  release:
    needs: build
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    
    steps:
      - name: Download artifact
        uses: actions/download-artifact@v4
        with:
          name: app-debug
          
      - name: Create release
        uses: softprops/action-gh-release@v1
        with:
          files: app-debug.apk
          tag_name: v${{ github.run_number }}
```

---

## 签名配置

### 客户端 Release 签名

使用 GitHub Secrets 存储签名密钥：

```yaml
      - name: Decode keystore
        env:
          KEYSTORE_BASE64: ${{ secrets.KEYSTORE_BASE64 }}
        run: |
          echo $KEYSTORE_BASE64 | base64 -d > AndroidClient/app/release.keystore
          
      - name: Create signing config
        working-directory: AndroidClient/app
        run: |
          echo "storeFile=release.keystore" > signing-config.properties
          echo "storePassword=${{ secrets.KEYSTORE_PASSWORD }}" >> signing-config.properties
          echo "keyAlias=${{ secrets.KEY_ALIAS }}" >> signing-config.properties
          echo "keyPassword=${{ secrets.KEY_PASSWORD }}" >> signing-config.properties
          
      - name: Build Release APK
        working-directory: AndroidClient
        run: ./gradlew assembleRelease
```

### 配置 Secrets

在 GitHub 仓库设置中添加：

| Secret | 描述 |
|--------|------|
| KEYSTORE_BASE64 | Base64 编码的密钥库文件 |
| KEYSTORE_PASSWORD | 密钥库密码 |
| KEY_ALIAS | 密钥别名 |
| KEY_PASSWORD | 密钥密码 |

---

## 测试覆盖率

### 服务端覆盖率报告

```yaml
      - name: Generate coverage
        working-directory: Server
        run: pnpm test --coverage
        
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: Server/coverage/lcov.info
```

### 客户端覆盖率报告

```yaml
      - name: Generate coverage
        working-directory: AndroidClient
        run: ./gradlew testDebugUnitTestCoverage
        
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: AndroidClient/app/build/reports/coverage/testDebugUnitTest.xml
```

---

## Docker 构建

### 服务端 Dockerfile

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY Server/package.json Server/pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install --frozen-lockfile
COPY Server/ .
RUN pnpm build

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./
RUN npm install -g pnpm && pnpm install --prod --frozen-lockfile
EXPOSE 8080 8081
CMD ["node", "dist/index.js"]
```

### Docker 构建流程

```yaml
      - name: Build Docker image
        run: docker build -t controlx-server:latest .
        
      - name: Push to registry
        run: |
          docker tag controlx-server:latest ${{ secrets.DOCKER_REGISTRY }}/controlx-server:latest
          docker push ${{ secrets.DOCKER_REGISTRY }}/controlx-server:latest
```

---

## 监控集成

### 构建状态监控

使用 GitHub Actions 内置监控：

- 构建时间统计
- 失败通知
- 成功/失败状态

### 外部监控集成

可选集成：
- Slack 通知
- Discord 通知
- Email 通知

```yaml
      - name: Notify on success
        if: success()
        uses: slackapi/slack-github-action@v1
        with:
          payload: |
            {
              "text": "ControlX 构建成功: ${{ github.sha }}"
            }
```

---

## 最佳实践

### 1. 分支策略

| 分支 | 触发构建 | 说明 |
|------|----------|------|
| main | Release 构建 | 生产发布 |
| develop | Debug 构建 | 开发测试 |
| feature/* | PR 构建 | 功能开发 |

### 2. 构建缓存

启用依赖缓存加速构建：

```yaml
      - name: Cache pnpm
        uses: actions/cache@v3
        with:
          path: ~/.pnpm-store
          key: ${{ runner.os }}-pnpm-${{ hashFiles('**/pnpm-lock.yaml') }}
          
      - name: Cache Gradle
        uses: actions/cache@v3
        with:
          path: |
            ~/.gradle/caches
            ~/.gradle/wrapper
          key: ${{ runner.os }}-gradle-${{ hashFiles('**/*.gradle*', '**/gradle-wrapper.properties') }}
```

### 3. 并行构建

分离服务端和客户端构建：

```yaml
jobs:
  server-build:
    # 服务端构建
    
  android-build:
    # 客户端构建
    
  release:
    needs: [server-build, android-build]
    # 发布任务
```

---

## 故障排查

### 常见问题

| 问题 | 解决方案 |
|------|----------|
| 依赖安装失败 | 检查 lock 文件 |
| 测试超时 | 增加超时时间 |
| 签名失败 | 检查 Secrets 配置 |
| Docker 推送失败 | 检查 registry 凭证 |

### 调试方法

```yaml
      - name: Debug
        run: |
          echo "Current directory: $(pwd)"
          ls -la
          cat package.json
```

---

## 参考资料

- [GitHub Actions 文档](https://docs.github.com/en/actions)
- [pnpm CI/CD](https://pnpm.io/continuous-integration)
- [Android 构建最佳实践](https://developer.android.com/studio/build)