# Video compression script for GitHub compliance
# This script compresses large videos to get under 100MB limit

# Check if ffmpeg is installed, if not install it via chocolatey
function Install-FFmpeg {
    Write-Host "Checking if ffmpeg is installed..."
    $ffmpegExists = $null -ne (Get-Command ffmpeg -ErrorAction SilentlyContinue)
    
    if (-not $ffmpegExists) {
        Write-Host "FFmpeg not found. Installing via Chocolatey..."
        
        # Check if chocolatey is installed
        $chocoExists = $null -ne (Get-Command choco -ErrorAction SilentlyContinue)
        if (-not $chocoExists) {
            Write-Host "Chocolatey not found. Installing Chocolatey first..."
            Set-ExecutionPolicy Bypass -Scope Process -Force
            [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
            Invoke-Expression ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))
        }
        
        # Install ffmpeg
        choco install ffmpeg -y
        Write-Host "FFmpeg installed successfully!"
    } else {
        Write-Host "FFmpeg is already installed."
    }
}

# Function to compress video
function Compress-Video {
    param(
        [string]$InputPath,
        [string]$OutputPath,
        [int]$Bitrate = 2000  # 2000k = 2Mbps for good quality
    )
    
    Write-Host "Compressing: $InputPath"
    Write-Host "Target bitrate: ${Bitrate}k"
    
    # Get file size before
    $sizeBefore = [math]::Round((Get-Item $InputPath).Length / 1MB, 2)
    Write-Host "Size before: ${sizeBefore} MB"
    
    # Compress video
    ffmpeg -i $InputPath -b:v ${Bitrate}k -b:a 128k -c:v libx264 -preset medium -c:a aac $OutputPath -y
    
    # Get file size after
    $sizeAfter = [math]::Round((Get-Item $OutputPath).Length / 1MB, 2)
    $reduction = [math]::Round(($sizeBefore - $sizeAfter) / $sizeBefore * 100, 1)
    
    Write-Host "Size after: ${sizeAfter} MB"
    Write-Host "Reduction: ${reduction}%"
    Write-Host ""
}

# Main script
Write-Host "====================="
Write-Host "Video Compression Tool"
Write-Host "=====================" -ForegroundColor Green
Write-Host ""

# Install FFmpeg
Install-FFmpeg

Write-Host ""
Write-Host "Starting video compression..."
Write-Host ""

# Compress the large videos
$videosToCompress = @(
    @{
        Input = "frontend/website/public/videos/hero-bg-4k.mp4"
        Output = "frontend/website/public/videos/hero-bg-4k-compressed.mp4"
        Bitrate = 2000
    },
    @{
        Input = "frontend/assets/Images/9310125-uhd_3840_2160_30fps.mp4"
        Output = "frontend/assets/Images/9310125-uhd_3840_2160_30fps-compressed.mp4"
        Bitrate = 2500
    }
)

foreach ($video in $videosToCompress) {
    if (Test-Path $video.Input) {
        Compress-Video -InputPath $video.Input -OutputPath $video.Output -Bitrate $video.Bitrate
    } else {
        Write-Host "File not found: $($video.Input)" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "====================="
Write-Host "Compression Complete!" -ForegroundColor Green
Write-Host "====================="
Write-Host ""
Write-Host "Next steps:"
Write-Host "1. Review the compressed videos to ensure quality is acceptable"
Write-Host "2. Replace the original files with the compressed versions:"
Write-Host "   - Move/copy the -compressed versions to replace the originals"
Write-Host "3. Or update your index.tsx to use the compressed versions"
Write-Host "4. Commit and push to GitHub"
