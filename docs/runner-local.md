# Runner local de GitHub Actions

Los workflows (`ci.yml` y `codeql.yml`) eligen la máquina según la **variable de repositorio `RUNNER`**
(Settings → Secrets and variables → Actions → Variables):

| `RUNNER` | Dónde corren los jobs de `push`, manuales y semanales |
| --- | --- |
| `pws-local` | En la PC con el runner local (etiqueta `pws-local`) |
| `ubuntu-latest` o sin definir | En los runners de GitHub |

Los **pull requests siempre usan runners de GitHub**: el código de un fork nunca se ejecuta en la PC.

> Nota: en repositorios **públicos** los runners de GitHub no consumen minutos del plan gratuito.
> El runner local sirve para no depender de esa cuota (por ejemplo, si el repo pasa a privado) y para builds más rápidos.

## Instalación actual

- Carpeta: `C:\actions-runner` (runner oficial v2.338.2, SHA-256 verificado contra la release de `actions/runner`).
- Nombre: `pc-pc-karla`, etiqueta: `pws-local`, carpeta de trabajo: `C:\actions-runner\_w`.
- Arranque: `C:\actions-runner\start-runner.cmd` (añade Git Bash al `PATH`, porque los pasos usan `shell: bash`).
- Registro: `C:\actions-runner\runner.log`.

## Comandos útiles (PowerShell)

```powershell
# Iniciar el runner en segundo plano
Start-Process C:\actions-runner\start-runner.cmd -WindowStyle Hidden

# Ver si está escuchando
Get-Content C:\actions-runner\runner.log -Tail 5

# Detenerlo
Get-Process Runner.Listener -ErrorAction SilentlyContinue | Stop-Process

# Volver a los runners de GitHub (por ejemplo, si la PC va a estar apagada)
gh variable set RUNNER --body ubuntu-latest -R KarlaMedina97/lightstick-bts-concert-sync

# Usar de nuevo el runner local
gh variable set RUNNER --body pws-local -R KarlaMedina97/lightstick-bts-concert-sync
```

Si la PC está apagada y `RUNNER` vale `pws-local`, los jobs quedan en cola hasta que el runner vuelva
(GitHub los cancela a las 24 h).

## Iniciar con Windows (manual, una sola vez)

Opción A, tarea programada al iniciar sesión (no requiere administrador):

```powershell
$a = New-ScheduledTaskAction -Execute "C:\actions-runner\start-runner.cmd"
$t = New-ScheduledTaskTrigger -AtLogOn -User $env:USERNAME
Register-ScheduledTask -TaskName "GitHub Actions runner (Purple Wave)" -Action $a -Trigger $t -Settings (New-ScheduledTaskSettingsSet -ExecutionTimeLimit 0 -AllowStartIfOnBatteries)
```

Opción B, servicio de Windows (PowerShell **como administrador**; arranca aunque no inicies sesión):

```powershell
cd C:\actions-runner
.\config.cmd remove --token (gh api -X POST repos/KarlaMedina97/lightstick-bts-concert-sync/actions/runners/remove-token --jq .token)
.\config.cmd --unattended --url https://github.com/KarlaMedina97/lightstick-bts-concert-sync --token (gh api -X POST repos/KarlaMedina97/lightstick-bts-concert-sync/actions/runners/registration-token --jq .token) --name pc-pc-karla --labels pws-local --work _w --runasservice
```

Con la opción B, añade `C:\Program Files\Git\bin` al `PATH` del sistema para que el servicio encuentre `bash`.

## Seguridad

- El repo es público: nunca cambies los workflows para que `pull_request` use el runner local.
- En Settings → Actions → General → "Approval for running fork pull request workflows from contributors",
  elige **Require approval for all external contributors**.
- El runner corre con tu usuario de Windows: cualquier paso de un workflow puede leer tus archivos.
  Revisa los cambios a `.github/workflows/` antes de aceptarlos.

## Desinstalar

```powershell
Get-Process Runner.Listener -ErrorAction SilentlyContinue | Stop-Process
cd C:\actions-runner
.\config.cmd remove --token (gh api -X POST repos/KarlaMedina97/lightstick-bts-concert-sync/actions/runners/remove-token --jq .token)
gh variable set RUNNER --body ubuntu-latest -R KarlaMedina97/lightstick-bts-concert-sync
```
