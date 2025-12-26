# Script para auto-push a GitHub
param(
    [string]$message = "Auto-update: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
)

Write-Host "Verificando cambios..." -ForegroundColor Cyan

# Verificar si hay cambios
$status = git status --porcelain
if ([string]::IsNullOrWhiteSpace($status)) {
    Write-Host "No hay cambios para subir" -ForegroundColor Green
    exit 0
}

Write-Host "Agregando cambios..." -ForegroundColor Yellow
git add .

Write-Host "Creando commit..." -ForegroundColor Yellow
git commit -m $message

Write-Host "Subiendo a GitHub..." -ForegroundColor Yellow
git push origin main

Write-Host "Cambios subidos exitosamente!" -ForegroundColor Green
