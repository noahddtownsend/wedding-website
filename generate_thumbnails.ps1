# PowerShell script to generate low-resolution compressed thumbnails for all wedding photos
Add-Type -AssemblyName System.Drawing

$albumDir = Join-Path $PSScriptRoot "images\album"
$thumbDir = Join-Path $PSScriptRoot "images\thumbnails"

if (-not (Test-Path $thumbDir)) {
    New-Item -ItemType Directory -Path $thumbDir -Force | Out-Null
}

function Create-Thumbnail {
    param (
        [string]$sourcePath,
        [string]$destPath,
        [int]$maxSize = 120
    )
    try {
        $img = [System.Drawing.Image]::FromFile($sourcePath)
        
        # Keep aspect ratio
        $ratio = [System.Math]::Min(($maxSize / $img.Width), ($maxSize / $img.Height))
        if ($ratio -lt 1.0) {
            $newWidth = [int]($img.Width * $ratio)
            $newHeight = [int]($img.Height * $ratio)
        } else {
            $newWidth = $img.Width
            $newHeight = $img.Height
        }
        
        $bmp = New-Object System.Drawing.Bitmap($newWidth, $newHeight)
        $g = [System.Drawing.Graphics]::FromImage($bmp)
        
        # Setup high speed/medium quality rendering
        $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::Bilinear
        $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighSpeed
        $g.DrawImage($img, 0, 0, $newWidth, $newHeight)
        
        # Save as JPEG with 60% compression quality
        $encoder = [System.Drawing.Imaging.ImageCodecInfo]::GetImageDecoders() | Where-Object { $_.FormatID -eq [System.Drawing.Imaging.ImageFormat]::Jpeg.Guid }
        $encoderParams = New-Object System.Drawing.Imaging.EncoderParameters(1)
        $encoderParams.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter([System.Drawing.Imaging.Encoder]::Quality, 60)
        
        $bmp.Save($destPath, $encoder, $encoderParams)
        
        $g.Dispose()
        $bmp.Dispose()
        $img.Dispose()
    } catch {
        Write-Warning "Failed to create thumbnail for $sourcePath : $_"
    }
}

Write-Host "Scanning for images in $albumDir..."
$extensions = @("*.jpg", "*.jpeg", "*.png", "*.webp")
$files = Get-ChildItem -Path $albumDir -Include $extensions -Recurse -File

$count = 0
$total = $files.Count
Write-Host "Found $total images. Generating thumbnails..."

foreach ($file in $files) {
    # Generate a deterministic filename by replacing subfolders with underscores
    $relativePath = $file.FullName.Substring($albumDir.FullName.Length + 1)
    $thumbName = $relativePath.Replace("\", "_").Replace("/", "_").Replace(" ", "_")
    # Force extension to be Jpeg
    $thumbName = [System.IO.Path]::GetFileNameWithoutExtension($thumbName) + ".jpg"
    
    $destPath = Join-Path $thumbDir $thumbName
    
    if (-not (Test-Path $destPath)) {
        Create-Thumbnail -sourcePath $file.FullName -destPath $destPath
    }
    
    $count++
    if ($count % 50 -eq 0 -or $count -eq $total) {
        Write-Host "Processed $count / $total thumbnails..."
    }
}

Write-Host "Thumbnail generation complete!"
