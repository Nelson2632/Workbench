$ErrorActionPreference = 'Stop'
$installer = @(Get-ChildItem 'src-tauri/target/release/bundle/nsis/*-setup.exe')
if ($installer.Count -ne 1) { throw 'Expected one NSIS installer' }
# Exercise a per-user install into a Unicode path containing spaces.
$installDir = Join-Path $env:LOCALAPPDATA 'Workbench CI 中文 测试'
$p = Start-Process -FilePath $installer[0].FullName -ArgumentList @('/S', "/D=$installDir") -Wait -PassThru
if ($p.ExitCode -ne 0) { throw "NSIS install failed: $($p.ExitCode)" }
$exe = Join-Path $installDir 'workbench-v8.exe'
if (-not (Test-Path $exe)) { throw "Installed executable missing: $exe" }
python ../scripts/native-smoke.py $exe windows-native-smoke.json
if ($LASTEXITCODE -ne 0) { throw 'Installed WebView smoke failed' }
# Reinstall the same candidate without removing app data; rerun persistence checks.
$p = Start-Process -FilePath $installer[0].FullName -ArgumentList @('/S', "/D=$installDir") -Wait -PassThru
if ($p.ExitCode -ne 0) { throw "NSIS reinstall failed: $($p.ExitCode)" }
python ../scripts/native-smoke.py $exe windows-reinstall-smoke.json --reserve-toggle
if ($LASTEXITCODE -ne 0) { throw 'Reinstalled WebView smoke failed' }
$reinstalled = Get-Content windows-reinstall-smoke.json -Raw | ConvertFrom-Json
if (-not $reinstalled.webviews.main.checks.persistedFromPreviousLaunch) { throw 'Reinstall did not retain IndexedDB marker' }
if (-not $reinstalled.native.persistedFromPreviousLaunch) { throw 'Reinstall did not retain app-data marker' }
Get-FileHash $installer[0].FullName -Algorithm SHA256 | Format-List | Out-File windows-installer-sha256.txt
