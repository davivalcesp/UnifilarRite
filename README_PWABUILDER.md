# PWABuilder — Preparación del paquete

Este archivo explica cómo usar el ZIP creado (`esquemapro-pwa.zip`) para generar paquetes con PWABuilder y qué pasos seguir para generar paquetes para Windows/Android/macOS.

Archivos importantes incluidos
- `manifest.json` (en la raíz) — actualizado con iconos y settings
- `service-worker.js` — precache y fallback offline
- `offline.html` — página offline
- `icon/` — contiene icon-144.png, icon-192.png, icon-256.png, icon-384.png, icon-512.png, icon-1024.png y versiones maskable

Qué contiene el ZIP
- Todo el contenido del proyecto tal como está en la carpeta del repositorio. PWABuilder aceptará el ZIP y creará paquetes basándose en los archivos.

Antes de subir a PWABuilder
1. Asegúrate de que `start_url` en `manifest.json` sea correcto (act. `./`).
2. Si vas a publicar en stores, la app debe estar accesible por HTTPS en una URL pública para validar (PWABuilder puede usar el ZIP, pero para publicar en stores necesitarás que la app esté alojada en un dominio público HTTPS).
3. Prepara credenciales para publicación:
   - Windows/MSIX: cuenta Microsoft Developer y certificado/signing
   - Android (APK/AAB): keystore (para firmar)
   - iOS/macOS (si se envuelve en Capacitor/Electron): Apple Developer account y certificados

Subir ZIP a PWABuilder
1. Ve a https://www.pwabuilder.com/
2. En "Package" selecciona "Upload a ZIP" y sube `esquemapro-pwa.zip`.
3. Sigue los pasos: PWABuilder validará el manifiesto, los iconos y otros assets.
4. Elige plataforma(s) a generar (Windows, Android, iOS/macOS wrappers). PWABuilder generará paquetes y te dará un ZIP con los artefactos.

Notas específicas y recomendaciones
- Para Google Play: usa Trusted Web Activity (TWA) — PWABuilder puede generar el proyecto TWA pero necesitarás Android SDK/Android Studio para compilar el AAB y firmarlo con tu keystore.
- Para Microsoft Store: PWABuilder genera un MSIX; necesitarás firmarlo y subirlo a Partner Center.
- Para App Store (iOS/macOS): PWABuilder puede dar instrucciones pero publicar requiere envolver la app en un contenedor nativo (ej. Capacitor/Electron) y firmarla con certificados Apple.

Pruebas locales (recomendado antes de empaquetar)
1. Levanta un servidor local (por ejemplo `python -m http.server 8000`).
2. Abre `http://localhost:8000` en Chrome/Edge.
3. En DevTools > Application comprueba manifest, service worker y cache.
4. Prueba instalar la app (menú › Apps › Install) o usar el botón "Instalar" que aparece.

Siguientes pasos que puedo hacer por ti
- Subir el ZIP a PWABuilder y seguir el asistente para generar los paquetes (necesitaré tus credenciales/decisiones para firmar y publicar).
- Generar un proyecto TWA para Android listo para compilar en Android Studio.
- Generar el paquete MSIX para Windows y las instrucciones para firmarlo y subirlo.

Si quieres que continúe ahora, dime qué plataforma(s) quieres generar primero (Windows, Android, macOS/iOS). También dime si quieres que yo suba el ZIP a PWABuilder (puedes subirlo desde tu navegador) o prefieres hacerlo manualmente y que yo te guíe.