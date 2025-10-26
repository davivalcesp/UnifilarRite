param(
    [string]$source = "c:\Users\BreakersT\Downloads\Unifilar Rite\icon\icon_Supply.png",
    [string]$outDir = "c:\Users\BreakersT\Downloads\Unifilar Rite\icon"
)

if (-not (Test-Path $source)) {
    Write-Error "Archivo fuente no encontrado: $source"
    exit 2
}

Add-Type -AssemblyName System.Drawing

function Resize-Image($inPath, $outPath, $width, $height) {
    try {
        $img = [System.Drawing.Image]::FromFile($inPath)
        $bmp = New-Object System.Drawing.Bitmap $width, $height
        $g = [System.Drawing.Graphics]::FromImage($bmp)
        $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
        $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
        $g.Clear([System.Drawing.Color]::Transparent)
        $g.DrawImage($img, 0, 0, $width, $height)
        $bmp.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
        $g.Dispose(); $bmp.Dispose(); $img.Dispose()
        Write-Host "Creado: $outPath"
    } catch {
        Write-Error "Error al redimensionar $inPath -> $outPath : $_"
        exit 3
    }
}

$sizes = @(144,256,384,1024)
foreach ($s in $sizes) {
    $out = Join-Path $outDir "icon-$s.png"
    Resize-Image -inPath $source -outPath $out -width $s -height $s
}

# Generar versiones maskable (usar 192 y 512 originales)
Resize-Image -inPath $source -outPath (Join-Path $outDir 'icon-192-maskable.png') -width 192 -height 192
Resize-Image -inPath $source -outPath (Join-Path $outDir 'icon-512-maskable.png') -width 512 -height 512

Write-Host "Todos los iconos generados."