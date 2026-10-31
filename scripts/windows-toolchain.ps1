$ErrorActionPreference = 'Stop'
$vswhere = Join-Path ${env:ProgramFiles(x86)} 'Microsoft Visual Studio/Installer/vswhere.exe'
if (-not (Test-Path $vswhere)) { throw 'Visual Studio Installer/vswhere is required' }
$linkers = @(& $vswhere -latest -products '*' -requires Microsoft.VisualStudio.Component.VC.Tools.x86.x64 -find 'VC/Tools/MSVC/**/bin/Hostx64/x64/link.exe')
$linker = $linkers | Sort-Object -Descending | Select-Object -First 1
if (-not $linker -or -not (Test-Path $linker)) { throw 'MSVC x64 linker not found; install C++ Build Tools' }
"CARGO_TARGET_X86_64_PC_WINDOWS_MSVC_LINKER=$linker" >> $env:GITHUB_ENV
Write-Host "Using installed MSVC linker: $linker"
Get-CimInstance Win32_OperatingSystem | Select-Object Caption, Version, OSArchitecture
