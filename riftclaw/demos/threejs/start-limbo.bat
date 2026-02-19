@echo off
echo ============================================
echo   RiftClaw Limbo World - Quick Start
echo ============================================
echo.
echo Starting local server...
echo.
echo Once started, open your browser to:
echo   http://localhost:8000/limbo.html
echo.
echo Press Ctrl+C to stop the server
echo.
echo ============================================
echo.

:: Check if Python is available
python --version >nul 2>&1
if %errorlevel% == 0 (
    echo [Using Python]
    python -m http.server 8000
    goto :end
)

:: Check if Python3 is available  
python3 --version >nul 2>&1
if %errorlevel% == 0 (
    echo [Using Python3]
    python3 -m http.server 8000
    goto :end
)

:: Check if Node.js is available
node --version >nul 2>&1
if %errorlevel% == 0 (
    echo [Using Node.js - installing serve...]
    npx serve -l 8000
    goto :end
)

:: No Python or Node, use PowerShell
powershell -Command "
    Write-Host '[Using PowerShell]' -ForegroundColor Cyan
    Write-Host 'Starting server...' -ForegroundColor Green
    $listener = New-Object System.Net.HttpListener
    $listener.Prefixes.Add('http://localhost:8000/')
    $listener.Start()
    Write-Host 'Server running at http://localhost:8000/' -ForegroundColor Green
    Write-Host 'Press Ctrl+C to stop' -ForegroundColor Yellow
    while ($listener.IsListening) {
        $context = $listener.GetContext()
        $request = $context.Request
        $response = $context.Response
        $path = Join-Path (Get-Location) $request.Url.LocalPath
        if (Test-Path $path -PathType Container) { $path = Join-Path $path 'limbo.html' }
        if (Test-Path $path) {
            $content = [System.IO.File]::ReadAllBytes($path)
            $response.ContentLength64 = $content.Length
            $response.OutputStream.Write($content, 0, $content.Length)
        } else {
            $response.StatusCode = 404
        }
        $response.Close()
    }
"

:end
echo.
echo Server stopped.
pause
