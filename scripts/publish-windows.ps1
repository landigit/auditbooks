# Publish script for Windows
$ErrorActionPreference = "Stop"

# Check pnpm version
$pnpmVersion = (pnpm --version).Trim()
Write-Host "Current pnpm version: $pnpmVersion"

# Source secrets from .env.publish if it exists
$envPublishPaths = @(".env.publish", ".agents/.env.publish")
foreach ($path in $envPublishPaths) {
    if (Test-Path $path) {
        Write-Host "Sourcing environment variables from $path"
        $lines = Get-Content $path
        if ($lines.Count -eq 1 -and $lines[0] -notmatch "=") {
            # Special case: file only contains the token
            $env:GH_TOKEN = ($lines -join "").Trim()
            Write-Host "Set GH_TOKEN from single-line file"
        } else {
            $lines | ForEach-Object {
                if ($_ -match "^\s*(?:export\s+)?(?<name>[^=]+)=(?<value>.*)$") {
                    $name = $Matches['name'].Trim()
                    $value = $Matches['value'].Trim().Trim('"').Trim("'")
                    [System.Environment]::SetEnvironmentVariable($name, $value, "Process")
                    Write-Host "Set $name"
                }
            }
        }
        break
    }
}

# Create folder for the publish build in the parent directory
$currentPath = Get-Location
$parentPath = Split-Path -Path $currentPath -Parent
$buildPath = Join-Path -Path $parentPath -ChildPath "build_publish"

Write-Host "Preparing build directory at: $buildPath"
if (Test-Path $buildPath) {
    Remove-Item -Recurse -Force $buildPath
}
New-Item -ItemType Directory -Path $buildPath | Out-Null
Set-Location $buildPath

# Clone and cd into books (using the landigit/auditbooks repo)
Write-Host "Cloning repository..."
git clone https://github.com/landigit/auditbooks --depth 1
Set-Location "auditbooks"

# Copy creds to log_creds.txt
Write-Host "Writing credentials to log_creds.txt"
$creds = @(
    $env:ERR_LOG_KEY,
    $env:ERR_LOG_SECRET,
    $env:ERR_LOG_URL,
    $env:TELEMETRY_URL
)
$creds | Out-File -FilePath "log_creds.txt" -Encoding ascii

# Install Dependencies
Write-Host "Installing dependencies..."
pnpm install

# Build and Publish
Write-Host "Starting build and publish for Windows..."
# Ensure GH_TOKEN is available in the process environment
if (-not $env:GH_TOKEN) {
    Write-Warning "GH_TOKEN is not set. Publishing might fail."
}

pnpm run scripts/publish-tauri.ts

Write-Host "Publish complete."
Set-Location $currentPath
