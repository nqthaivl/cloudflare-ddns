param(
    [string]$Version = "1.0-0001"
)

$PackageName = "CfDDNSManager"
$SpkName = "${PackageName}_${Version}.spk"

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host " CF DDNS Manager - Build SPK Package" -ForegroundColor Cyan
Write-Host " Version: $Version" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host ""

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$BuildDir = Join-Path $ScriptDir "build_temp"
$DistDir = Join-Path $ScriptDir "dist"
$AppDir = $ScriptDir

# Helper: convert CRLF -> LF (required for Linux shell scripts on Synology)
function Convert-ToLF($path) {
    $content = [System.IO.File]::ReadAllText($path)
    $content = $content -replace "`r`n", "`n"
    $content = $content -replace "`r", "`n"
    $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
    [System.IO.File]::WriteAllText($path, $content, $utf8NoBom)
}

# ── Step 1: Cleanup ───────────────────────────────────────────
Write-Host "[1/6] Don dep thu muc build..." -ForegroundColor Yellow
if (Test-Path $BuildDir) { Remove-Item $BuildDir -Recurse -Force }
if (Test-Path $DistDir) { Remove-Item $DistDir  -Recurse -Force }
New-Item -ItemType Directory -Path $BuildDir                           | Out-Null
New-Item -ItemType Directory -Path $DistDir                            | Out-Null
New-Item -ItemType Directory -Path (Join-Path $BuildDir "package_content") | Out-Null
New-Item -ItemType Directory -Path (Join-Path $BuildDir "scripts")     | Out-Null
New-Item -ItemType Directory -Path (Join-Path $BuildDir "conf")        | Out-Null

# ── Step 2: Copy app files ────────────────────────────────────
Write-Host "[2/6] Sao chep file ung dung..." -ForegroundColor Yellow
$AppFiles = @("app.py", "cloudflare_api.py", "ddns_service.py", "requirements.txt")
foreach ($f in $AppFiles) {
    $src = Join-Path $AppDir $f
    $dst = Join-Path $BuildDir "package_content"
    if (Test-Path $src) {
        Copy-Item $src $dst -Force
        Write-Host "  OK $f" -ForegroundColor Green
    }
    else {
        Write-Host "  MISSING: $f" -ForegroundColor Red
    }
}
foreach ($folder in @("templates", "static")) {
    $src = Join-Path $AppDir $folder
    $dst = Join-Path $BuildDir "package_content"
    if (Test-Path $src) {
        Copy-Item $src $dst -Recurse -Force
        Write-Host "  OK $folder/" -ForegroundColor Green
    }
}

# ── Step 3: Copy & process SPK metadata ──────────────────────
Write-Host "[3/6] Sao chep SPK metadata va scripts..." -ForegroundColor Yellow

# INFO file (LF endings)
$infoSrc = Join-Path $AppDir "spk\INFO"
$infoDst = Join-Path $BuildDir "INFO"
Copy-Item $infoSrc $infoDst -Force
$infoContent = Get-Content $infoDst -Raw
$infoContent = $infoContent -replace 'version="[^"]*"', "version=`"$Version`""
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText($infoDst, ($infoContent -replace "`r`n", "`n"), $utf8NoBom)
Write-Host "  OK INFO" -ForegroundColor Green

# Icons
foreach ($icon in @("PACKAGE_ICON.PNG", "PACKAGE_ICON_256.PNG")) {
    $src = Join-Path $AppDir "spk\$icon"
    if (Test-Path $src) {
        Copy-Item $src (Join-Path $BuildDir $icon) -Force
        Write-Host "  OK $icon" -ForegroundColor Green
    }
}

# Shell scripts - MUST convert CRLF->LF for Linux
foreach ($s in @("start-stop-status", "preinst", "postinst", "preuninst")) {
    $src = Join-Path $AppDir "spk\scripts\$s"
    $dst = Join-Path $BuildDir "scripts\$s"
    if (Test-Path $src) {
        Copy-Item $src $dst -Force
        Convert-ToLF $dst
        Write-Host "  OK scripts/$s (LF)" -ForegroundColor Green
    }
}

