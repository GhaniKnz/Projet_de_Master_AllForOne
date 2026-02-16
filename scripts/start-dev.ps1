$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$serverRoot = Join-Path $root "server"

function Test-PortOpen {
  param(
    [Parameter(Mandatory = $true)]
    [int]$Port
  )

  $client = $null
  try {
    $client = New-Object System.Net.Sockets.TcpClient
    $async = $client.BeginConnect("127.0.0.1", $Port, $null, $null)
    $connected = $async.AsyncWaitHandle.WaitOne(250)
    if (-not $connected) {
      return $false
    }
    $client.EndConnect($async) | Out-Null
    return $true
  } catch {
    return $false
  } finally {
    if ($client) {
      $client.Close()
    }
  }
}

function Wait-PortOpen {
  param(
    [Parameter(Mandatory = $true)]
    [int]$Port,
    [int]$TimeoutSeconds = 20
  )

  for ($i = 0; $i -lt $TimeoutSeconds; $i++) {
    if (Test-PortOpen -Port $Port) {
      return $true
    }
    Start-Sleep -Seconds 1
  }
  return $false
}

function Stop-ListenerOnPort {
  param(
    [Parameter(Mandatory = $true)]
    [int]$Port
  )

  $pids = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue |
    Select-Object -ExpandProperty OwningProcess -Unique

  if (-not $pids) {
    return
  }

  foreach ($processId in $pids) {
    try {
      Stop-Process -Id $processId -Force -ErrorAction Stop
      Write-Host "Stopped process $processId listening on port $Port"
    } catch {
      Write-Warning ("Could not stop process {0} on port {1}: {2}" -f $processId, $Port, $_.Exception.Message)
    }
  }
}

function Ensure-Mongo {
  if (Test-PortOpen -Port 27017) {
    Write-Host "MongoDB already reachable on port 27017"
    return
  }

  if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Warning "MongoDB is not running on port 27017 and Docker CLI was not found."
    Write-Warning "Install/start MongoDB manually, then rerun this script."
    return
  }

  $dockerReady = $false
  try {
    docker info *> $null
    $dockerReady = $LASTEXITCODE -eq 0
  } catch {
    $dockerReady = $false
  }

  if (-not $dockerReady) {
    $desktopExe = Join-Path ${env:ProgramFiles} "Docker\Docker\Docker Desktop.exe"
    if (Test-Path $desktopExe) {
      Write-Host "Starting Docker Desktop..."
      Start-Process -FilePath $desktopExe | Out-Null
      for ($i = 0; $i -lt 30; $i++) {
        Start-Sleep -Seconds 2
        try {
          docker info *> $null
          if ($LASTEXITCODE -eq 0) {
            $dockerReady = $true
            break
          }
        } catch {
          # keep waiting
        }
      }
    }
  }

  if (-not $dockerReady) {
    Write-Warning "Docker Desktop daemon is not running."
    Write-Warning "Start Docker Desktop, then rerun this script."
    return
  }

  $containerName = "afo-mongo"
  $existing = docker ps -a --filter "name=^$containerName$" --format "{{.Names}}"

  if (-not $existing) {
    Write-Host "Creating MongoDB container '$containerName'..."
    docker run -d --name $containerName -p 27017:27017 mongo:6 *> $null
  } else {
    Write-Host "Starting MongoDB container '$containerName'..."
    docker start $containerName *> $null
  }

  if (-not (Wait-PortOpen -Port 27017 -TimeoutSeconds 30)) {
    Write-Warning "MongoDB container started but port 27017 is still not reachable."
    return
  }

  Write-Host "MongoDB ready on mongodb://127.0.0.1:27017"
}

Write-Host "Preparing local stack..."
Ensure-Mongo

Stop-ListenerOnPort -Port 8080
Stop-ListenerOnPort -Port 5173

Start-Process -FilePath "powershell.exe" -ArgumentList @(
  "-NoExit",
  "-Command",
  "cd `"$serverRoot`"; npm run dev"
) | Out-Null

Start-Process -FilePath "powershell.exe" -ArgumentList @(
  "-NoExit",
  "-Command",
  "cd `"$root`"; npm run dev -- --host 127.0.0.1 --port 5173 --strictPort"
) | Out-Null

if (Wait-PortOpen -Port 8080 -TimeoutSeconds 20) {
  Write-Host "Backend started on http://localhost:8080"
} else {
  Write-Warning "Backend did not start on port 8080 within timeout."
}

if (Wait-PortOpen -Port 5173 -TimeoutSeconds 20) {
  Write-Host "Frontend started on http://localhost:5173"
} else {
  Write-Warning "Frontend did not start on port 5173 within timeout."
}

Write-Host "Done. Keep the two opened terminals running."
