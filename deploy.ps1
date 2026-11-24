param(
    [string]$Destination = (Join-Path $env:USERPROFILE ".config\opencode\plugins\markdown-copy"),
    [switch]$SkipCheck
)

$ErrorActionPreference = "Stop"

$root = $PSScriptRoot
$manifest = @(
    "tui.ts",
    "panel.tsx",
    "messages.js",
    "clipboard.js",
    "package.json",
    "README.md"
)

$package = Get-Content (Join-Path $root "package.json") -Raw | ConvertFrom-Json
Write-Host "markdown-copy $($package.version) -> $Destination"

foreach ($name in $manifest) {
    $path = Join-Path $root $name
    if (-not (Test-Path -LiteralPath $path)) {
        throw "Missing source file: $path"
    }
}

if (-not $SkipCheck) {
    $bun = Get-Command bun -ErrorAction SilentlyContinue
    if (-not $bun) {
        throw "bun not found; cannot validate the bundle. Re-run with -SkipCheck to skip."
    }
    $temp = Join-Path ([IO.Path]::GetTempPath()) ("markdown-copy-check-" + [guid]::NewGuid().ToString("N") + ".js")
    try {
        & bun build (Join-Path $root "tui.ts") `
            --target bun `
            --jsx-runtime automatic `
            --jsx-import-source "@opentui/solid" `
            --external "@opencode/plugin/tui" `
            --external "@opentui/core" `
            --external "@opentui/solid" `
            --external "solid-js" `
            --outfile $temp | Out-Null
        if ($LASTEXITCODE -ne 0) {
            throw "Bundle check failed with exit code $LASTEXITCODE"
        }
        Write-Host "bundle check ok"
    }
    finally {
        Remove-Item -LiteralPath $temp -Force -ErrorAction SilentlyContinue
    }
}

New-Item -ItemType Directory -Force -Path $Destination | Out-Null

# Remove stale modules so a renamed or deleted file cannot shadow the new build.
$stale = Get-ChildItem -LiteralPath $Destination -File |
    Where-Object { $_.Extension -in @(".ts", ".tsx", ".js") -and $_.Name -notin $manifest }
foreach ($file in $stale) {
    Remove-Item -LiteralPath $file.FullName -Force
    Write-Host "removed stale $($file.Name)"
}

foreach ($name in $manifest) {
    Copy-Item -LiteralPath (Join-Path $root $name) -Destination (Join-Path $Destination $name) -Force
    Write-Host "copied $name"
}

Write-Host ""
Write-Host "Deployed. Verify:"
Write-Host "  opencode plugin list"
Write-Host "The running TUI reloads the plugin from the config directory automatically."
