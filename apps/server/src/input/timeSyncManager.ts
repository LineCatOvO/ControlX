/**
 * ============================================================================
 * Time Sync Manager Module
 * ============================================================================
 *
 * 【Module Responsibility】
 * This module manages client-server time synchronization, latency compensation,
 * and clock drift detection for the input system.
 *
 * 【Time Authority Strategy】
 * - Server Time as Authority: Server maintains the authoritative time
 * - Client Time Offset: Calculate and track client-server time offset
 * - Hybrid Strategy: Server time + client-reported timestamps for latency calc
 *
 * 【Core Functionality】
 * 1. Time offset calculation between client and server
 * 2. Input event delay compensation
 * 3. Timestamp consistency validation
 * 4. Clock drift detection and correction
 *
 * 【Design Pattern】
 * - Singleton Pattern: Single time sync manager instance
 * - Observer Pattern: Notifies listeners on clock drift detection
 *
 * @module input/timeSyncManager
 * @version 1.0.0
 * @last-updated 2026-04-08
 */

// =============================================================================
// Types & Interfaces
// =============================================================================

/**
 * Time sync configuration
 */
export interface TimeSyncConfig {
  /** Maximum acceptable RTT in milliseconds (default: 200ms) */
  maxAcceptableRttMs: number;
  /** Clock drift threshold in milliseconds (default: 50ms) */
  clockDriftThresholdMs: number;
  /** Number of samples for time offset calculation (default: 10) */
  offsetSampleCount: number;
  /** Enable delay compensation (default: true) */
  enableDelayCompensation: boolean;
  /** Maximum delay compensation in milliseconds (default: 100ms) */
  maxDelayCompensationMs: number;
}

/**
 * Time offset sample
 */
export interface TimeOffsetSample {
  /** Client timestamp when sending ping */
  clientSendTime: number;
  /** Server timestamp when receiving ping */
  serverReceiveTime: number;
  /** Server timestamp when sending pong */
  serverSendTime: number;
  /** Client timestamp when receiving pong */
  clientReceiveTime: number;
  /** Calculated RTT */
  rtt: number;
  /** Calculated time offset (server time - client time) */
  offset: number;
}

/**
 * Time sync state
 */
export interface TimeSyncState {
  /** Whether time sync is established */
  isSynced: boolean;
  /** Current time offset in milliseconds */
  currentOffsetMs: number;
  /** Average RTT in milliseconds */
  averageRttMs: number;
  /** Number of samples collected */
  sampleCount: number;
  /** Last sync timestamp */
  lastSyncTime: number;
  /** Clock drift rate (parts per million) */
  driftRatePpm: number;
}

/**
 * Timestamp validation result
 */
export interface TimestampValidationResult {
  /** Whether the timestamp is valid */
  isValid: boolean;
  /** Validation error message if invalid */
  error?: string;
  /** Time difference from expected in milliseconds */
  timeDiffMs?: number;
}

/**
 * Clock drift detection result
 */
export interface ClockDriftResult {
  /** Whether clock drift was detected */
  hasDrift: boolean;
  /** Detected drift in milliseconds */
  driftMs: number;
  /** Drift rate (parts per million) */
  driftRatePpm: number;
  /** Whether drift exceeds threshold */
  exceedsThreshold: boolean;
  /** Recommended correction in milliseconds */
  recommendedCorrectionMs: number;
}

/**
 * Delay compensation result
 */
export interface DelayCompensationResult {
  /** Whether compensation was applied */
  isCompensated: boolean;
  /** Original delay in milliseconds */
  originalDelayMs: number;
  /** Compensated delay in milliseconds */
  compensatedDelayMs: number;
  /** Compensation amount applied */
  compensationMs: number;
}

// =============================================================================
// Time Sync Manager Implementation
// =============================================================================

/**
 * Time Sync Manager
 * Manages client-server time synchronization and latency compensation
 */
export class TimeSyncManager {
  private config: TimeSyncConfig;
  private samples: TimeOffsetSample[] = [];
  private state: TimeSyncState;
  private driftHistory: number[] = [];
  private readonly maxDriftHistorySize = 100;

  /**
   * Constructor
   * @param config Optional time sync configuration
   */
  constructor(config?: Partial<TimeSyncConfig>) {
    this.config = {
      maxAcceptableRttMs: 200,
      clockDriftThresholdMs: 50,
      offsetSampleCount: 10,
      enableDelayCompensation: true,
      maxDelayCompensationMs: 100,
      ...config,
    };

    this.state = {
      isSynced: false,
      currentOffsetMs: 0,
      averageRttMs: 0,
      sampleCount: 0,
      lastSyncTime: 0,
      driftRatePpm: 0,
    };
  }

  // =============================================================================
  // Time Offset Calculation
  // =============================================================================

