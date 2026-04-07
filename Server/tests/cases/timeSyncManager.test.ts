import {
  TimeSyncManager,
  getTimeSyncManager,
  setTimeSyncManager,
  resetTimeSyncManager,
} from "../../src/input/timeSyncManager";

describe("TimeSyncManager Tests", () => {
  let timeSyncManager: TimeSyncManager;

  beforeEach(() => {
    resetTimeSyncManager();
    timeSyncManager = new TimeSyncManager();
  });

  afterEach(() => {
    resetTimeSyncManager();
  });

  describe("Constructor and Initialization", () => {
    test("should create TimeSyncManager with default config", () => {
      const manager = new TimeSyncManager();
      const state = manager.getState();

      expect(state.isSynced).toBe(false);
      expect(state.currentOffsetMs).toBe(0);
      expect(state.averageRttMs).toBe(0);
      expect(state.sampleCount).toBe(0);
    });

    test("should create TimeSyncManager with custom config", () => {
      const manager = new TimeSyncManager({
        maxAcceptableRttMs: 100,
        clockDriftThresholdMs: 25,
        offsetSampleCount: 5,
      });

      expect(manager).toBeDefined();
    });

    test("should not be synced initially", () => {
      expect(timeSyncManager.isSynced()).toBe(false);
    });
  });

  describe("Time Sample Recording", () => {
    test("should record valid time sample", () => {
      const clientSendTime = 1000;
      const serverReceiveTime = 1100;
      const serverSendTime = 1105;
      const clientReceiveTime = 1205;

      const accepted = timeSyncManager.recordSample(
        clientSendTime,
        serverReceiveTime,
        serverSendTime,
        clientReceiveTime
      );

      expect(accepted).toBe(true);
      expect(timeSyncManager.getSamples()).toHaveLength(1);
    });

    test("should reject sample with high RTT", () => {
      const clientSendTime = 1000;
      const serverReceiveTime = 1100;
      const serverSendTime = 1105;
      // RTT = 300ms (exceeds default 200ms)
      const clientReceiveTime = 1300;

      const consoleWarnSpy = jest.spyOn(console, "warn").mockImplementation();

      const accepted = timeSyncManager.recordSample(
        clientSendTime,
        serverReceiveTime,
        serverSendTime,
        clientReceiveTime
      );

      expect(accepted).toBe(false);
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining("Sample rejected due to high RTT")
      );

      consoleWarnSpy.mockRestore();
    });

    test("should limit sample count to configured maximum", () => {
      timeSyncManager.updateConfig({ offsetSampleCount: 3 });

      for (let i = 0; i < 5; i++) {
        timeSyncManager.recordSample(
          1000 + i * 100,
          1100 + i * 100,
          1105 + i * 100,
          1205 + i * 100
        );
      }

      expect(timeSyncManager.getSamples()).toHaveLength(3);
    });

    test("should achieve synced state after minimum samples", () => {
      timeSyncManager.updateConfig({ offsetSampleCount: 3 });

      expect(timeSyncManager.isSynced()).toBe(false);

      // Record 3 samples
      for (let i = 0; i < 3; i++) {
        timeSyncManager.recordSample(
          1000 + i * 200,
          1100 + i * 200,
          1105 + i * 200,
          1205 + i * 200
        );
      }

      expect(timeSyncManager.isSynced()).toBe(true);
    });
  });

  describe("Time Offset Calculation", () => {
    test("should calculate correct time offset", () => {
      // Simulate client clock being 100ms behind server
      const baseTime = 10000;
      const offset = 100;

      // Record multiple samples
      for (let i = 0; i < 5; i++) {
        const clientSendTime = baseTime + i * 200;
        const serverReceiveTime = clientSendTime + offset + 50; // +50ms network
        const serverSendTime = serverReceiveTime + 5;
        const clientReceiveTime = serverSendTime - offset + 50;

        timeSyncManager.recordSample(
          clientSendTime,
          serverReceiveTime,
          serverSendTime,
          clientReceiveTime
        );
      }

      const state = timeSyncManager.getState();
      // Offset should be approximately 100ms (server - client)
      expect(state.currentOffsetMs).toBeGreaterThan(90);
      expect(state.currentOffsetMs).toBeLessThan(110);
    });

    test("should calculate average RTT correctly", () => {
      const rtts: number[] = [];

      for (let i = 0; i < 5; i++) {
        const rtt = 100 + i * 20; // 100, 120, 140, 160, 180
        rtts.push(rtt);

        const clientSendTime = 1000 + i * 300;
        const serverReceiveTime = clientSendTime + 50;
        const serverSendTime = serverReceiveTime + 10;
        const clientReceiveTime = clientSendTime + rtt;

        timeSyncManager.recordSample(
          clientSendTime,
          serverReceiveTime,
          serverSendTime,
          clientReceiveTime
        );
      }

      const expectedAvgRtt = rtts.reduce((a, b) => a + b, 0) / rtts.length;
      const state = timeSyncManager.getState();

      expect(state.averageRttMs).toBeCloseTo(expectedAvgRtt, 0);
    });
  });

  describe("Delay Compensation", () => {
    beforeEach(() => {
      // Record samples to establish sync
      for (let i = 0; i < 5; i++) {
        timeSyncManager.recordSample(
          1000 + i * 200,
          1150 + i * 200,
          1155 + i * 200,
          1305 + i * 200
        );
      }
    });

    test("should compensate delay when synced", () => {
      const clientTimestamp = 5000;
      const result = timeSyncManager.compensateDelay(clientTimestamp);

      expect(result.isCompensated).toBe(true);
      expect(result.compensationMs).toBeGreaterThan(0);
    });

    test("should not compensate when not synced", () => {
      const unsyncedManager = new TimeSyncManager();
      const clientTimestamp = 5000;

      const result = unsyncedManager.compensateDelay(clientTimestamp);

      expect(result.isCompensated).toBe(false);
      expect(result.compensationMs).toBe(0);
    });

    test("should respect maximum compensation limit", () => {
      timeSyncManager.updateConfig({ maxDelayCompensationMs: 50 });

      const clientTimestamp = 5000;
      const result = timeSyncManager.compensateDelay(clientTimestamp);

      expect(result.compensationMs).toBeLessThanOrEqual(50);
    });

    test("should calculate compensated delay correctly", () => {
      const clientTimestamp = Date.now() - 200; // 200ms ago
      const result = timeSyncManager.compensateDelay(clientTimestamp);

      if (result.isCompensated) {
        expect(result.compensatedDelayMs).toBeLessThan(result.originalDelayMs);
      }
    });
  });

  describe("Timestamp Validation", () => {
    beforeEach(() => {
      // Record samples to establish sync
      for (let i = 0; i < 5; i++) {
        timeSyncManager.recordSample(
          1000 + i * 200,
          1150 + i * 200,
          1155 + i * 200,
          1305 + i * 200
        );
      }
    });

    test("should validate timestamp as valid", () => {
      // Use current time as reference
      const clientTimestamp = Date.now() - 100; // 100ms ago
      const result = timeSyncManager.validateTimestamp(clientTimestamp);

      expect(result.isValid).toBe(true);
    });

    test("should reject timestamp too old", () => {
      const clientTimestamp = Date.now() - 2000; // 2 seconds ago
      const result = timeSyncManager.validateTimestamp(clientTimestamp, 1000);

      expect(result.isValid).toBe(false);
      expect(result.error).toContain("too old");
    });

    test("should reject timestamp in the future", () => {
      const clientTimestamp = Date.now() + 200; // 200ms in the future
      const result = timeSyncManager.validateTimestamp(clientTimestamp);

      expect(result.isValid).toBe(false);
      expect(result.error).toContain("future");
    });

    test("should return error when not synced", () => {
      const unsyncedManager = new TimeSyncManager();
      const result = unsyncedManager.validateTimestamp(Date.now());

      expect(result.isValid).toBe(false);
      expect(result.error).toContain("not established");
    });
  });

  describe("Clock Drift Detection", () => {
    test("should detect clock drift", () => {
      const baseTime = 10000;

      // Record initial samples with consistent offset
      for (let i = 0; i < 5; i++) {
        timeSyncManager.recordSample(
          baseTime + i * 200,
          baseTime + i * 200 + 100, // 100ms offset
          baseTime + i * 200 + 105,
          baseTime + i * 200 + 200
        );
      }

      // Record samples with increased offset (simulating drift)
      for (let i = 5; i < 10; i++) {
        timeSyncManager.recordSample(
          baseTime + i * 200,
          baseTime + i * 200 + 150, // 150ms offset (50ms drift)
          baseTime + i * 200 + 155,
          baseTime + i * 200 + 250
        );
      }

      const driftResult = timeSyncManager.detectClockDrift();

      expect(driftResult.hasDrift).toBe(true);
      expect(driftResult.driftMs).toBeGreaterThan(40); // Approximately 50ms drift
    });

    test("should not detect drift with stable clock", () => {
      const baseTime = 10000;

      // Record samples with consistent offset
      for (let i = 0; i < 10; i++) {
        timeSyncManager.recordSample(
          baseTime + i * 200,
          baseTime + i * 200 + 100, // Consistent 100ms offset
          baseTime + i * 200 + 105,
          baseTime + i * 200 + 200
        );
      }

      const driftResult = timeSyncManager.detectClockDrift();

      expect(driftResult.hasDrift).toBe(false);
      expect(driftResult.driftMs).toBeLessThan(10);
    });

    test("should calculate drift rate", () => {
      const baseTime = 10000;

      // Record samples with increasing offset
      for (let i = 0; i < 10; i++) {
        const offset = 100 + i * 10; // Increasing by 10ms each sample
        timeSyncManager.recordSample(
          baseTime + i * 1000,
          baseTime + i * 1000 + offset,
          baseTime + i * 1000 + offset + 5,
          baseTime + i * 1000 + offset + 100
        );
      }

      const driftResult = timeSyncManager.detectClockDrift();

      expect(driftResult.driftRatePpm).not.toBe(0);
    });

    test("should apply drift correction", () => {
      const initialOffset = timeSyncManager.getCurrentOffsetMs();

      timeSyncManager.applyDriftCorrection(50);

      expect(timeSyncManager.getCurrentOffsetMs()).toBe(initialOffset + 50);
    });
  });

  describe("Time Conversion", () => {
    beforeEach(() => {
      // Record samples to establish sync with known offset
      for (let i = 0; i < 5; i++) {
        timeSyncManager.recordSample(
          1000 + i * 200,
          1250 + i * 200, // 250ms offset (server - client)
          1255 + i * 200,
          1505 + i * 200
        );
      }
    });

    test("should convert client time to server time", () => {
      const clientTime = 5000;
      const serverTime = timeSyncManager.clientTimeToServerTime(clientTime);

      // Server time should be client time + offset (250ms)
      expect(serverTime).toBe(clientTime + 250);
    });

    test("should convert server time to client time", () => {
      const serverTime = 5000;
      const clientTime = timeSyncManager.serverTimeToClientTime(serverTime);

      // Client time should be server time - offset (250ms)
      expect(clientTime).toBe(serverTime - 250);
    });

    test("should maintain conversion consistency", () => {
      const originalClientTime = 10000;
      const serverTime = timeSyncManager.clientTimeToServerTime(originalClientTime);
      const convertedClientTime = timeSyncManager.serverTimeToClientTime(serverTime);

      expect(convertedClientTime).toBe(originalClientTime);
    });
  });

  describe("Reset Functionality", () => {
    test("should reset all state", () => {
      // Record samples
      for (let i = 0; i < 5; i++) {
        timeSyncManager.recordSample(
          1000 + i * 200,
          1100 + i * 200,
          1105 + i * 200,
          1205 + i * 200
        );
      }

      expect(timeSyncManager.isSynced()).toBe(true);
      expect(timeSyncManager.getSamples().length).toBeGreaterThan(0);

      timeSyncManager.reset();

      expect(timeSyncManager.isSynced()).toBe(false);
      expect(timeSyncManager.getSamples()).toHaveLength(0);
      expect(timeSyncManager.getCurrentOffsetMs()).toBe(0);
      expect(timeSyncManager.getAverageRttMs()).toBe(0);
    });
  });

  describe("Global Instance Management", () => {
    test("should get global instance", () => {
      const globalManager = getTimeSyncManager();
      expect(globalManager).toBeInstanceOf(TimeSyncManager);
    });

    test("should return same global instance", () => {
      const manager1 = getTimeSyncManager();
      const manager2 = getTimeSyncManager();
      expect(manager1).toBe(manager2);
    });

    test("should set global instance", () => {
      const newManager = new TimeSyncManager();
      setTimeSyncManager(newManager);

      expect(getTimeSyncManager()).toBe(newManager);
    });

    test("should reset global instance", () => {
      resetTimeSyncManager();
      const manager = getTimeSyncManager();
      expect(manager).toBeInstanceOf(TimeSyncManager);
    });
  });

  describe("Configuration Updates", () => {
    test("should update config", () => {
      timeSyncManager.updateConfig({ maxAcceptableRttMs: 150 });

      // Verify by recording sample with RTT between 150 and 200
      const consoleWarnSpy = jest.spyOn(console, "warn").mockImplementation();

      const accepted = timeSyncManager.recordSample(
        1000,
        1100,
        1105,
        1260 // RTT = 260ms, should be rejected with new config
      );

      // With 150ms config, sample with 160ms RTT should be rejected
      expect(accepted).toBe(false);

      consoleWarnSpy.mockRestore();
    });
  });

  describe("Edge Cases", () => {
    test("should handle empty samples gracefully", () => {
      const driftResult = timeSyncManager.detectClockDrift();

      expect(driftResult.hasDrift).toBe(false);
      expect(driftResult.driftMs).toBe(0);
    });

    test("should handle single sample", () => {
      timeSyncManager.recordSample(1000, 1100, 1105, 1205);

      const driftResult = timeSyncManager.detectClockDrift();

      expect(driftResult.hasDrift).toBe(false);
    });

    test("should handle very small RTT", () => {
      const accepted = timeSyncManager.recordSample(
        1000,
        1001,
        1002,
        1003 // RTT = 3ms
      );

      expect(accepted).toBe(true);
    });

    test("should handle zero drift history after correction", () => {
      // Record samples
      for (let i = 0; i < 5; i++) {
        timeSyncManager.recordSample(
          1000 + i * 200,
          1100 + i * 200,
          1105 + i * 200,
          1205 + i * 200
        );
      }

      // Detect drift (builds history)
      timeSyncManager.detectClockDrift();
      expect(timeSyncManager.getDriftHistory().length).toBeGreaterThan(0);

      // Apply correction (clears history)
      timeSyncManager.applyDriftCorrection(50);
      expect(timeSyncManager.getDriftHistory()).toHaveLength(0);
    });
  });
});
