// 状态消息处理器

import { StateMessage, StateAckMessage } from '../../types/ws';
import { InputValidator, ValidationError } from '../../input/validator';

// 创建验证器实例
const validator = new InputValidator();

// 错误码定义
const ERROR_CODES = {
    VALIDATION_FAILED: 'VALIDATION_FAILED',
    SEQUENCE_ERROR: 'SEQUENCE_ERROR',
    STATE_STORE_ERROR: 'STATE_STORE_ERROR',
    INTERNAL_ERROR: 'INTERNAL_ERROR',
    WEBSOCKET_ERROR: 'WEBSOCKET_ERROR',
} as const;

// ACK 统计
const ackStats = {
  total: 0,
  success: 0,
  rejected: 0,
  errors: 0,
  timestamps: [] as number[],
};

// 验证统计
const validationStats = {
  total: 0,
  passed: 0,
  failed: 0,
  sequenceErrors: 0,  // 序列号错误计数
  errorsByField: {} as Record<string, number>,
  timestamps: [] as number[],
};

/**
 * 更新 ACK 统计
 * @param status ACK 状态
 * @param serverApplyTs 服务端应用时间
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

  // 只保留最近 1000 个时间戳
  if (ackStats.timestamps.length > 1000) {
    ackStats.timestamps.shift();
  }

  // 每 100 个 ACK 输出一次统计
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
 * 更新验证统计
 * @param valid 验证是否通过
 * @param errors 验证错误列表
 */
function updateValidationStats(valid: boolean, errors: ValidationError[]) {
  validationStats.total++;
  validationStats.timestamps.push(Date.now());

  // 只保留最近 1000 个时间戳
  if (validationStats.timestamps.length > 1000) {
    validationStats.timestamps.shift();
  }

  if (valid) {
    validationStats.passed++;
  } else {
    validationStats.failed++;

    // 统计各字段的错误数量
    errors.forEach(error => {
      if (error.field) {
        validationStats.errorsByField[error.field] =
          (validationStats.errorsByField[error.field] || 0) + 1;
      }

      // 检测序列号错误
      if (error.message.includes('sequence') || error.message.includes('序列号')) {
        validationStats.sequenceErrors++;
      }
    });
  }

  // 每 100 次验证输出一次统计
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
 * 获取 ACK 统计
 */
function getAckStats() {
  return { ...ackStats };
}

/**
 * 获取验证统计
 */
function getValidationStats() {
  return { ...validationStats };
}

/**
 * 处理状态通道消息
 * @param ws WebSocket 连接
 * @param message 状态消息
 */
export function handleState(ws: any, message: StateMessage) {
    const recvTime = Date.now();
    const stateId = message.stateId;

    // 获取全局状态存储实例
    const stateStore = (global as any).stateStore;

    // 检查状态存储是否可用
    if (!stateStore) {
        console.error(`[StateHandler] ❌ StateStore not available for state ${stateId}`);
        sendErrorAck(ws, stateId, recvTime, ERROR_CODES.STATE_STORE_ERROR, 'StateStore not available');
        return;
    }

    try {
        // 将 StateMessage 转换为 InputState 格式
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
            mouse: {
                x: 0, // 暂时使用默认值，后续可扩展
                y: 0,
                left: false,
                right: false,
                middle: false
            },
            joystick: {
                x: message.gamepadState.joysticks.left.x,
                y: message.gamepadState.joysticks.left.y,
                deadzone: message.gamepadState.joysticks.left.deadzone,
                smoothing: 0.5 // 暂时使用默认值，后续可扩展
            }
        };

        // 验证输入状态（包括序列号单调性验证）
        const validationResult = validator.validate(inputState);

        // 更新验证统计
        updateValidationStats(validationResult.valid, validationResult.errors);

        if (!validationResult.valid) {
            // 验证失败，记录详细错误
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

            // 检查是否是序列号错误
            const isSequenceError = validationResult.errors.some(
                err => err.message.includes('sequence') || err.message.includes('序列号')
            );

            if (isSequenceError) {
                console.warn(`[StateHandler] ⚠️ Sequence number error for state ${stateId}, resetting validator`);
                // 序列号错误时，重置验证器状态（处理重传场景）
                validator.reset();
            }

            // 触发安全清零（在发送 ACK 之前）
            const safetyController = (global as any).safetyController;
            if (safetyController && typeof safetyController.triggerExceptionClear === "function") {
                safetyController.triggerExceptionClear(
                    `Validation failed: ${validationResult.errors[0]?.message || "Invalid state"}`
                );
            }

            // 发送错误 ACK 消息
            sendErrorAck(
                ws,
                stateId,
                recvTime,
                ERROR_CODES.VALIDATION_FAILED,
                `Validation failed: ${validationResult.errors[0]?.message || 'Invalid state'}`
            );
            return;
        }

        // 验证通过，存储状态
        const stored = stateStore.storeState(inputState);

        if (!stored) {
            console.warn(`[StateHandler] ⚠️ StateStore rejected state ${stateId}`);
        }

        // 发送成功 ACK 消息
        sendAck(ws, stateId, recvTime, stored ? 'success' : 'rejected', stored ? undefined : 'StateStore rejected');

    } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.error(`[StateHandler] ❌ Error handling state message ${stateId}:`, errorMsg);

        // 发送错误 ACK 消息
        sendErrorAck(ws, stateId, recvTime, ERROR_CODES.INTERNAL_ERROR, `Internal error: ${errorMsg}`);
    }
}

/**
 * 发送成功 ACK 消息
 * @param ws WebSocket 连接
 * @param stateId 状态 ID
 * @param recvTime 接收时间
 * @param status ACK 状态
 * @param reason 原因（可选）
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
 * 发送错误 ACK 消息
 * @param ws WebSocket 连接
 * @param stateId 状态 ID
 * @param recvTime 接收时间
 * @param errorCode 错误码
 * @param reason 错误原因
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

// 导出统计函数供外部使用
export { getAckStats, getValidationStats };
