# Script para empaquetar y firmar MSIX (requiere MakeAppx.exe y SignTool.exe del Windows SDK)

$packageName = "EsquemaPro.msix"
$packageFolder = Join-Path $PSScriptRoot "package_contents"
$appxManifest = Join-Path $PSScriptRoot "AppxManifest.xml"

if (-not (Test-Path $appxManifest)) {
    Write-Error "No se encontró AppxManifest.xml en $PSScriptRoot. Edita los campos y vuelve a intentar."
    exit 1
}

# Limpiar carpeta
if (Test-Path $packageFolder) { Remove-Item $packageFolder -Recurse -Force }
New-Item -ItemType Directory -Path $packageFolder | Out-Null

# Copiar archivos del proyecto a package_contents (ajusta según sea necesario)
# NOTA: esto copia todo el repo; para un paquete limpio ajusta las rutas a lo esencial
Copy-Item -Path (Join-Path $PSScriptRoot "..\*") -Destination $packageFolder -Recurse -Force

# Modo: buscar MakeAppx.exe
$makeappx = Get-Command makeappx -ErrorAction SilentlyContinue
if (-not $makeappx) {
    Write-Warning "makeappx.exe no encontrado en PATH. Instala Windows 10 SDK o usa PWABuilder para empaquetar." 
} else {
    # Empaquetar
    & $makeappx pack /d $packageFolder /p (Join-Path $PSScriptRoot $packageName)
    Write-Host "Paquete creado: $packageName"
}

# Firmar (si tienes SignTool y un PFX)
$signTool = Get-Command signtool -ErrorAction SilentlyContinue
$pfx = Join-Path $PSScriptRoot "..\unifilarrite_cert.pfx"
if ($signTool -and (Test-Path $pfx)) {
    $pwd = Read-Host "Password PFX (input oculto)" -AsSecureString
    & $signTool sign /fd SHA256 /a /f $pfx /p (ConvertFrom-SecureString $pwd -AsPlainText) (Join-Path $PSScriptRoot $packageName)
    Write-Host "Paquete firmado: $packageName"
} else {
    Write-Warning "SignTool no encontrado o PFX ausente. Omite firma. Usa SignTool para firmar el MSIX si lo deseas."
}

Write-Host "Proceso terminado. Si no usaste MakeAppx/SignTool, sube el ZIP a PWABuilder para generar el MSIX fácilmente."