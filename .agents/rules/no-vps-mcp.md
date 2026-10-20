# Regla: Prohibición del MCP `vps-lavarmicoche`

- **Restricción estricta:** NUNCA invocar herramientas del MCP `vps-lavarmicoche` (`ssh_exec`, `ssh_list_connections`, `ssh_connect`, `sftp_*`, etc.).
- Todo despliegue o gestión remota debe hacerse exclusivamente a través de Git y Dokploy (`dokploy-mcp`).
- La administración de datos y archivos se realiza mediante `@supabase/supabase-js` y Supabase Storage (`supabaseAdmin`), nunca por SSH manual.
