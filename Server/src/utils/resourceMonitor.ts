/**
 * ============================================================================
 * 系统资源监控模块 (Resource Monitor Module)
 * ============================================================================
 *
 * 【模块职责】
 * 本模块提供系统资源监控功能，包括 CPU 使用率、内存使用量等。
 *
 * 【核心功能】
 * 1. CPU 使用率监控：实时计算 CPU 使用百分比
 * 2. 内存使用量监控：监控堆内存、RSS 等
 * 3. 进程运行时间：记录服务运行时长
 * 4. 资源统计导出：提供 JSON 格式的资源统计
 *
 * 【使用示例】
 * ```typescript
 * const monitor = ResourceMonitor.getInstance();
 * monitor.start();
 * 
 * // 获取当前资源使用情况
 * const stats = monitor.getResourceStats();
 * console.log(`CPU: ${stats.cpuUsage}%`);
 * console.log(`Memory: ${stats.memoryUsage.heapUsed}MB`);
 * ```
 *
 * @module utils/resourceMonitor
 * @version 1.0.0
 * @last-updated 2026-03-13
 */

import { getMetricsCollector, SystemResourceStats } from './metrics';

/**
 * CPU 时间信息
 */
interface CpuTime {
    user: number;
    system: number;
    total: number;
    timestamp: number;
}

/**
 * 资源监控器类
 * 单例模式，提供全局资源监控
 */
export class ResourceMonitor {
    private static instance: ResourceMonitor | null = null;
    private lastCpuTime: CpuTime | null = null;
    private monitoringInterval: NodeJS.Timeout | null = null;
    private startTime: number = Date.now();
    private currentCpuUsage: number = 0;

    private constructor() {}

    /**
     * 获取单例实例
     */
    public static getInstance(): ResourceMonitor {
        if (!ResourceMonitor.instance) {
            ResourceMonitor.instance = new ResourceMonitor();
        }
        return ResourceMonitor.instance;
    }

    /**
     * 重置单例（仅用于测试）
     */
    public static resetInstance(): void {
        if (ResourceMonitor.instance?.monitoringInterval) {
            clearInterval(ResourceMonitor.instance.monitoringInterval);
        }
        ResourceMonitor.instance = null;
    }

    /**
     * 启动资源监控
     * @param intervalMs 监控间隔（毫秒），默认 5000ms
     */
    public start(intervalMs: number = 5000): void {
        if (this.monitoringInterval) {
            console.warn('Resource monitor already running');
            return;
        }

        // 初始化 CPU 时间
        this.lastCpuTime = this.getCpuTime();
        this.startTime = Date.now();

        // 启动定时监控
        this.monitoringInterval = setInterval(() => {
            this.updateStats();
        }, intervalMs);

        console.log(`Resource monitor started with interval: ${intervalMs}ms`);
    }

    /**
     * 停止资源监控
     */
    public stop(): void {
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
            this.monitoringInterval = null;
            console.log('Resource monitor stopped');
        }
    }

    /**
     * 获取当前 CPU 时间
     */
    private getCpuTime(): CpuTime {
        const usage = process.cpuUsage();
        const timestamp = Date.now();
        return {
            user: usage.user,
            system: usage.system,
            total: usage.user + usage.system,
            timestamp,
        };
    }

    /**
     * 计算 CPU 使用率
     */
    private calculateCpuUsage(): number {
        if (!this.lastCpuTime) {
            return 0;
        }

        const currentTime = this.getCpuTime();
        const timeDiff = (currentTime.timestamp - this.lastCpuTime.timestamp) * 1000; // 转换为微秒
        const cpuDiff = currentTime.total - this.lastCpuTime.total;

        // CPU 使用率 = CPU 时间差 / 实际时间差
        const cpuUsage = (cpuDiff / timeDiff) * 100;

        // 更新上次 CPU 时间
        this.lastCpuTime = currentTime;

        // 限制在 0-100 范围内
        return Math.min(Math.max(cpuUsage, 0), 100);
    }

    /**
     * 更新统计信息
     */
    private updateStats(): void {
        // 计算 CPU 使用率
        this.currentCpuUsage = this.calculateCpuUsage();

        // 更新指标收集器
        const metricsCollector = getMetricsCollector();
        metricsCollector.setGauge('cpu_usage_percent', this.currentCpuUsage);

        // 更新内存指标
        const memStats = this.getMemoryStats();
        metricsCollector.setGauge('memory_heap_used_bytes', memStats.heapUsed);
        metricsCollector.setGauge('memory_heap_total_bytes', memStats.heapTotal);
        metricsCollector.setGauge('memory_rss_bytes', memStats.rss);
    }

    /**
     * 获取内存统计
     */
    private getMemoryStats(): NodeJS.MemoryUsage {
        return process.memoryUsage();
    }

    /**
     * 获取当前资源统计
     */
    public getResourceStats(): SystemResourceStats {
        const memUsage = this.getMemoryStats();

        return {
            cpuUsage: Math.round(this.currentCpuUsage * 100) / 100,
            memoryUsage: {
                heapUsed: memUsage.heapUsed,
                heapTotal: memUsage.heapTotal,
                external: memUsage.external,
                rss: memUsage.rss,
            },
            uptime: Date.now() - this.startTime,
            timestamp: Date.now(),
        };
    }

    /**
     * 获取格式化的资源统计（人类可读）
     */
    public getFormattedStats(): {
        cpuUsage: string;
        memoryUsage: {
            heapUsed: string;
            heapTotal: string;
            external: string;
            rss: string;
        };
        uptime: string;
    } {
        const stats = this.getResourceStats();

        return {
            cpuUsage: `${stats.cpuUsage.toFixed(2)}%`,
            memoryUsage: {
                heapUsed: this.formatBytes(stats.memoryUsage.heapUsed),
                heapTotal: this.formatBytes(stats.memoryUsage.heapTotal),
                external: this.formatBytes(stats.memoryUsage.external),
                rss: this.formatBytes(stats.memoryUsage.rss),
            },
            uptime: this.formatUptime(stats.uptime),
        };
    }

    /**
     * 格式化字节数
     */
    private formatBytes(bytes: number): string {
        const units = ['B', 'KB', 'MB', 'GB'];
        let value = bytes;
        let unitIndex = 0;

        while (value >= 1024 && unitIndex < units.length - 1) {
            value /= 1024;
            unitIndex++;
        }

        return `${value.toFixed(2)} ${units[unitIndex]}`;
    }

    /**
     * 格式化运行时间
     */
    private formatUptime(ms: number): string {
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (days > 0) {
            return `${days}d ${hours % 24}h ${minutes % 60}m`;
        } else if (hours > 0) {
            return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
        } else if (minutes > 0) {
            return `${minutes}m ${seconds % 60}s`;
        } else {
            return `${seconds}s`;
        }
    }

    /**
     * 导出为 JSON 格式
     */
    public toJSON(): Record<string, any> {
        return {
            ...this.getResourceStats(),
            formatted: this.getFormattedStats(),
        };
    }

    /**
     * 重置统计
     */
    public reset(): void {
        this.lastCpuTime = this.getCpuTime();
        this.startTime = Date.now();
        this.currentCpuUsage = 0;
    }
}

// 导出单例获取函数
export function getResourceMonitor(): ResourceMonitor {
    return ResourceMonitor.getInstance();
}