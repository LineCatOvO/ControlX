# 系统依赖文档

本文档记录 WMMT Controller 项目所需的所有系统级依赖、安装步骤和验证方法。

## 📋 依赖清单

### 1. ViGEmBus 驱动（Windows）

**用途**：创建虚拟 Xbox 360 控制器，使游戏能够识别虚拟手柄输入

**下载地址**：
- 官方下载：https://github.com/ViGEm/ViGEmBus/releases
- 推荐版本：ViGEmBus_1.21.2_setup.exe

**安装步骤**：
1. 下载安装包
2. 以管理员身份运行安装程序
3. 等待安装完成
4. 重启计算机

**验证方法**：
```powershell
# PowerShell 验证
Test-ViGEmBus
# 或在设备管理器中查看是否出现 "VIGEM Bus Driver"
```

**常见问题**：
- 安装失败：确保以管理员身份运行
- 设备管理器看不到：重启计算机
- 权限错误：确保用户有管理员权限

---

### 2. Windows Build Tools

**用途**：编译 node-vigemclient（C++ native addon）

**安装步骤**：
```bash
# 方式 1：使用 npm（推荐）
npm install -g windows-build-tools

# 方式 2：手动安装 Visual Studio Build Tools
# 下载地址：https://visualstudio.microsoft.com/downloads/
# 选择 "Desktop development with C++" 工作负载
```

**验证方法**：
```bash
node -p "require('node-gyp').version"
```

**常见问题**：
- 编译失败：确保安装了 Visual Studio Build Tools
- 权限问题：以管理员身份运行 PowerShell

---

### 3. node-vigemclient

**用途**：Node.js 绑定库，用于与 ViGEmBus 通信

**安装步骤**：
```bash
cd /home/linecat/agent-workspace/projects/ControlX/Server
npm install vigemclient
```

**验证方法**：
```bash
npm list vigemclient
# 应该显示：vigemclient@x.x.x

# 或检查 node_modules 目录
ls node_modules/vigemclient
```

**常见问题**：
- 安装失败：确保已安装 Windows Build Tools
- 版本不兼容：检查 Node.js 版本（>= 16.x）

---

### 4. node-key-sender（键盘输入）

**用途**：发送虚拟键盘事件

**安装步骤**：
```bash
cd /home/linecat/agent-workspace/projects/ControlX/Server
npm install node-key-sender
```

**验证方法**：
```bash
npm list node-key-sender
```

---

## 🔧 环境变量配置

### VIGEM_CLIENT_PATH

**用途**：指向 vigemclient 的安装路径

**设置步骤**：
1. 右键"此电脑" → "属性" → "高级系统设置"
2. 点击"环境变量"
3. 在"系统变量"或"用户变量"中添加：
   - 变量名：`VIGEM_CLIENT_PATH`
   - 变量值：`C:\Users\你的用户名\AppData\Roaming\npm\node_modules\vigemclient`

**验证方法**：
```powershell
echo $env:VIGEM_CLIENT_PATH
```

---

## 📝 安装脚本

### Windows PowerShell 安装脚本

创建文件 `install-dependencies.ps1`：

```powershell
# WMMT Controller 依赖安装脚本
# 需要以管理员身份运行

Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "WMMT Controller 依赖安装脚本" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

# 检查管理员权限
if (-not ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Write-Host "错误: 请以管理员身份运行此脚本" -ForegroundColor Red
    exit 1
}

# 1. 安装 ViGEmBus 驱动
Write-Host "[1/4] 安装 ViGEmBus 驱动..." -ForegroundColor Yellow
Write-Host "请手动下载并安装 ViGEmBus 驱动" -ForegroundColor Gray
Write-Host "下载地址: https://github.com/ViGEm/ViGEmBus/releases" -ForegroundColor Gray
Write-Host "按任意键继续..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

# 2. 安装 Windows Build Tools
Write-Host "[2/4] 安装 Windows Build Tools..." -ForegroundColor Yellow
npm install -g windows-build-tools
if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Windows Build Tools 安装成功" -ForegroundColor Green
} else {
    Write-Host "✗ Windows Build Tools 安装失败" -ForegroundColor Red
}

# 3. 安装 node-vigemclient
Write-Host "[3/4] 安装 node-vigemclient..." -ForegroundColor Yellow
Set-Location $PSScriptRoot
npm install vigemclient
if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ node-vigemclient 安装成功" -ForegroundColor Green
} else {
    Write-Host "✗ node-vigemclient 安装失败" -ForegroundColor Red
}

# 4. 安装 node-key-sender
Write-Host "[4/4] 安装 node-key-sender..." -ForegroundColor Yellow
npm install node-key-sender
if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ node-key-sender 安装成功" -ForegroundColor Green
} else {
    Write-Host "✗ node-key-sender 安装失败" -ForegroundColor Red
}

# 5. 配置环境变量
Write-Host ""
Write-Host "配置 VIGEM_CLIENT_PATH 环境变量..." -ForegroundColor Yellow
$nodeModulesPath = Join-Path $PSScriptRoot "node_modules\vigemclient"
if (Test-Path $nodeModulesPath) {
    [Environment]::SetEnvironmentVariable("VIGEM_CLIENT_PATH", $nodeModulesPath, "User")
    Write-Host "✓ 环境变量已设置: $nodeModulesPath" -ForegroundColor Green
} else {
    Write-Host "⚠ node_modules\vigemclient 不存在，请手动设置环境变量" -ForegroundColor Yellow
}

# 验证安装
Write-Host ""
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "验证安装结果" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan

Write-Host ""
Write-Host "Node.js 版本:" -ForegroundColor Yellow
node --version

Write-Host ""
Write-Host "npm 版本:" -ForegroundColor Yellow
npm --version

Write-Host ""
Write-Host "检查 Windows Build Tools:" -ForegroundColor Yellow
try {
    $version = node -p "require('node-gyp').version"
    Write-Host "✓ Windows Build Tools: $version" -ForegroundColor Green
} catch {
    Write-Host "✗ Windows Build Tools 未正确安装" -ForegroundColor Red
}

Write-Host ""
Write-Host "检查 node-vigemclient:" -ForegroundColor Yellow
try {
    require($nodeModulesPath)
    Write-Host "✓ node-vigemclient 可用" -ForegroundColor Green
} catch {
    Write-Host "✗ node-vigemclient 不可用" -ForegroundColor Red
}

Write-Host ""
Write-Host "安装完成！" -ForegroundColor Green
Write-Host "请重启计算机使所有更改生效。" -ForegroundColor Yellow
```

