/**
 * Time utility functions for testing
 */
export class TimeUtils {
  /**
   * Get current timestamp in milliseconds
   */
  static now(): number {
    return Date.now();
  }

  /**
   * Calculate RTT (Round Trip Time) between two timestamps
   */
  static calculateRTT(startTime: number, endTime: number): number {
    return endTime - startTime;
  }

  /**
   * Wait for a specified number of milliseconds
   */
  static sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Measure execution time of a function
   */
  static measureExecutionTime<T>(fn: () => T): { result: T; duration: number } {
    const startTime = this.now();
    const result = fn();
    const endTime = this.now();
    return { result, duration: endTime - startTime };
  }

  /**
   * Measure async execution time of a function
   */
  static async measureAsyncExecutionTime<T>(fn: () => Promise<T>): Promise<{ result: T; duration: number }> {
    const startTime = this.now();
    const result = await fn();
    const endTime = this.now();
    return { result, duration: endTime - startTime };
  }
}
