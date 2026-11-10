# Offline PowerShell tests; mock only downloads, never touch installed apps/PATH.
$ErrorActionPreference = 'Stop'
$installer = Join-Path $PSScriptRoot 'install.ps1'
$temp = Join-Path ([IO.Path]::GetTempPath()) ('tuzi installer test ' + [Guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $temp | Out-Null
$originalCPU = $env:PROCESSOR_ARCHITEW6432
$originalPath = $env:Path
$global:tuziInstallFixture = @{ Root=$temp; Requests=@(); Corrupt=$false }
function Invoke-WebRequest {
    param([switch]$UseBasicParsing, [string]$Uri, [string]$OutFile)
    if (-not $Uri.StartsWith('https://github.com/tuziapi/tuzi-magpie/releases/')) { throw 'Wrong repository' }
    $global:tuziInstallFixture.Requests += $Uri
    $file = 'payload'
    if ($Uri.EndsWith('/SHA256SUMS.txt')) { $file = 'sums' }
    if ($file -eq 'payload' -and $global:tuziInstallFixture.Corrupt) { Set-Content -LiteralPath $OutFile -Value 'corrupted'; return }
    Copy-Item -LiteralPath (Join-Path $global:tuziInstallFixture.Root $file) -Destination $OutFile
}
function Expect-Failure([scriptblock]$Operation, [string]$Message) {
    $failure = $null
    try { & $Operation | Out-Null } catch { $failure = $_.Exception.Message }
    if (-not $failure -or -not $failure.Contains($Message)) { throw "Expected '$Message', got '$failure'" }
}
try {
    Set-Content -LiteralPath (Join-Path $temp 'payload') -Value 'fixture installer'
    $hash = (Get-FileHash (Join-Path $temp 'payload') -Algorithm SHA256).Hash
    foreach ($case in @(@('AMD64','amd64-setup.exe'), @('ARM64','arm64-portable.zip'))) {
        $env:PROCESSOR_ARCHITEW6432 = $case[0]
        $asset = 'tuzi-magpie-v0.1.0-windows-' + $case[1]
        Set-Content -LiteralPath (Join-Path $temp 'sums') -Value "$hash  $asset"
        $global:tuziInstallFixture.Requests = @()
        & $installer -Check
        $urls = $global:tuziInstallFixture.Requests
        if ($urls.Count -ne 2 -or $urls[1] -cne "https://github.com/tuziapi/tuzi-magpie/releases/download/v0.1.0/$asset") { throw 'Latest did not pin the selected architecture/version' }
        $global:tuziInstallFixture.Corrupt = $true
        Expect-Failure { & $installer -Check } 'SHA-256 mismatch'
        $global:tuziInstallFixture.Corrupt = $false
        Expect-Failure { & $installer -Version v0.2.0 -Check } 'version mismatch'
        Add-Content -LiteralPath (Join-Path $temp 'sums') -Value "$hash  $asset"
        Expect-Failure { & $installer -Check } 'ambiguous'
    }
    Expect-Failure { & $installer -Version '../bad' -Check } 'Expected a stable version'
    $env:PROCESSOR_ARCHITEW6432 = 'X86'
    Expect-Failure { & $installer -Check } 'Unsupported Windows architecture'
    if ($env:Path -cne $originalPath) { throw 'Verification-only mode changed PATH' }
    Write-Output 'Offline Windows architecture, corruption, version and ambiguity tests passed.'
} finally {
    $env:PROCESSOR_ARCHITEW6432 = $originalCPU
    Remove-Item -LiteralPath $temp -Recurse -Force
    Remove-Variable tuziInstallFixture -Scope Global
}