  /**
   * Record a time sync sample
   * @param clientSendTime Client timestamp when sending ping
   * @param serverReceiveTime Server timestamp when receiving ping
   * @param serverSendTime Server timestamp when sending pong
   * @param clientReceiveTime Client timestamp when receiving pong
   * @returns Whether the sample was accepted
   */
  recordSample(
    clientSendTime: number,
    serverReceiveTime: number,
    serverSendTime: number,
    clientReceiveTime: number
  ): boolean {
    const rtt = clientReceiveTime - clientSendTime;

    // Reject samples with excessive RTT
    if (rtt > this.config.maxAcceptableRttMs) {
      console.warn(`TimeSyncManager: Sample rejected due to high RTT (${rtt}ms)`);
      return false;
    }

    // Calculate time offset using the formula:
    // offset = (serverReceiveTime + serverSendTime) / 2 - (clientSendTime + clientReceiveTime) / 2
    const clientTime = (clientSendTime + clientReceiveTime) / 2;
    const serverTime = (serverReceiveTime + serverSendTime) / 2;
    const offset = serverTime - clientTime;

    const sample: TimeOffsetSample = {
      clientSendTime,
      serverReceiveTime,
      serverSendTime,
      clientReceiveTime,
      rtt,
      offset,
    };

    this.samples.push(sample);

    // Keep only the most recent samples
    if (this.samples.length > this.config.offsetSampleCount) {
      this.samples.shift();
    }

    this.updateState();
    return true;
  }

  /**
   * Update time sync state based on collected samples
   */
  private updateState(): void {
    if (this.samples.length === 0) {
      this.state.isSynced = false;
      return;
    }

    // Calculate average offset (use median to reduce outlier impact)
    const sortedOffsets = this.samples.map((s) => s.offset).sort((a, b) => a - b);
    const medianOffset = sortedOffsets[Math.floor(sortedOffsets.length / 2)];

    // Calculate average RTT
    const totalRtt = this.samples.reduce((sum, s) => sum + s.rtt, 0);
    const averageRtt = totalRtt / this.samples.length;

    this.state = {
      isSynced: this.samples.length >= Math.min(3, this.config.offsetSampleCount),
      currentOffsetMs: medianOffset,
      averageRttMs: averageRtt,
      sampleCount: this.samples.length,
      lastSyncTime: Date.now(),
      driftRatePpm: this.calculateDriftRate(),
    };
  }

  /**
   * Calculate clock drift rate
   * @returns Drift rate in parts per million
   */
  private calculateDriftRate(): number {
    if (this.samples.length < 2) {
      return 0;
    }

    // Calculate drift rate based on offset changes over time
    const firstSample = this.samples[0];
    const lastSample = this.samples[this.samples.length - 1];
    const timeElapsed = lastSample.serverReceiveTime - firstSample.serverReceiveTime;

    if (timeElapsed === 0) {
      return 0;
    }

    const offsetChange = lastSample.offset - firstSample.offset;
    return (offsetChange / timeElapsed) * 1_000_000; // Convert to parts per million
  }

  // =============================================================================
  // Delay Compensation
  // =============================================================================

  /**
   * Compensate for network delay in input events
   * @param clientTimestamp Client timestamp of the input event
   * @returns Delay compensation result
   */
  compensateDelay(clientTimestamp: number): DelayCompensationResult {
    const now = Date.now();
    const serverTime = this.clientTimeToServerTime(clientTimestamp);
    const originalDelay = now - serverTime;

    if (!this.config.enableDelayCompensation || !this.state.isSynced) {
      return {
        isCompensated: false,
        originalDelayMs: originalDelay,
        compensatedDelayMs: originalDelay,
        compensationMs: 0,
      };
    }

    // Calculate compensation (half of RTT as network delay estimate)
    const compensation = Math.min(
      this.state.averageRttMs / 2,
      this.config.maxDelayCompensationMs
    );

    const compensatedDelay = Math.max(0, originalDelay - compensation);

    return {
      isCompensated: true,
      originalDelayMs: originalDelay,
      compensatedDelayMs: compensatedDelay,
      compensationMs: compensation,
    };
  }

  // =============================================================================
  // Timestamp Validation
  // =============================================================================

  /**
   * Validate a client timestamp for consistency
   * @param clientTimestamp Client timestamp to validate
   * @param maxAgeMs Maximum acceptable age in milliseconds
   * @returns Validation result
   */
  validateTimestamp(
    clientTimestamp: number,
    maxAgeMs: number = 1000
  ): TimestampValidationResult {
    if (!this.state.isSynced) {
      return {
        isValid: false,
        error: "Time sync not established",
      };
    }

    const serverTime = Date.now();
    const expectedClientTime = this.serverTimeToClientTime(serverTime);
    const timeDiff = expectedClientTime - clientTimestamp;

    // Check if timestamp is too old
    if (timeDiff > maxAgeMs) {
      return {
        isValid: false,
        error: `Timestamp too old: ${timeDiff}ms > ${maxAgeMs}ms`,
        timeDiffMs: timeDiff,
      };
    }

    // Check if timestamp is in the future (more than RTT/2)
    if (timeDiff < -this.state.averageRttMs / 2) {
      return {
        isValid: false,
        error: `Timestamp in future: ${-timeDiff}ms`,
        timeDiffMs: timeDiff,
      };
    }

    return {
      isValid: true,
      timeDiffMs: timeDiff,
    };
  }

