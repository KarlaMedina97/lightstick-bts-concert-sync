# Corrida diaria de colores con Gemini (plan gratuito: se corta solo al llegar al límite del día, error 429).
# La lanza la tarea programada "LumiParty Gemini diario". Deja el registro en gemini-diario.log (se agrega al final).
$ErrorActionPreference = "Continue"
Set-Location (Split-Path $PSScriptRoot -Parent)
$log = "gemini-diario.log"
"`n===== $(Get-Date -Format 'yyyy-MM-dd HH:mm') =====" | Out-File $log -Append -Encoding Unicode  # igual que *>> en PowerShell 5.1 (UTF-16)
node scripts/gemini-colors.mjs --missing *>> $log
node scripts/recolor-sequences.mjs *>> $log