# conf/privilege (JSON, LF endings)
$privSrc = Join-Path $AppDir "spk\conf\privilege"
$privDst = Join-Path $BuildDir "conf\privilege"
if (Test-Path $privSrc) {
    Copy-Item $privSrc $privDst -Force
    Convert-ToLF $privDst
    Write-Host "  OK conf/privilege (LF)" -ForegroundColor Green
}
else {
    # Create inline if missing
    $privJson = "{`n    `"defaults`": {`n        `"run-as`": `"package`"`n    }`n}`n"
    [System.IO.File]::WriteAllText($privDst, $privJson, $utf8NoBom)
    Write-Host "  OK conf/privilege (created inline)" -ForegroundColor Green
}

# ── Step 4: Verify tools ──────────────────────────────────────
$hasTar = $null -ne (Get-Command tar -ErrorAction SilentlyContinue)
$7zPath = "${env:ProgramFiles}\7-Zip\7z.exe"
$has7z = Test-Path $7zPath
if (-not $hasTar -and -not $has7z) {
    Write-Host "LOI: Can cai tar (Windows 10+) hoac 7-Zip!" -ForegroundColor Red
    exit 1
}

# ── Step 5: Create package.tgz ───────────────────────────────
Write-Host "[4/6] Tao package.tgz..." -ForegroundColor Yellow
$pkgContent = Join-Path $BuildDir "package_content"
$pkgTgz = Join-Path $BuildDir "package.tgz"

if ($hasTar) {
    Push-Location $pkgContent
    tar -czf $pkgTgz .
    Pop-Location
    Write-Host "  OK package.tgz (tar)" -ForegroundColor Green
}
else {
    $tmpTar = Join-Path $BuildDir "package.tar"
    Push-Location $pkgContent
    & $7zPath a -ttar $tmpTar "." | Out-Null
    Pop-Location
    & $7zPath a -tgzip $pkgTgz $tmpTar | Out-Null
    Remove-Item $tmpTar -Force
    Write-Host "  OK package.tgz (7-Zip)" -ForegroundColor Green
}

# ── Step 6: Create .spk ──────────────────────────────────────
Write-Host "[5/6] Dong goi file .spk..." -ForegroundColor Yellow
$SpkOutput = Join-Path $DistDir $SpkName

Push-Location $BuildDir
if ($hasTar) {
    $items = [System.Collections.ArrayList]@("INFO", "package.tgz", "scripts", "conf")
    if (Test-Path (Join-Path $BuildDir "PACKAGE_ICON.PNG")) { [void]$items.Add("PACKAGE_ICON.PNG") }
    if (Test-Path (Join-Path $BuildDir "PACKAGE_ICON_256.PNG")) { [void]$items.Add("PACKAGE_ICON_256.PNG") }
    tar -cf $SpkOutput @items
}
else {
    & $7zPath a -ttar $SpkOutput "INFO" "package.tgz" "scripts" "conf" | Out-Null
}
Pop-Location

# ── Cleanup temp ──────────────────────────────────────────────
Write-Host "[6/6] Don dep..." -ForegroundColor Yellow
Remove-Item $BuildDir -Recurse -Force

# ── Done ──────────────────────────────────────────────────────
if (Test-Path $SpkOutput) {
    $size = [math]::Round((Get-Item $SpkOutput).Length / 1KB, 1)
    Write-Host ""
    Write-Host "==================================================" -ForegroundColor Green
    Write-Host " BUILD THANH CONG!" -ForegroundColor Green
    Write-Host " File    : $SpkName" -ForegroundColor Green
    Write-Host " Vi tri  : $DistDir" -ForegroundColor Green
    Write-Host " Kich thuoc: ${size} KB" -ForegroundColor Green
    Write-Host "==================================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Cach cai len Synology:" -ForegroundColor Cyan
    Write-Host "  1. Mo DSM -> Package Center -> Manual Install" -ForegroundColor White
    Write-Host "  2. Upload file: $SpkName" -ForegroundColor White
    Write-Host "  3. Dong y cai dat -> Xong!" -ForegroundColor White
    Start-Process explorer.exe $DistDir
}
else {
    Write-Host "BUILD THAT BAI! Kiem tra loi o tren." -ForegroundColor Red
    exit 1
}
