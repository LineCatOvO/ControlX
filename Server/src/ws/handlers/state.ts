// State message handler

import { StateMessage, StateAckMessage } from '../../types/ws';
import { InputValidator, ValidationError } from '../../input/validator';

// Create validator instance
const validator = new InputValidator();

// Error code definition
const ERROR_CODES = {
    VALIDATION_FAILED: 'VALIDATION_FAILED',
    SEQUENCE_ERROR: 'SEQUENCE_ERROR',
    STATE_STORE_ERROR: 'STATE_STORE_ERROR',
    INTERNAL_ERROR: 'INTERNAL_ERROR',
    WEBSOCKET_ERROR: 'WEBSOCKET_ERROR',
} as const;

// ACK statistics
const ackStats = {
  total: 0,
  success: 0,
  rejected: 0,
  errors: 0,
  timestamps: [] as number[],
};

// Validation statistics
const validationStats = {
  total: 0,
  passed: 0,
  failed: 0,
  sequenceErrors: 0,  // Sequence number error count
  errorsByField: {} as Record<string, number>,
  timestamps: [] as number[],
};

/**
 * Update ACK statistics
 * @param status ACK status
 * @param serverApplyTs Server application time
 */
function updateAckStats(status: 'success' | 'rejected' | 'error', serverApplyTs: number) {
  ackStats.total++;

  if (status === 'success') {
    ackStats.success++;
  } else if (status === 'rejected') {
    ackStats.rejected++;
  } else {
    ackStats.errors++;
  }

  ackStats.timestamps.push(serverApplyTs);

  // Only keep recent 1000 timestamps
  if (ackStats.timestamps.length > 1000) {
    ackStats.timestamps.shift();
  }

  // Every 100 ACKs output statistics once
  if (ackStats.total % 100 === 0) {
    console.log('ACK Stats:', {
      total: ackStats.total,
      success: ackStats.success,
      rejected: ackStats.rejected,
      errors: ackStats.errors,
      successRate: `${((ackStats.success / ackStats.total) * 100).toFixed(2)}%`,
    });
  }
}

/**
 * Update validation statistics
 * @param valid Whether validation passed
 * @param errors Validation error list
 */
function updateValidationStats(valid: boolean, errors: ValidationError[]) {
  validationStats.total++;
  validationStats.timestamps.push(Date.now());

  // Only keep recent 1000 timestamps
  if (validationStats.timestamps.length > 1000) {
    validationStats.timestamps.shift();
  }

  if (valid) {
    validationStats.passed++;
  } else {
    validationStats.failed++;

    // Count errors by field
    errors.forEach(error => {
      if (error.field) {
        validationStats.errorsByField[error.field] =
          (validationStats.errorsByField[error.field] || 0) + 1;
      }

      // Detect sequence number error
      if (error.message.includes('sequence') || error.message.includes('sequence number')) {
        validationStats.sequenceErrors++;
      }
    });
  }

  // Output statistics every 100 validations
  if (validationStats.total % 100 === 0) {
    console.log('Validation Stats:', {
      total: validationStats.total,
      passed: validationStats.passed,
      failed: validationStats.failed,
      sequenceErrors: validationStats.sequenceErrors,
      passRate: `${((validationStats.passed / validationStats.total) * 100).toFixed(2)}%`,
      errorsByField: validationStats.errorsByField,
    });
  }
}

/**
 * Get ACK statistics
 */
function getAckStats() {
  return { ...ackStats };
}

/**
 * Get validation statistics
 */
function getValidationStats() {
  return { ...validationStats };
}

/**
 * Handle state channel message
 * @param ws WebSocket connection
 * @param message State message
 */
