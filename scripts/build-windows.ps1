$ErrorActionPreference = "Stop"
$project = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$release = Join-Path $project "release"

if (Test-Path -LiteralPath $release) {
  $resolvedRelease = (Resolve-Path -LiteralPath $release).Path
  if (-not $resolvedRelease.StartsWith($project + [IO.Path]::DirectorySeparatorChar)) {
    throw "Release path escaped the project directory."
  }
  Remove-Item -LiteralPath $resolvedRelease -Recurse -Force
}

$builder = Join-Path $project "node_modules\.bin\electron-builder.cmd"
$packed = $false
for ($attempt = 1; $attempt -le 1; $attempt++) {
  if (Test-Path -LiteralPath $release) {
    Start-Sleep -Seconds 3
    Remove-Item -LiteralPath $release -Recurse -Force
  }
  & $builder --dir --win --x64
  if ($LASTEXITCODE -eq 0) {
    $packed = $true
    break
  }
  Write-Warning "electron-builder attempt $attempt failed; retrying after Windows releases temporary files."
  Start-Sleep -Seconds 5
}
if (-not $packed) {
  Write-Warning "electron-builder could not rename its temporary directory. Falling back to deterministic local Electron assembly."
  if (Test-Path -LiteralPath $release) {
    Start-Sleep -Seconds 3
    Remove-Item -LiteralPath $release -Recurse -Force
  }
  $unpacked = Join-Path $release "win-unpacked"
  $stage = Join-Path $release "app-stage"
  New-Item -ItemType Directory -Path $unpacked, $stage -Force | Out-Null
  Copy-Item -Path (Join-Path $project "node_modules\electron\dist\*") -Destination $unpacked -Recurse -Force
  Move-Item -LiteralPath (Join-Path $unpacked "electron.exe") -Destination (Join-Path $unpacked "MangaSprint.exe")
  Copy-Item -LiteralPath (Join-Path $project "out") -Destination (Join-Path $stage "out") -Recurse -Force
  $stagePackage = @{
    name = "mangasprint"
    version = "0.1.0"
    type = "module"
    main = "./out/main/index.js"
    dependencies = @{
      "electron-store" = "^11.0.2"
      "xlsx" = "^0.18.5"
    }
  } | ConvertTo-Json -Depth 4
  Set-Content -LiteralPath (Join-Path $stage "package.json") -Value $stagePackage -Encoding UTF8
  & npm install --omit=dev --ignore-scripts --prefix $stage
  if ($LASTEXITCODE -ne 0) { throw "Failed to install production dependencies into staging." }
  $asar = Join-Path $project "node_modules\.bin\asar.cmd"
  & $asar pack $stage (Join-Path $unpacked "resources\app.asar")
  if ($LASTEXITCODE -ne 0) { throw "Failed to create app.asar." }
  Remove-Item -LiteralPath $stage -Recurse -Force
  Remove-Item -LiteralPath (Join-Path $unpacked "resources\default_app.asar") -Force -ErrorAction SilentlyContinue
}

$cache = Join-Path $env:LOCALAPPDATA "electron-builder\Cache"
$makensis = Get-ChildItem -LiteralPath $cache -Recurse -Filter "makensis.exe" -File |
  Sort-Object LastWriteTime -Descending |
  Select-Object -First 1

if (-not $makensis) {
  throw "NSIS compiler is not cached. Install NSIS or run electron-builder's NSIS target once to download it."
}

& $makensis.FullName /INPUTCHARSET UTF8 /V3 "/DPRODUCT_NAME=MangaSprint" "/DVERSION=0.1.0" "/DPROJECT_DIR=$project" (Join-Path $project "build\installer.nsi")
if ($LASTEXITCODE -ne 0) {
  throw "NSIS compiler failed."
}

$installer = Join-Path $release "MangaSprint-0.1.0-x64.exe"
if (-not (Test-Path -LiteralPath $installer)) {
  throw "Installer was not created."
}
Write-Output "Created $installer"
