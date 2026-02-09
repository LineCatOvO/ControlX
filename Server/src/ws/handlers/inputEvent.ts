import { InputEventMessage } from '../../types/ws';
import { getExecutorManager } from '../../input/executor';
import { formatInputEventMessageLog } from '../../utils/logInputData';

/**
 * 处理输入事件消息
 * @param ws WebSocket连接
 * @param message 输入事件消息
 */
export function handleInputEvent(ws: any, message: InputEventMessage) {
  // 获取输入执行器管理器
  const executorManager = getExecutorManager();
  
  // 应用输入事件到所有执行器
  executorManager.applyEvent(message.data);
  
  // 记录详细的输入事件数据日志
  console.log(formatInputEventMessageLog(message));
}