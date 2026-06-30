$Image = "finally"
$Container = "finally-app"

if ($args[0] -eq "--build" -or -not (docker image inspect $Image 2>$null)) {
    docker build -t $Image .
}

$running = docker ps -q -f "name=$Container"
if ($running) {
    Write-Host "Already running: http://localhost:8000"
    exit 0
}

docker run -d `
    --name $Container `
    -v finally-data:/app/db `
    -p 8000:8000 `
    --env-file .env `
    $Image

Write-Host "Started: http://localhost:8000"
Start-Process "http://localhost:8000"