**使用方法**：
1. 右键点击文件 → "以管理员身份运行 PowerShell"
2. 脚本会自动安装所有依赖

---

## 🧪 验证脚本

创建文件 `test-dependencies.ps1`：

```powershell
# 依赖验证脚本

Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "WMMT Controller 依赖验证" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

$allPassed = $true

# 1. 检查 Node.js
Write-Host "[1/5] 检查 Node.js..." -ForegroundColor Yellow
if (Get-Command node -ErrorAction SilentlyContinue) {
    $nodeVersion = node --version
    Write-Host "✓ Node.js: $nodeVersion" -ForegroundColor Green
} else {
    Write-Host "✗ Node.js 未安装" -ForegroundColor Red
    $allPassed = $false
}

# 2. 检查 npm
Write-Host "[2/5] 检查 npm..." -ForegroundColor Yellow
if (Get-Command npm -ErrorAction SilentlyContinue) {
    $npmVersion = npm --version
    Write-Host "✓ npm: $npmVersion" -ForegroundColor Green
} else {
    Write-Host "✗ npm 未安装" -ForegroundColor Red
    $allPassed = $false
}

# 3. 检查 Windows Build Tools
Write-Host "[3/5] 检查 Windows Build Tools..." -ForegroundColor Yellow
try {
    $version = node -p "require('node-gyp').version"
    Write-Host "✓ Windows Build Tools: $version" -ForegroundColor Green
} catch {
    Write-Host "✗ Windows Build Tools 未安装" -ForegroundColor Red
    $allPassed = $false
}

# 4. 检查 node-vigemclient
Write-Host "[4/5] 检查 node-vigemclient..." -ForegroundColor Yellow
$nodeModulesPath = Join-Path $PSScriptRoot "node_modules\vigemclient"
if (Test-Path $nodeModulesPath) {
    try {
        require($nodeModulesPath)
        Write-Host "✓ node-vigemclient 可用" -ForegroundColor Green
    } catch {
        Write-Host "✗ node-vigemclient 不可用" -ForegroundColor Red
        $allPassed = $false
    }
} else {
    Write-Host "✗ node-vigemclient 未安装" -ForegroundColor Red
    $allPassed = $false
}

# 5. 检查 node-key-sender
Write-Host "[5/5] 检查 node-key-sender..." -ForegroundColor Yellow
if (Test-Path (Join-Path $PSScriptRoot "node_modules\node-key-sender")) {
    Write-Host "✓ node-key-sender 已安装" -ForegroundColor Green
} else {
    Write-Host "⚠ node-key-sender 未安装（可选）" -ForegroundColor Yellow
}

# 6. 检查环境变量
Write-Host ""
Write-Host "[6/6] 检查 VIGEM_CLIENT_PATH 环境变量..." -ForegroundColor Yellow
$vigemPath = [Environment]::GetEnvironmentVariable("VIGEM_CLIENT_PATH", "User")
if ($vigemPath -and (Test-Path $vigemPath)) {
    Write-Host "✓ VIGEM_CLIENT_PATH: $vigemPath" -ForegroundColor Green
} else {
    Write-Host "⚠ VIGEM_CLIENT_PATH 未设置或无效" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "=====================================" -ForegroundColor Cyan
if ($allPassed) {
    Write-Host "所有依赖检查通过！" -ForegroundColor Green
    Write-Host "=====================================" -ForegroundColor Green
    exit 0
} else {
    Write-Host "部分依赖检查失败，请按照上述步骤安装缺失的依赖。" -ForegroundColor Yellow
    Write-Host "=====================================" -ForegroundColor Yellow
    exit 1
}
```

**使用方法**：
```powershell
.\test-dependencies.ps1
```

---

## 📚 参考资源

- **ViGEmBus 官方文档**：https://github.com/ViGEm/ViGEmBus
- **node-vigemclient 文档**：https://github.com/ViGEm/node-vigemclient
- **node-key-sender 文档**：https://github.com/anthonyastorga/node-key-sender
- **Windows Build Tools**：https://github.com/felixrieseberg/windows-build-tools

---

## ✅ 任务完成清单

- [ ] 1.1.1 下载并安装 ViGEmBus 驱动（管理员权限）
- [ ] 1.1.2 安装 Windows Build Tools
- [ ] 1.1.3 安装 node-vigemclient 包
- [ ] 1.1.4 配置 VIGEM_CLIENT_PATH 环境变量
- [ ] 1.1.5 创建 docs/dependencies.md 文档

**当前状态**：✅ 1.1.5 已完成（创建此文档）

**待完成**：
- 需要在 Windows 环境下执行安装脚本
- 验证所有依赖安装成功
