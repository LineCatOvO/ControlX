# ControlX Server 监控部署文档

## 概述

ControlX Server 提供了完整的可观测性指标，支持 Prometheus 格式导出。本文档介绍如何部署 Prometheus + Grafana 监控系统。

---

## 指标端点

ControlX Server 通过健康检查服务器提供以下端点：

| 端点 | 格式 | 用途 |
|------|------|------|
| `/metrics/prometheus` | Prometheus | Prometheus 抓取 |
| `/metrics` | JSON | 人工检查、调试 |
| `/health` | JSON | 存活探针 |
| `/ready` | JSON | 就绪探针 |
| `/stats` | JSON | 详细统计信息 |

**默认端口**: 28080（可通过环境变量 WEB_PORT 配置）

---

## Prometheus 部署

### 1. 安装 Prometheus

**使用 Docker**:
```bash
docker run -d \
  --name prometheus \
  -p 9090:9090 \
  -v /path/to/prometheus.yml:/etc/prometheus/prometheus.yml \
  prom/prometheus
```

**使用二进制**:
```bash
# 下载
wget https://github.com/prometheus/prometheus/releases/download/v2.45.0/prometheus-2.45.0.linux-amd64.tar.gz
tar xvf prometheus-2.45.0.linux-amd64.tar.gz

# 启动
cd prometheus-2.45.0.linux-amd64
./prometheus --config.file=prometheus.yml
```

### 2. 配置 Prometheus

复制配置文件：
```bash
cp Server/monitoring/prometheus.yml /etc/prometheus/prometheus.yml
```

编辑配置文件，修改 targets 地址：
```yaml
scrape_configs:
  - job_name: 'controlx-server'
    static_configs:
      - targets: ['<your-server-ip>:28080']
```

如果需要告警规则：
```yaml
rule_files:
  - '/path/to/alerting-rules.yml'
```

### 3. 启动 Prometheus

```bash
prometheus --config.file=/etc/prometheus/prometheus.yml
```

访问 http://localhost:9090 验证 Prometheus 运行正常。

---

## Grafana 部署

### 1. 安装 Grafana

**使用 Docker**:
```bash
docker run -d \
  --name grafana \
  -p 3000:3000 \
  grafana/grafana
```

**使用二进制**:
```bash
# 下载
wget https://github.com/grafana/grafana/releases/download/v10.0.0/grafana-10.0.0.linux-amd64.tar.gz
tar xvf grafana-10.0.0.linux-amd64.tar.gz

# 启动
cd grafana-10.0.0.linux-amd64
./bin/grafana-server
```

### 2. 配置数据源

访问 http://localhost:3000，默认用户名密码：admin/admin

添加 Prometheus 数据源：
1. Configuration → Data Sources → Add data source
2. 选择 Prometheus
3. URL: http://localhost:9090
4. 点击 "Save & Test"

### 3. 导入 Dashboard

导入 ControlX Server Dashboard：
1. Dashboards → Import
2. 上传 `Server/monitoring/grafana-dashboard.json` 文件
3. 选择 Prometheus 数据源
4. 点击 "Import"

---

## Alertmanager 配置（可选）

### 1. 安装 Alertmanager

```bash
docker run -d \
  --name alertmanager \
  -p 9093:9093 \
  prom/alertmanager
```

### 2. 配置告警通知

编辑 Alertmanager 配置文件 `alertmanager.yml`：
```yaml
global:
  smtp_smarthost: 'smtp.example.com:587'
  smtp_from: 'alertmanager@example.com'
  smtp_auth_username: 'alertmanager@example.com'
  smtp_auth_password: 'password'

route:
  receiver: 'email'
  
receivers:
  - name: 'email'
    email_configs:
      - to: 'admin@example.com'
```

### 3. 在 Prometheus 中配置 Alertmanager

编辑 `prometheus.yml`：
```yaml
alerting:
  alertmanagers:
    - static_configs:
        - targets: ['localhost:9093']
```

---

## 指标列表

### 连接指标
- `controlx_server_connections_total` - 总连接数
- `controlx_server_disconnections_total` - 总断开数
- `controlx_server_active_connections` - 活跃连接数
- `controlx_server_messages_received_total` - 接收消息总数

### 延迟指标
- `controlx_server_latency_rtt_seconds` - RTT 延迟直方图
- `controlx_server_latency_rtt_current_ms` - 当前 RTT 延迟
- `controlx_server_latency_rtt_average_ms` - 平均 RTT 延迟
- `controlx_server_latency_rtt_min_ms` - 最小 RTT 延迟
- `controlx_server_latency_rtt_max_ms` - 最大 RTT 延迟
- `controlx_server_latency_rtt_p95_ms` - P95 RTT 延迟

