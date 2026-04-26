# Tarea operativa · Subir el repo a GitHub por primera vez

> Lee `CLAUDE.md` antes de tocar nada. Esto **no es una fase** — es una operación puntual de infraestructura.
> Modelo recomendado: **Claude Sonnet 4.6** (también vale Haiku para esto).
> Sin rama nueva. Trabajamos sobre `main`. Sin PR — push directo.

---

## 0. Repo destino

```
https://github.com/daniKuradchyk/BeProud.git
```

El usuario ya creó el repo en GitHub. Está vacío (o casi). Asume que él tiene autenticación configurada en su máquina (PAT, GitHub CLI o SSH key).

---

## 1. Pre-flight crítico — auditar secretos

**Antes de añadir el remote, validar que NO se sube nada sensible**. Bloqueante.

1. Confirmar que `.gitignore` raíz cubre como mínimo:

```
# Node / pnpm
node_modules/
.pnpm-store/

# Expo / Metro
.expo/
.expo-shared/
dist/
web-build/
*.apk
*.aab
*.ipa

# Env / secretos
.env
.env.local
.env.development.local
.env.production.local
**/.env.local
.eas/

# Sistema operativo
.DS_Store
Thumbs.db

# Editor
.idea/
.vscode/
*.swp

# Build artifacts
*.log
*.tsbuildinfo
coverage/
```

   - Si falta algo, añadirlo y hacer commit `chore: harden gitignore before first push`.

2. Buscar **literales sospechosos** que pudieran haberse colado a archivos versionados:

```bash
git grep -E 'eyJhbGc'                # tokens JWT (Supabase service / anon)
git grep -E 'sk-ant-'                # Anthropic API keys
git grep -E 'sbp_'                   # Supabase access tokens
git grep -E 'ghp_|github_pat_'       # GitHub PATs
git grep -E 'AKIA[0-9A-Z]{16}'       # AWS access keys
git grep -i 'service_role'           # cualquier mención de service_role en cliente
```

   Cualquier match → **parar y avisar al usuario antes de continuar**. La anon key pública de Supabase es OK (es pública por diseño y debe ir en env vars cliente), pero la service role NO puede aparecer nunca en un archivo versionado.

3. Verificar que no hay archivos pesados commiteados sin querer:

```bash
git ls-files | xargs -I{} du -k "{}" 2>/dev/null | sort -n | tail -20
```

   Cualquier blob > 5 MB → revisar si es lícito. APK de prueba, .ipa, dump de DB, etc. → eliminar y rebajar el historial si ya está commiteado (`git rm --cached`).

4. Confirmar que `.env.local` y similares **no están** en el index:

```bash
git ls-files | grep -E '\.env'
```

   Si aparece alguno, `git rm --cached` y commit antes de pushear.

---

## 2. Reorganizar archivos `PROMPT-*.md`

En la raíz del repo hay varios archivos sueltos del usuario:
- `PROMPT-FASE-12-RUTINA.md`
- `PROMPT-FASE-13-HUB-STUDY.md`
- `PROMPT-FASE-14-NUTRICION.md`
- `PROMPT-FASE-BETA-DISTRIBUCION.md`
- `PROMPT-GITHUB-INITIAL-PUSH.md` (este mismo)
- Posiblemente `BeProud - Documento maestro.docx` y `PROMPTS.md` si existen.

Mover los `PROMPT-*.md` a una carpeta `docs/prompts/` para mantener limpia la raíz. Conservar nombres exactos.

```
mkdir -p docs/prompts
git mv PROMPT-*.md docs/prompts/
```

`CLAUDE.md`, `PROMPTS.md`, `README.md` se quedan en la raíz.

Commit: `docs: organize phase prompts under docs/prompts`.

---

## 3. Verificar estado del repo local

```bash
git status            # debe estar limpio o solo con commits propios
git log --oneline -10 # ver el histórico reciente
git branch            # rama actual
```

Si la rama actual no es `main`, renombrar:

```bash
git branch -M main
```

---

## 4. Configurar el remote y empujar

```bash
# Solo si no existe ya un origin (suele no existir en repo recién inicializado).
git remote -v
git remote add origin https://github.com/daniKuradchyk/BeProud.git

# Primer push. -u deja main como upstream para futuros `git push` sin args.
git push -u origin main
```

Si el repo remoto tiene un commit inicial (README auto-creado por GitHub), GitHub rechazará el push. Dos opciones:

a) **Forzar el push si el remoto solo tiene un README placeholder** (preferido cuando el contenido remoto no aporta nada):

```bash
git push -u origin main --force-with-lease
```

b) **Pull con rebase** si el remoto tiene algo que conservar:

```bash
git pull --rebase origin main
git push -u origin main
```

Preferir (a) si el repo remoto solo tiene el README.md auto-generado por GitHub, porque el README local va a ser mejor.

---

## 5. Post-push · GitHub Actions

El proyecto ya tiene workflows en `.github/workflows/` (lint + typecheck + test). Tras el primer push:

1. Ir a `https://github.com/daniKuradchyk/BeProud/actions` y verificar que el primer workflow se dispara y pasa verde.
2. Si falla, leer el log y crear bugfix commit. **No mergear nada hasta que el CI esté verde**.

---

## 6. Configuración recomendada en GitHub (lo hace el usuario, documentar)

Documentar estos pasos manuales en el resumen del PR / mensaje al usuario:

1. **Settings → General → Default branch**: confirmar que es `main`.
2. **Settings → Branches → Branch protection rules** (opcional pero recomendado):
   - Branch name pattern: `main`
   - Require a pull request before merging: ON
   - Require status checks to pass: ON, marcar lint/typecheck/test
   - Require conversation resolution: ON
3. **Settings → Secrets and variables → Actions**:
   - Añadir `EXPO_TOKEN` cuando se quiera CI con EAS.
   - Añadir `SUPABASE_ACCESS_TOKEN` si se quiere CI con migraciones (no necesario ahora).
4. **Settings → Pages**: dejar OFF. La web va a Netlify, no GitHub Pages.

---

## 7. Verificación final

1. Abrir el repo en `https://github.com/daniKuradchyk/BeProud`.
2. Confirmar que se ven todas las carpetas: `apps/`, `packages/`, `supabase/`, `docs/`.
3. Confirmar que **no se ven** `.env.local`, `node_modules/`, `dist/`.
4. Abrir un archivo cualquiera y verificar que el contenido es correcto.
5. Verificar que el README de la raíz se renderiza decente.

---

## 8. Qué NO hacer

- No hacer push si encuentras secretos en archivos versionados. Limpiar primero, incluyendo histórico si hace falta (`git filter-repo` o BFG). Avisar al usuario antes.
- No hacer force push si el repo ya tenía commits del usuario distintos al README placeholder.
- No crear ramas adicionales en este paso. Solo `main`.
- No abrir PRs ficticios. El primer push es directo a main.
- No subir el documento maestro `.docx` si es muy pesado o tiene contenido sensible — si pesa más de 1 MB y tiene revisión interna, mejor dejarlo fuera del repo y referenciarlo desde el README.

---

## 9. Entregables

1. Repo público o privado (decisión del usuario, por defecto privado) con todo el código actual subido.
2. Carpeta `docs/prompts/` con los `PROMPT-*.md` organizados.
3. CI verde en el primer push.
4. `.gitignore` blindado.
5. Resumen al usuario con: link al repo, estado del CI, lista de pasos manuales pendientes (branch protection, secrets) y cualquier archivo sensible detectado en el camino que haya tocado limpiar.
