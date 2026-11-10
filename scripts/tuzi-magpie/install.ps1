# Installs the desktop release from tuziapi/tuzi-magpie, for the current user.
param([string]$Version = 'latest', [switch]$Check)
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
$repo = 'https://github.com/tuziapi/tuzi-magpie'
if ($env:OS -ne 'Windows_NT') { throw 'This script requires Windows.' }
if ($Version -ne 'latest' -and $Version -cnotmatch '^v(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)$') { throw 'Expected a stable version such as v0.1.0.' }
# PROCESSOR_ARCHITECTURE alone reports the emulated shell on ARM Windows.
$cpu = $env:PROCESSOR_ARCHITEW6432
if (-not $cpu) { $cpu = $env:PROCESSOR_ARCHITECTURE }
switch ($cpu.ToUpperInvariant()) {
    'AMD64' { $arch = 'amd64'; $suffix = 'setup.exe' }
    'ARM64' { $arch = 'arm64'; $suffix = 'portable.zip' }
    default { throw "Unsupported Windows architecture: $cpu" }
}
[Net.ServicePointManager]::SecurityProtocol = [Net.ServicePointManager]::SecurityProtocol -bor [Net.SecurityProtocolType]::Tls12
$work = Join-Path ([IO.Path]::GetTempPath()) ('tuzi-install-' + [Guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $work | Out-Null
try {
    $sumUrl = "$repo/releases/download/$Version/SHA256SUMS.txt"
    if ($Version -eq 'latest') { $sumUrl = "$repo/releases/latest/download/SHA256SUMS.txt" }
    $sumFile = Join-Path $work 'SHA256SUMS.txt'
    Invoke-WebRequest -UseBasicParsing -Uri $sumUrl -OutFile $sumFile
    $pattern = '^([0-9a-fA-F]{64})\s+(tuzi-magpie-(v(?:0|[1-9][0-9]*)\.(?:0|[1-9][0-9]*)\.(?:0|[1-9][0-9]*))-windows-' + $arch + '-' + [regex]::Escape($suffix) + ')$'
    $entries = @(Get-Content -LiteralPath $sumFile | ForEach-Object { if ($_ -cmatch $pattern) { [pscustomobject]@{ Hash=$Matches[1]; File=$Matches[2]; Version=$Matches[3] } } })
    if ($entries.Count -ne 1) { throw 'Missing or ambiguous package checksum.' }
    $entry = $entries[0]
    if ($Version -ne 'latest' -and $Version -cne $entry.Version) { throw 'Checksum version mismatch.' }
    $asset = Join-Path $work $entry.File
    Write-Output "Downloading tuzi-magpie $($entry.Version) (Windows $arch)..."
    Invoke-WebRequest -UseBasicParsing -Uri "$repo/releases/download/$($entry.Version)/$($entry.File)" -OutFile $asset
    if ((Get-FileHash -LiteralPath $asset -Algorithm SHA256).Hash -ine $entry.Hash) { throw 'SHA-256 mismatch; nothing installed.' }
    if ($Check) { Write-Output "Verified $($entry.File) (SHA-256 $($entry.Hash))"; return }
    if (Get-Process -Name tuzi-magpie -ErrorAction SilentlyContinue) { throw 'Quit tuzi-magpie before updating.' }
    if ($arch -eq 'amd64') {
        # Use the existing per-user installer, including its Start menu entry
        # and Windows uninstall registration. /D must be its final argument.
        $install = Join-Path $env:LOCALAPPDATA 'Programs\tuzi-magpie'
        $process = Start-Process -FilePath $asset -ArgumentList "/S /D=$install" -Wait -PassThru
        if ($process.ExitCode -ne 0) { throw "Installer failed: $($process.ExitCode)" }
    } else {
        $install = Join-Path $env:LOCALAPPDATA 'Programs\tuzi-magpie-arm64'
        $unpacked = Join-Path $work 'unpacked'
        Expand-Archive -LiteralPath $asset -DestinationPath $unpacked
        $expected = @('tuzi-magpie.exe', '.tuzi-magpie-portable', 'LICENSE', 'THIRD_PARTY_NOTICES', 'INSTALL.md')
        $actual = @(Get-ChildItem -LiteralPath $unpacked -Force)
        if ($actual.Count -ne $expected.Count -or @($actual | Where-Object { $_.PSIsContainer -or $_.Name -cnotin $expected }).Count) { throw 'Unexpected portable archive contents.' }
        # Only replace shipped files, never the portable user's data folder.
        if ((Test-Path -LiteralPath $install) -and -not (Test-Path -LiteralPath (Join-Path $install '.tuzi-magpie-portable'))) { throw "Another installation occupies $install" }
        New-Item -ItemType Directory -Path $install -Force | Out-Null
        foreach ($file in $expected) { Copy-Item -LiteralPath (Join-Path $unpacked $file) -Destination (Join-Path $install $file) -Force }
    }
    $exe = Join-Path $install 'tuzi-magpie.exe'
    if (-not (Test-Path -LiteralPath $exe -PathType Leaf)) { throw 'The installer did not create tuzi-magpie.exe.' }
    $userPath = [Environment]::GetEnvironmentVariable('Path', 'User')
    $parts = @($userPath -split ';' | Where-Object { $_ })
    if ($install -notin $parts) { [Environment]::SetEnvironmentVariable('Path', (($parts + $install) -join ';'), 'User') }
    if ($install -notin ($env:Path -split ';')) { $env:Path = "$install;$env:Path" }
    Write-Output "Installed at $install. Run: tuzi-magpie"
    Write-Output 'Microsoft Edge WebView2 Runtime is required. This release is unsigned; Windows may show a SmartScreen prompt.'
    if ($arch -eq 'arm64') { Write-Output 'ARM64 uses the portable edition. Keep tuzi-magpie-data private; it is preserved when you update.' }
} finally {
    Remove-Item -LiteralPath $work -Recurse -Force -ErrorAction SilentlyContinue
}
