$root = "D:\1 -  Marty\diary\workbench-v8"
$out = "$root\wiki\CODE_DUMP.md"
$sb = New-Object System.Text.StringBuilder

function Get-Lang($ext) {
    switch ($ext) {
        '.ts'   { 'typescript' }
        '.tsx'  { 'tsx' }
        '.css'  { 'css' }
        '.rs'   { 'rust' }
        '.json' { 'json' }
        '.html' { 'html' }
        '.toml' { 'toml' }
        default { 'text' }
    }
}

function Add-File($filePath, $relPath) {
    $ext = [System.IO.Path]::GetExtension($filePath)
    $lang = Get-Lang $ext
    [void]$sb.AppendLine("### ``$relPath``")
    [void]$sb.AppendLine()
    [void]$sb.AppendLine("``````$lang")
    $content = Get-Content -Path $filePath -Raw -Encoding UTF8
    [void]$sb.AppendLine($content)
    [void]$sb.AppendLine("``````")
    [void]$sb.AppendLine()
}

function Process-Dir($dir, $relBase) {
    Get-ChildItem -Path $dir -File | ForEach-Object {
        $rel = if ($relBase) { "$relBase/$($_.Name)" } else { $_.Name }
        Add-File $_.FullName $rel
    }
    Get-ChildItem -Path $dir -Directory | ForEach-Object {
        $subRel = if ($relBase) { "$relBase/$($_.Name)" } else { $_.Name }
        Process-Dir $_.FullName $subRel
    }
}

[void]$sb.AppendLine("# 附录：全部源码")
[void]$sb.AppendLine()

# Root config
[void]$sb.AppendLine("## 根目录配置")
[void]$sb.AppendLine()
@('package.json','vite.config.ts','tsconfig.json','vitest.config.ts','index.html') | ForEach-Object {
    $f = Join-Path $root $_
    if (Test-Path $f) { Add-File $f $_ }
}

# Tauri config
[void]$sb.AppendLine("## Tauri 配置")
[void]$sb.AppendLine()
@('src-tauri\Cargo.toml','src-tauri\tauri.conf.json','src-tauri\capabilities\default.json') | ForEach-Object {
    $f = Join-Path $root $_
    if (Test-Path $f) { Add-File $f $_ }
}

# Tauri backend
[void]$sb.AppendLine("## Tauri 后端源码 (src-tauri/src)")
[void]$sb.AppendLine()
Process-Dir (Join-Path $root 'src-tauri\src') 'src-tauri/src'

# Frontend
[void]$sb.AppendLine("## 前端源码 (src)")
[void]$sb.AppendLine()
Process-Dir (Join-Path $root 'src') 'src'

[System.IO.File]::WriteAllText($out, $sb.ToString(), [System.Text.Encoding]::UTF8)
Write-Output "Generated: $out ($((Get-Item $out).Length) bytes)"
