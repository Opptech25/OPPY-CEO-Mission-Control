# Guía de Instalación — Claude Code CLI en Windows

**Área:** OppTech · Inteligencia Artificial
**Documento:** SOP de instalación técnica
**Audiencia:** Equipo de desarrollo (practicantes e ingenieros)
**Herramienta:** Windows Terminal (PowerShell)

---

## 1. Resumen Ejecutivo

Esta guía estandariza la instalación de **Claude Code CLI** en equipos Windows usando **Windows Terminal**. El objetivo es que cualquier persona del equipo de OppTech pueda dejar su entorno listo en menos de 10 minutos, sin errores de configuración ni versiones inconsistentes entre máquinas.

| Dato | Detalle |
|---|---|
| Tiempo estimado | 10–15 minutos |
| Requisitos | Windows 10/11, permisos de administrador |
| Método recomendado | Instalador nativo (PowerShell) |
| Método alternativo | npm (si ya se usa Node.js en el equipo) |
| Responsable de soporte | Equipo OppTech (desarrollo) |

---

## 2. Requisitos Previos

| Requisito | Verificación | Obligatorio |
|---|---|---|
| Windows Terminal instalado | Buscar "Terminal" en el menú inicio | Sí |
| Conexión a internet estable | — | Sí |
| Permisos de administrador | Clic derecho → "Ejecutar como administrador" | Sí |
| Node.js LTS (solo si se usa el método npm) | `node -v` | Solo para método alternativo |
| Cuenta de Anthropic / Claude activa | claude.ai | Sí |

> **Windows Terminal** no viene por defecto en todas las versiones de Windows 10. Si no está instalado, se descarga gratis desde la Microsoft Store buscando "Windows Terminal".

---

## 3. Paso a Paso — Método Recomendado (Instalador Nativo)

Este método instala el binario oficial de Claude Code directamente, sin depender de Node.js.

**Paso 1 — Abrir Windows Terminal como administrador**
Clic derecho sobre el ícono de Windows Terminal → "Ejecutar como administrador".

**Paso 2 — Ejecutar el instalador oficial**

```powershell
irm https://claude.ai/install.ps1 | iex
```

**Paso 3 — Cerrar y volver a abrir la terminal**
Esto asegura que la variable de entorno `PATH` se actualice correctamente.

**Paso 4 — Verificar la instalación**

```powershell
claude --version
```

Si el comando responde con un número de versión, la instalación fue exitosa.

**Paso 5 — Iniciar sesión**

```powershell
claude login
```

Se abrirá el navegador para autenticarse con la cuenta de Anthropic/Claude asociada a OppTech.

**Paso 6 — Primer uso**

```powershell
cd C:\Ruta\De\Tu\Proyecto
claude
```

---

## 4. Método Alternativo — Instalación vía npm

Usar solo si el equipo ya trabaja con Node.js y se prefiere administrar Claude Code como paquete global.

**Paso 1 — Verificar Node.js y npm**

```powershell
node -v
npm -v
```

Si no aparece versión, instalar Node.js LTS desde [nodejs.org](https://nodejs.org) antes de continuar.

**Paso 2 — Instalar Claude Code CLI globalmente**

```powershell
npm install -g @anthropic-ai/claude-code
```

**Paso 3 — Verificar instalación**

```powershell
claude --version
```

**Paso 4 — Iniciar sesión**

```powershell
claude login
```

---

## 5. Checklist de Instalación

- [ ] Windows Terminal instalado y abierto como administrador
- [ ] Instalador ejecutado (nativo o npm)
- [ ] Terminal reiniciada tras la instalación
- [ ] `claude --version` responde correctamente
- [ ] Sesión iniciada con `claude login`
- [ ] Prueba realizada dentro de una carpeta de proyecto
- [ ] Acceso confirmado al modelo asignado por el equipo

---

## 6. Solución de Problemas Comunes

| Problema | Causa probable | Solución |
|---|---|---|
| `claude` no se reconoce como comando | PATH no actualizado | Cerrar y volver a abrir Windows Terminal; reiniciar el equipo si persiste |
| Error de permisos al ejecutar el script | Terminal no abierta como administrador | Cerrar y reabrir con "Ejecutar como administrador" |
| Bloqueo por política de ejecución de PowerShell | Restricción de scripts (`ExecutionPolicy`) | Ejecutar: `Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass` y repetir el paso |
| `npm` no reconocido | Node.js no instalado o PATH no configurado | Instalar Node.js LTS y reiniciar la terminal |
| No abre el navegador para login | Antivirus o firewall corporativo | Verificar excepciones de red o copiar el enlace manualmente en el navegador |

---

## 7. Riesgos y Recomendaciones

**Riesgos:**
- Instalaciones inconsistentes entre máquinas del equipo si cada persona usa un método distinto (nativo vs. npm).
- Practicantes sin permisos de administrador en equipos corporativos, lo que puede bloquear la instalación.
- Credenciales de acceso a Claude compartidas de forma insegura (por WhatsApp o correo sin control).

**Recomendaciones:**
- Estandarizar el **método nativo** (Paso 3) como único procedimiento oficial de OppTech.
- Cada integrante debe usar su propia cuenta o el acceso asignado, no compartir credenciales.
- Guardar esta guía como referencia única en `12_IA/OppTech/` para evitar versiones sueltas por WhatsApp o correo.

---

## 8. Automatizaciones Posibles

- Crear un **script único (.ps1)** que instale Claude Code, configure el PATH y valide la versión en un solo paso, para distribuir a nuevos ingresos del equipo.
- Incluir esta instalación como parte del **onboarding automatizado** de nuevos practicantes de desarrollo (checklist de primer día).

---

## 9. Próximos Pasos

1. Validar esta guía con el equipo de desarrollo actual (3 practicantes + 2 ingenieros por horas).
2. Definir el modelo/plan estándar de Claude que usará el equipo de OppTech.
3. Documentar buenas prácticas de uso de Claude Code dentro de los proyectos internos.