### 吞吐量指标
- `controlx_server_input_events_total` - 总输入事件数
- `controlx_server_input_keyboard_events_total` - 键盘事件数
- `controlx_server_input_mouse_events_total` - 鼠标事件数
- `controlx_server_input_gamepad_events_total` - 手柄事件数
- `controlx_server_input_joystick_events_total` - 操纵杆事件数
- `controlx_server_input_events_per_second` - 当前吞吐量
- `controlx_server_input_events_per_second_1m` - 1分钟平均吞吐量
- `controlx_server_input_events_per_second_5m` - 5分钟平均吞吐量

### 错误指标
- `controlx_server_errors_total` - 总错误数
- `controlx_server_errors_validation_total` - 验证错误数
- `controlx_server_errors_network_total` - 网络错误数
- `controlx_server_errors_system_total` - 系统错误数
- `controlx_server_errors_timeout_total` - 超时错误数
- `controlx_server_errors_rate_current` - 当前错误率

### 资源指标
- `controlx_server_cpu_usage_percent` - CPU 使用率
- `controlx_server_memory_heap_used_bytes` - 堆内存使用量
- `controlx_server_memory_heap_total_bytes` - 堆内存总量
- `controlx_server_memory_rss_bytes` - RSS 内存使用量

---

## 告警规则

已配置的告警规则：

| 告警名称 | 触发条件 | 严重性 |
|----------|----------|--------|
| HighLatency | P95延迟 > 100ms | warning |
| VeryHighLatency | P95延迟 > 250ms | critical |
| HighErrorRate | 错误率 > 0.1/s | warning |
| ValidationErrorsSpike | 5分钟验证错误增加 > 10 | warning |
| HighCPUUsage | CPU使用率 > 80% | warning |
| VeryHighCPUUsage | CPU使用率 > 95% | critical |
| HighMemoryUsage | 内存使用率 > 80% | warning |
| VeryHighMemoryUsage | 内存使用率 > 95% | critical |
| TooManyConnections | 活跃连接数 > 50 | warning |
| LowThroughput | 吞吐量 < 1/s | warning |
| ServiceDown | 服务不可访问 | critical |

---

## Kubernetes 集成

### Prometheus Operator

使用 Prometheus Operator 部署：

```yaml
apiVersion: monitoring.coreos.com/v1
kind: Prometheus
metadata:
  name: controlx-prometheus
spec:
  serviceMonitorSelector:
    matchLabels:
      app: controlx-server
  resources:
    requests:
      memory: 400Mi
```

### ServiceMonitor

```yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: controlx-server
  labels:
    app: controlx-server
spec:
  selector:
    matchLabels:
      app: controlx-server
  endpoints:
    - port: web
      path: /metrics/prometheus
      interval: 30s
```

### Pod 监控

在 Pod 定义中添加探针：
```yaml
livenessProbe:
  httpGet:
    path: /health
    port: 28080
  initialDelaySeconds: 30
  periodSeconds: 10

readinessProbe:
  httpGet:
    path: /ready
    port: 28080
  initialDelaySeconds: 5
  periodSeconds: 5
```

---

## 最佳实践

### 1. 生产环境配置
- 使用 HTTPS（配置 TLS）
- 使用认证（配置 basic auth）
- 设置合理的抓取间隔（15-30s）
- 配置数据保留策略（默认 15 天）

### 2. 高可用配置
- 使用 Prometheus 集群
- 配置 Alertmanager 集群
- 使用 Grafana 高可用部署

### 3. 性能优化
- 监控 Prometheus 自身性能
- 合理配置抓取间隔
- 使用 recording rules 减少查询压力

---

## 故障排查

### Prometheus 无法抓取指标
1. 检查健康检查服务器是否运行
2. 检查防火墙规则
3. 验证端点可访问性：`curl http://localhost:28080/metrics/prometheus`

### Grafana 无法显示数据
1. 检查 Prometheus 数据源配置
2. 验证 Prometheus 有数据：访问 Prometheus UI
3. 检查 Dashboard 配置

### 告警不触发
1. 检查告警规则配置
2. 验证指标值是否达到阈值
3. 检查 Alertmanager 配置

---

## 参考资源

- [Prometheus 文档](https://prometheus.io/docs/)
- [Grafana 文档](https://grafana.com/docs/)
- [Alertmanager 文档](https://prometheus.io/docs/alerting/latest/alertmanager/)
- [Prometheus Operator](https://github.com/prometheus-operator/prometheus-operator)

---

**文档版本**: 1.0.0
**最后更新**: 2026-04-05