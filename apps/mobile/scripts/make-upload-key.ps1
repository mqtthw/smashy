# Makes Smashy's Google Play upload key, once. Run it in PowerShell from anywhere:
#   powershell -ExecutionPolicy Bypass -File apps\mobile\scripts\make-upload-key.ps1
# It creates %USERPROFILE%\smashy-secrets\smashy-upload.jks and android-signing.properties (the
# passwords, made at random and never shown). Nothing goes in the repo. Back up that folder somewhere
# private (a USB stick or a password manager); with Play App Signing a lost upload key can be reset
# through Google support, but that takes days.
$ErrorActionPreference = "Stop"

$dir = Join-Path $env:USERPROFILE "smashy-secrets"
$jks = Join-Path $dir "smashy-upload.jks"
$props = Join-Path $dir "android-signing.properties"
if (Test-Path $jks) { Write-Host "An upload key already exists at $jks. Not making another one."; exit 0 }

$keytool = @(
  "C:\Program Files\Android\Android Studio\jbr\bin\keytool.exe",
  "C:\Program Files\Java\jdk-22\bin\keytool.exe"
) | Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $keytool) { throw "keytool not found (it comes with Android Studio)." }

New-Item -ItemType Directory -Force $dir | Out-Null

# 32 random letters and digits. PKCS12 keys use one password for the store and the key.
$chars = [char[]]"ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789"
$bytes = New-Object byte[] 32
[Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
$pass = -join ($bytes | ForEach-Object { $chars[$_ % $chars.Length] })

& $keytool -genkeypair -v -keystore $jks -storetype PKCS12 -alias upload -keyalg RSA -keysize 2048 `
  -validity 10000 -storepass $pass -keypass $pass -dname "CN=Smashy, O=Smashy, C=US" | Out-Null
if ($LASTEXITCODE -ne 0) { throw "keytool failed." }

$storePath = $jks -replace "\\", "/"
@(
  "storeFile=$storePath",
  "storePassword=$pass",
  "keyAlias=upload",
  "keyPassword=$pass"
) | Set-Content -Encoding ascii $props

Write-Host ""
Write-Host "Done. Upload key made in $dir"
Write-Host "Back up that whole folder somewhere private. Never put it in chat, email or GitHub."
Write-Host ""
Write-Host "Its fingerprint (not a secret):"
& $keytool -list -v -keystore $jks -storepass $pass -alias upload | Select-String "SHA256:"
