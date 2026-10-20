---
name: no-vps-mcp
description: Prohibits invoking the vps-lavarmicoche MCP server tools (ssh_exec, ssh_connect, sftp_*, etc.). All operations must be handled locally, through git, Dokploy, or official client APIs.
user-invocable: true
---

# Directiva Estricta: Prohibición de uso del MCP `vps-lavarmicoche`

Esta directiva establece una regla obligatoria e inquebrantable para el agente en este proyecto:

1. **NO TOCAR `vps-lavarmicoche`:** Bajo ninguna circunstancia se deben llamar herramientas del servidor MCP `vps-lavarmicoche` (`ssh_connect`, `ssh_disconnect`, `ssh_list_connections`, `ssh_exec`, `ssh_system_info`, `sftp_ls`, `sftp_read`, `sftp_write`, `sftp_mkdir`, `sftp_rm`, `sftp_mv`, `sftp_stat`, `ssh_keygen`, `ssh_port_forward`).
2. **Flujo de Trabajo Permitido:**
   - El código se desarrolla, compila y prueba localmente en el workspace.
   - Los cambios se integran y publican a través de Git (`git push origin main`).
   - Los despliegues se delegan a Dokploy (`dokploy-mcp`) o a los webhooks automáticos de despliegue en producción.
   - Las operaciones de base de datos y almacenamiento se gestionan mediante el cliente de Supabase (`supabaseAdmin` / `@supabase/supabase-js`), sin conexiones SSH directas.