  // =============================================================================
  // Clock Drift Detection
  // =============================================================================

  /**
   * Detect clock drift between client and server
   * @returns Clock drift detection result
   */
  detectClockDrift(): ClockDriftResult {
    if (this.samples.length < 3) {
      return {
        hasDrift: false,
        driftMs: 0,
        driftRatePpm: 0,
        exceedsThreshold: false,
        recommendedCorrectionMs: 0,
      };
    }

    // Calculate current drift from expected offset
    const recentOffset = this.samples[this.samples.length - 1].offset;
    const expectedOffset = this.state.currentOffsetMs;
    const drift = recentOffset - expectedOffset;

    // Record drift for trend analysis
    this.driftHistory.push(drift);
    if (this.driftHistory.length > this.maxDriftHistorySize) {
      this.driftHistory.shift();
    }

    const exceedsThreshold = Math.abs(drift) > this.config.clockDriftThresholdMs;

    // Calculate recommended correction using exponential moving average
    const alpha = 0.3;
    const smoothedDrift = this.driftHistory.reduce(
      (ema, d, i) => (i === 0 ? d : alpha * d + (1 - alpha) * ema),
      0
    );

    return {
      hasDrift: Math.abs(drift) > 10, // 10ms threshold for drift detection
      driftMs: drift,
      driftRatePpm: this.state.driftRatePpm,
      exceedsThreshold,
      recommendedCorrectionMs: exceedsThreshold ? -smoothedDrift : 0,
    };
  }

  /**
   * Apply clock drift correction
   * @param correctionMs Correction amount in milliseconds
   */
  applyDriftCorrection(correctionMs: number): void {
    this.state.currentOffsetMs += correctionMs;
    console.log(`TimeSyncManager: Applied drift correction of ${correctionMs}ms`);

    // Clear drift history after correction
    this.driftHistory = [];
  }

  // =============================================================================
  // Time Conversion
  // =============================================================================

  /**
   * Convert client time to server time
   * @param clientTime Client timestamp
   * @returns Server timestamp
   */
  clientTimeToServerTime(clientTime: number): number {
    return clientTime + this.state.currentOffsetMs;
  }

  /**
   * Convert server time to client time
   * @param serverTime Server timestamp
   * @returns Client timestamp
   */
  serverTimeToClientTime(serverTime: number): number {
    return serverTime - this.state.currentOffsetMs;
  }

  // =============================================================================
  // Getters
  // =============================================================================

  /**
   * Get current time sync state
   * @returns Current time sync state
   */
  getState(): TimeSyncState {
    return { ...this.state };
  }

  /**
   * Check if time sync is established
   * @returns Whether time sync is established
   */
  isSynced(): boolean {
    return this.state.isSynced;
  }

  /**
   * Get current time offset
   * @returns Current time offset in milliseconds
   */
  getCurrentOffsetMs(): number {
    return this.state.currentOffsetMs;
  }

  /**
   * Get average RTT
   * @returns Average RTT in milliseconds
   */
  getAverageRttMs(): number {
    return this.state.averageRttMs;
  }

  /**
   * Get all collected samples
   * @returns Array of time offset samples
   */
  getSamples(): TimeOffsetSample[] {
    return [...this.samples];
  }

  /**
   * Get drift history
   * @returns Array of drift measurements
   */
  getDriftHistory(): number[] {
    return [...this.driftHistory];
  }

  /**
   * Reset time sync manager
   */
  reset(): void {
    this.samples = [];
    this.driftHistory = [];
    this.state = {
      isSynced: false,
      currentOffsetMs: 0,
      averageRttMs: 0,
      sampleCount: 0,
      lastSyncTime: 0,
      driftRatePpm: 0,
    };
  }

  /**
   * Update configuration
   * @param config Partial configuration to update
   */
  updateConfig(config: Partial<TimeSyncConfig>): void {
    this.config = { ...this.config, ...config };
  }
}

// =============================================================================
// Singleton Instance
// =============================================================================

let globalTimeSyncManager: TimeSyncManager | null = null;

/**
 * Get or create the global time sync manager instance
 * @returns Global time sync manager instance
 */
export function getTimeSyncManager(): TimeSyncManager {
  if (!globalTimeSyncManager) {
    globalTimeSyncManager = new TimeSyncManager();
  }
  return globalTimeSyncManager;
}

/**
 * Set the global time sync manager instance
 * @param manager Time sync manager instance
 */
export function setTimeSyncManager(manager: TimeSyncManager): void {
  globalTimeSyncManager = manager;
}

/**
 * Reset the global time sync manager instance
 */
export function resetTimeSyncManager(): void {
  if (globalTimeSyncManager) {
    globalTimeSyncManager.reset();
  }
  globalTimeSyncManager = null;
}
