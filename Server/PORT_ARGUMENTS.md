# 端口参数使用说明

## 功能描述

Server 项目现在支持通过命令行参数指定监听端口，可以覆盖配置文件中的端口设置。

## 使用方法

### 开发模式 (使用 ts-node)

```bash
# 使用长参数形式
npm run dev -- --port 3001

# 使用短参数形式  
npm run dev -- -p 3001
```

### 生产模式 (使用编译后的代码)

```bash
# 使用长参数形式
npm run start -- --port 3001

# 使用短参数形式
npm run start -- -p 3001
```

### 直接使用 Node.js

```bash
# 开发模式
npx ts-node src/app.ts --port 3001

# 生产模式
node dist/app.js --port 3001
```

## 参数验证

- 端口号必须是 1-65535 之间的有效数字
- 如果提供无效端口号，程序会显示错误信息并退出
- 如果不提供端口参数，则使用配置文件中的默认端口

## 示例输出

```
2026-02-10 10:30:15 INFO  Starting ControlX Server...
2026-02-10 10:30:15 INFO  Configuration loaded from: config.json
2026-02-10 10:30:15 INFO  Port overridden by command line argument: 3001
2026-02-10 10:30:15 INFO  Listening on port: 3001
2026-02-10 10:30:15 INFO  WebSocket server started on port 3001
```

## 可用的 npm 脚本

- `npm run dev:port <port>` - 开发模式快速指定端口
- `npm run start:port <port>` - 生产模式快速指定端口

注意：这些脚本需要在端口号后添加参数，例如：`npm run dev:port -- 3001`
