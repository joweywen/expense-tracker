# ============================================================
# 配置 (确保使用英文双引号)
# ============================================================
$ProjectPath = "D:\joweywen\expense-tracker"
$LogFile = "$ProjectPath\restart.log"
$ErrorLog = "$ProjectPath\electron_error.log"
$TargetPort = 3000

# 1. 强制管理员权限检查
$currentPrincipal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
if (-not $currentPrincipal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Write-Host "CRITICAL ERROR: Please run this script as Administrator!" -ForegroundColor Red
    exit
}

function Write-Log($Message) {
    $Timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $Msg = "[$Timestamp] $Message"
    Write-Host $Msg
    $Msg | Out-File -Append -FilePath $LogFile -Encoding utf8
}

Write-Log "==== [FORCE RESTART] Cleaning processes... ===="

# ============================================================
# 2. 强力清除进程 (使用 WMI 路径匹配，精准打击)
# ============================================================
$Targets = Get-WmiObject Win32_Process | Where-Object { 
    ($_.Name -match "electron" -or $_.Name -match "node") -and $_.ExecutablePath -match "expense-tracker"
}

if ($Targets) {
    foreach ($T in $Targets) {
        Write-Log "Stopping Process: $($T.Name) (PID: $($T.ProcessId))"
        try {
            Stop-Process -Id $T.ProcessId -Force -ErrorAction SilentlyContinue
            taskkill /F /PID $T.ProcessId /T 2>$null
        } catch {}
    }
}

# 释放端口补刀
$PortConn = Get-NetTCPConnection -LocalPort $TargetPort -ErrorAction SilentlyContinue
if ($PortConn) {
    Write-Log "Port $TargetPort is busy. Killing PID: $($PortConn.OwningProcess)"
    Stop-Process -Id $PortConn.OwningProcess -Force -ErrorAction SilentlyContinue
}

Start-Sleep -Seconds 2

# ============================================================
# 3. 启动进程 (修正 CMD 参数链)
# ============================================================
Set-Location $ProjectPath
try {
    # 注入 --automated-restart 参数供 main.js 使用
    $StartCmd = "npm start -- --automated-restart > `"$ErrorLog`" 2>&1"
    Write-Log "Launching Electron via CMD..."
    Start-Process "cmd.exe" -ArgumentList "/c $StartCmd" -WindowStyle Hidden
}
catch {
    Write-Log "LAUNCH FAILED: $($_.Exception.Message)"
}

# ============================================================
# 4. 健康检查 (验证服务是否真正启动)
# ============================================================
$IsUp = $false
for ($i = 1; $i -le 15; $i++) {
    Start-Sleep -Seconds 2
    if (Get-NetTCPConnection -LocalPort $TargetPort -ErrorAction SilentlyContinue) {
        Write-Log "SUCCESS: Port $TargetPort is responding."
        $IsUp = $true
        break
    }
    Write-Log "Checking... ($i/15)"
}

if (-not $IsUp) { Write-Log "WARNING: Process started but port $TargetPort is still silent." }

Write-Log "==== Process Complete ===="
