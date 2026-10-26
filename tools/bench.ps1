# Замер нагрузки каждых встроенных обоев в реальном приложении (CPU и GPU).
# powershell -ExecutionPolicy Bypass -File tools\bench.ps1 [-Filter текст] [-Seconds 8]
param([string]$Filter = '', [int]$Seconds = 8)
$d = Join-Path $env:LOCALAPPDATA 'LiveWall'
$exe = Join-Path $d 'app\LiveWall.exe'
$cat = Get-Content (Join-Path $d 'app\builtin\catalog.json') -Raw -Encoding UTF8 | ConvertFrom-Json
$cores = (Get-CimInstance Win32_ComputerSystem).NumberOfLogicalProcessors
$report = @()

function Get-Tree($rootId) {
    $all = Get-CimInstance Win32_Process | Select-Object ProcessId, ParentProcessId
    $ids = @($rootId); $queue = @($rootId)
    while ($queue.Count) { $c = $queue[0]; $queue = @($queue | Select-Object -Skip 1); foreach ($p in $all | Where-Object { $_.ParentProcessId -eq $c }) { $ids += $p.ProcessId; $queue += $p.ProcessId } }
    $ids
}
function Get-Cpu($ids) { ($ids | ForEach-Object { try { (Get-Process -Id $_ -ErrorAction Stop).TotalProcessorTime.TotalSeconds } catch { 0 } } | Measure-Object -Sum).Sum }

foreach ($w in $cat | Where-Object { $_.name -like "*$Filter*" }) {
    Get-Process LiveWall -ErrorAction SilentlyContinue | Stop-Process -Force
    Start-Sleep -Milliseconds 800
    Set-Content (Join-Path $d 'current.txt') $w.file -Encoding UTF8
    Start-Process $exe -ArgumentList '--background'
    Start-Sleep 7
    $lw = Get-Process LiveWall -ErrorAction SilentlyContinue
    if (-not $lw) { $report += [pscustomobject]@{ Обои = $w.name; CPU = 'нет процесса'; GPU = ''; MB = '' }; continue }
    $ids = Get-Tree $lw.Id
    $a = Get-Cpu $ids
    $gpu = 0
    try {
        $s = (Get-Counter '\GPU Engine(*)\Utilization Percentage' -ErrorAction Stop).CounterSamples | Where-Object { $ids -contains [int]($_.InstanceName -replace '^pid_(\d+)_.*', '$1') }
        $gpu = ($s | Measure-Object CookedValue -Sum).Sum
    } catch { }
    Start-Sleep -Seconds $Seconds
    $b = Get-Cpu $ids
    $mem = ($ids | ForEach-Object { try { (Get-Process -Id $_ -ErrorAction Stop).WorkingSet64 } catch { 0 } } | Measure-Object -Sum).Sum / 1MB
    $row = [pscustomobject]@{ Обои = $w.name; CPU = [math]::Round(($b - $a) / $Seconds * 100, 1); GPU = [math]::Round($gpu, 1); MB = [int]$mem }
    $report += $row
    Write-Host ("{0,-26} CPU {1,5}%  GPU {2,5}%  {3,4} МБ" -f $row.Обои, $row.CPU, $row.GPU, $row.MB)
}
$report | Export-Csv (Join-Path $PSScriptRoot 'bench.csv') -NoTypeInformation -Encoding UTF8
Get-Process LiveWall -ErrorAction SilentlyContinue | Stop-Process -Force
