/**
 * ============================================================================
 * System Resource Monitor Module (Resource Monitor Module)
 * ============================================================================
 *
 * 【Module responsibility】
 * This module provides system resource monitoring functionality, including CPU usage, memory usage, etc.。
 *
 * 【Core functionality】
 * 1. CPU usage monitoring: real-time CPU usage percentage calculation
 * 2. Memory usage monitoring: monitor heap memory, RSS, etc.
 * 3. Process running time: record service running duration
 * 4. Resource statistics export: provide JSON format resource statistics
 *
 * 【UseExample】
 * ```typescript
 * const monitor = ResourceMonitor.getInstance();
 * monitor.start();
 * 
 * // Get current resource usage
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
 * CPU time information
 */
interface CpuTime {
    user: number;
    system: number;
    total: number;
    timestamp: number;
}

/**
 * Resource monitor class
 * Singleton pattern, provide global resource monitoring
 */
export class ResourceMonitor {
    private static instance: ResourceMonitor | null = null;
    private lastCpuTime: CpuTime | null = null;
    private monitoringInterval: NodeJS.Timeout | null = null;
    private startTime: number = Date.now();
    private currentCpuUsage: number = 0;

    private constructor() {}

    /**
     * Get singleton instance
     */
    public static getInstance(): ResourceMonitor {
        if (!ResourceMonitor.instance) {
            ResourceMonitor.instance = new ResourceMonitor();
        }
        return ResourceMonitor.instance;
    }

    /**
     * Reset singleton (only for testing)
     */
    public static resetInstance(): void {
        if (ResourceMonitor.instance?.monitoringInterval) {
            clearInterval(ResourceMonitor.instance.monitoringInterval);
        }
        ResourceMonitor.instance = null;
    }

    /**
     * Start resource monitoring
     * @param intervalMs Monitoring interval (ms), default 5000ms
     */
    public start(intervalMs: number = 5000): void {
        if (this.monitoringInterval) {
            console.warn('Resource monitor already running');
            return;
        }

        // Initialize CPU time
        this.lastCpuTime = this.getCpuTime();
        this.startTime = Date.now();

        // Start scheduled monitoring
        this.monitoringInterval = setInterval(() => {
            this.updateStats();
        }, intervalMs);

        console.log(`Resource monitor started with interval: ${intervalMs}ms`);
    }

    /**
     * Stop resource monitoring
     */
    public stop(): void {
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
            this.monitoringInterval = null;
            console.log('Resource monitor stopped');
        }
    }

    /**
     * Get current CPU time
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
     * Calculate CPU usage
     */
    private calculateCpuUsage(): number {
        if (!this.lastCpuTime) {
            return 0;
        }

        const currentTime = this.getCpuTime();
        const timeDiff = (currentTime.timestamp - this.lastCpuTime.timestamp) * 1000; // Convert to microseconds
        const cpuDiff = currentTime.total - this.lastCpuTime.total;

        // CPU usage = CPU time difference / actual time difference
        const cpuUsage = (cpuDiff / timeDiff) * 100;

        // Update last CPU time
        this.lastCpuTime = currentTime;

        // Limit to 0-100 range
        return Math.min(Math.max(cpuUsage, 0), 100);
    }

    /**
     * Update statistics
     */
    private updateStats(): void {
        // Calculate CPU usage
        this.currentCpuUsage = this.calculateCpuUsage();

        // Update metric collector
        const metricsCollector = getMetricsCollector();
        metricsCollector.setGauge('cpu_usage_percent', this.currentCpuUsage);

        // Update memory metrics
        const memStats = this.getMemoryStats();
        metricsCollector.setGauge('memory_heap_used_bytes', memStats.heapUsed);
        metricsCollector.setGauge('memory_heap_total_bytes', memStats.heapTotal);
        metricsCollector.setGauge('memory_rss_bytes', memStats.rss);
    }

    /**
     * Get memory statistics
     */
    private getMemoryStats(): NodeJS.MemoryUsage {
        return process.memoryUsage();
    }

    /**
     * Get current resource statistics
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
     * Get formatted resource statistics (human readable)
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
     * Format bytes
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
     * Format running time
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
     * Export as JSON format
     */
    public toJSON(): Record<string, any> {
        return {
            ...this.getResourceStats(),
            formatted: this.getFormattedStats(),
        };
    }

    /**
     * Reset statistics
     */
    public reset(): void {
        this.lastCpuTime = this.getCpuTime();
        this.startTime = Date.now();
        this.currentCpuUsage = 0;
    }
}

// Export singleton get function
export function getResourceMonitor(): ResourceMonitor {
    return ResourceMonitor.getInstance();
}