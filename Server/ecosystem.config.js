/**
 * PM2 配置文件
 * ControlX Server 生产部署配置
 *
 * 使用方法：
 * - pm2 start ecosystem.config.js              # 启动生产环境
 * - pm2 start ecosystem.config.js --env dev    # 启动开发环境
 * - pm2 reload ecosystem.config.js             # 重载配置
 * - pm2 stop ecosystem.config.js               # 停止服务
 * - pm2 delete ecosystem.config.js             # 删除服务
 */

module.exports = {
    apps: [
        {
            name: 'controlx-server',
            script: './dist/app.js',
            cwd: '/app',

            // 实例配置
            instances: 1,           // 实例数量（1为单实例，'max'为使用所有CPU核心）
            exec_mode: 'fork',      // 执行模式：fork（推荐）或 cluster

            // 环境变量
            env: {
                NODE_ENV: 'development',
                WS_PORT: 3000,
                WEB_PORT: 28080,
            },
            env_production: {
                NODE_ENV: 'production',
                WS_PORT: 3000,
                WEB_PORT: 28080,
            },
            env_test: {
                NODE_ENV: 'test',
                TEST_MODE: 'true',
                DISABLE_ACTUAL_INPUT: 'true',
                WS_PORT: 3001,
                WEB_PORT: 8081,
            },

            // 日志配置
            log_file: './logs/combined.log',
            out_file: './logs/out.log',
            error_file: './logs/error.log',
            log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
            combine_logs: true,
            merge_logs: true,

            // 进程管理
            max_memory_restart: '1G',           // 内存超过1G自动重启
            restart_delay: 3000,                // 重启延迟3秒
            max_restarts: 10,                   // 最大重启次数
            min_uptime: '10s',                  // 最小运行时间

            // 自动重启
            autorestart: true,
            kill_timeout: 5000,                 // 杀死进程超时时间
            listen_timeout: 10000,              // 监听超时时间

            // 监控
            monitoring: true,

            // 源代码监控（开发模式）
            watch: false,                       // 生产环境不监控文件变化
            ignore_watch: [
                'node_modules',
                'logs',
                'dist',
                '.git',
                '*.log'
            ],
            watch_options: {
                followSymlinks: false
            },

            // 高级配置
            node_args: [
                '--max-old-space-size=1024',     // 最大堆内存1GB
                '--enable-source-maps'            // 启用source map支持
            ],

            // 优雅关闭
            shutdown_with_message: true,

            // 日志旋转
            log_rotate: {
                max_size: '10M',                 // 单个日志文件最大10MB
                retain: 10,                       // 保留10个历史文件
                compress: true,                   // 压缩旧日志
                dateFormat: 'YYYY-MM-DD'
            },

            // 健康检查
            // PM2 Plus 功能，需要商业许可
            // health_check_grace_period: 30000,
        },

        // 开发模式配置
        {
            name: 'controlx-server-dev',
            script: './dist/app.js',
            cwd: '.',
            instances: 1,
            exec_mode: 'fork',
            env: {
                NODE_ENV: 'development',
                WS_PORT: 3000,
                WEB_PORT: 28080,
            },
            watch: true,
            ignore_watch: [
                'node_modules',
                'logs',
                'dist',
                '.git',
                '*.log'
            ],
            autorestart: true,
            max_memory_restart: '512M',
            log_file: './logs/dev-combined.log',
            out_file: './logs/dev-out.log',
            error_file: './logs/dev-error.log',
        },

        // 测试模式配置
        {
            name: 'controlx-server-test',
            script: './dist/app.js',
            cwd: '.',
            instances: 1,
            exec_mode: 'fork',
            env: {
                NODE_ENV: 'test',
                TEST_MODE: 'true',
                DISABLE_ACTUAL_INPUT: 'true',
                DRY_RUN: 'true',
                WS_PORT: 3001,
                WEB_PORT: 8081,
            },
            autorestart: false,
            max_memory_restart: '256M',
            log_file: './logs/test-combined.log',
            out_file: './logs/test-out.log',
            error_file: './logs/test-error.log',
        }
    ],

    // 部署配置（可选）
    deploy: {
        production: {
            user: 'controlx',
            host: ['your-server.com'],
            ref: 'origin/main',
            repo: 'git@github.com:your-org/controlx.git',
            path: '/var/www/controlx',
            'post-deploy': 'cd Server && pnpm install && pnpm run build && pm2 reload ecosystem.config.js --env production',
            env: {
                NODE_ENV: 'production'
            }
        },
        staging: {
            user: 'controlx',
            host: ['staging.your-server.com'],
            ref: 'origin/develop',
            repo: 'git@github.com:your-org/controlx.git',
            path: '/var/www/controlx-staging',
            'post-deploy': 'cd Server && pnpm install && pnpm run build && pm2 reload ecosystem.config.js --env production',
            env: {
                NODE_ENV: 'staging'
            }
        }
    }
};
