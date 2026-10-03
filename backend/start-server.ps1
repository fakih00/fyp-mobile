$php = (Get-Command php -ErrorAction SilentlyContinue).Source
if (-not $php) {
    $php = 'C:\xampp\php\php.exe'
}
if (-not (Test-Path -LiteralPath $php)) {
    throw 'PHP was not found. Install PHP or set it on PATH.'
}

$uploadTemp = Join-Path $PSScriptRoot 'uploads\exercise_ai'
New-Item -ItemType Directory -Path $uploadTemp -Force | Out-Null

Push-Location $PSScriptRoot
try {
    & $php -d "upload_tmp_dir=$uploadTemp" -S '0.0.0.0:8000' 'router.php'
} finally {
    Pop-Location
}
