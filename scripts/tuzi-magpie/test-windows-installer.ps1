# Run only on an ephemeral Windows CI worker, after packaging.
param([Parameter(Mandatory=$true)][string]$Version)
$ErrorActionPreference = 'Stop'
if (-not $env:GITHUB_ACTIONS -or -not $env:RUNNER_TEMP) {
  throw 'Installer verification must run on an ephemeral GitHub Actions worker.'
}
$setup = (Resolve-Path "dist/packages/tuzi-magpie-$Version-windows-amd64-setup.exe").Path
$install = Join-Path $env:RUNNER_TEMP 'tuzi installer verification'
$process = Start-Process -FilePath $setup -ArgumentList "/S /D=$install" -Wait -PassThru
if ($process.ExitCode -ne 0) { throw "Installer failed: $($process.ExitCode)" }
$installed = Join-Path $install 'tuzi-magpie.exe'
$expected = (Get-FileHash 'dist/tuzi-magpie-windows-amd64.exe').Hash
if ((Get-FileHash $installed).Hash -ne $expected) { throw 'Installed executable differs from the build.' }
$key = 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\tuzi-magpie'
if ((Get-ItemProperty $key).DisplayVersion -ne $Version) { throw 'Wrong registered version.' }
$sentinel = Join-Path $install 'user-added-file.txt'
Set-Content -Path $sentinel -Value 'Preserve user files'
$uninstaller = Join-Path $install 'Uninstall.exe'
# NSIS normally forks a temporary uninstaller; _?= runs synchronously in place.
$process = Start-Process -FilePath $uninstaller -ArgumentList "/S _?=$install" -Wait -PassThru
if ($process.ExitCode -ne 0) { throw "Uninstaller failed: $($process.ExitCode)" }
if (Test-Path $installed) { throw 'Uninstall left the application executable.' }
if (Test-Path $key) { throw 'Uninstall left its registry entry.' }
if (-not (Test-Path $sentinel)) { throw 'Uninstall removed a user file.' }
Write-Output 'Native Windows install/uninstall and user-file preservation passed.'