export function handleState(ws: any, message: StateMessage) {
    const recvTime = Date.now();
    const stateId = message.stateId;

    // Get global state store instance
    const stateStore = (global as any).stateStore;

    // Check if state store is available
    if (!stateStore) {
        console.error(`[StateHandler] ❌ StateStore not available for state ${stateId}`);
        sendErrorAck(ws, stateId, recvTime, ERROR_CODES.STATE_STORE_ERROR, 'StateStore not available');
        return;
    }

    try {
        // Convert StateMessage to InputState format
        // Note: joystick property is for independent joystick device, gamepad joysticks use gamepadAxes
        const inputState = {
            frameId: message.stateId,
            keyboard: new Set(message.keyboardState
                .filter(keyEvent => keyEvent.eventType === 'pressed' || keyEvent.eventType === 'held')
                .map(keyEvent => keyEvent.keyId)
            ),
            gamepad: new Set(message.gamepadState.buttons
                .filter(btnEvent => btnEvent.eventType === 'pressed' || btnEvent.eventType === 'held')
                .map(btnEvent => btnEvent.buttonId)
            ),
            // Gamepad joystick axis mapping (extract left and right joysticks completely)
            gamepadAxes: {
                LX: message.gamepadState.joysticks.left.x,
                LY: message.gamepadState.joysticks.left.y,
                RX: message.gamepadState.joysticks.right.x,
                RY: message.gamepadState.joysticks.right.y
            },
            // Gamepad trigger mapping
            gamepadTriggers: {
                LT: message.gamepadState.triggers.left,
                RT: message.gamepadState.triggers.right
            },
            mouse: {
                x: 0, // Temporarily use default value, can be extended later
                y: 0,
                left: false,
                right: false,
                middle: false
            },
            // joystick property is reserved for independent joystick device (separate from gamepad joysticks)
            joystick: {
                x: 0, // Independent joystick device default value
                y: 0,
                deadzone: 0.1,
                smoothing: 0.5
            }
        };

        // Validate input state (including sequence number monotonicity validation)
        const validationResult = validator.validate(inputState);

        // Update validation statistics
        updateValidationStats(validationResult.valid, validationResult.errors);

        if (!validationResult.valid) {
            // Validation failed, log detailed error
            validationResult.errors.forEach(error => {
                console.error(`[StateHandler] ❌ Validation error: ${error.message}`);
                if (error.field) {
                    console.error(`  Field: ${error.field}`);
                }
                if (error.expected) {
                    console.error(`  Expected: ${error.expected}`);
                }
                if (error.actual) {
                    console.error(`  Actual: ${error.actual}`);
                }
            });

            // Check if it is a sequence number error
            const isSequenceError = validationResult.errors.some(
                err => err.message.includes('sequence') || err.message.includes('sequence number')
            );

            if (isSequenceError) {
                console.warn(`[StateHandler] ⚠️ Sequence number error for state ${stateId}, resetting validator`);
                // Reset validator state on sequence number error (handle retransmission scenario)
                validator.reset();
            }

            // Trigger safety clear (before sending ACK)
            const safetyController = (global as any).safetyController;
            if (safetyController && typeof safetyController.triggerExceptionClear === "function") {
                safetyController.triggerExceptionClear(
                    `Validation failed: ${validationResult.errors[0]?.message || "Invalid state"}`
                );
            }

            // Send error ACK message
            sendErrorAck(
                ws,
                stateId,
                recvTime,
                ERROR_CODES.VALIDATION_FAILED,
                `Validation failed: ${validationResult.errors[0]?.message || 'Invalid state'}`
            );
            return;
        }

        // Validation passed, store state
        const stored = stateStore.storeState(inputState);

        if (!stored) {
            console.warn(`[StateHandler] ⚠️ StateStore rejected state ${stateId}`);
        }

        // Send success ACK message
        sendAck(ws, stateId, recvTime, stored ? 'success' : 'rejected', stored ? undefined : 'StateStore rejected');

    } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.error(`[StateHandler] ❌ Error handling state message ${stateId}:`, errorMsg);

        // Send error ACK message
        sendErrorAck(ws, stateId, recvTime, ERROR_CODES.INTERNAL_ERROR, `Internal error: ${errorMsg}`);
    }
}

/**
 * Send success ACK message
 * @param ws WebSocket connection
 * @param stateId State ID
 * @param recvTime Receive time
 * @param status ACK status
 * @param reason Reason (optional)
 */
function sendAck(ws: any, stateId: number, recvTime: number, status: 'success' | 'rejected', reason?: string) {
    const ackMessage: StateAckMessage = {
        type: 'stateAck',
        ackStateId: stateId,
        serverRecvTs: recvTime,
        serverApplyTs: Date.now(),
        status: status,
        reason: reason
    };

    try {
        ws.send(JSON.stringify(ackMessage));
        updateAckStats(status, Date.now());
    } catch (error) {
        console.error('Error sending stateAck:', error);
        updateAckStats('error', Date.now());
    }
}

/**
 * Send error ACK message
 * @param ws WebSocket connection
 * @param stateId State ID
 * @param recvTime Receive time
 * @param errorCode Error code
 * @param reason Error reason
 */
function sendErrorAck(ws: any, stateId: number, recvTime: number, errorCode: string, reason: string) {
    const ackMessage: StateAckMessage = {
        type: 'stateAck',
        ackStateId: stateId,
        serverRecvTs: recvTime,
        serverApplyTs: Date.now(),
        status: 'rejected',
        reason: `[${errorCode}] ${reason}`
    };

    try {
        ws.send(JSON.stringify(ackMessage));
        updateAckStats('rejected', Date.now());
    } catch (error) {
        console.error('Error sending error stateAck:', error);
        updateAckStats('error', Date.now());
    }
}

// Export statistics function for external use
export { getAckStats, getValidationStats };
