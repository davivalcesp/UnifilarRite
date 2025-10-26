# Esquema Unifilar Pro — PWA

Este repositorio contiene la aplicación de esquemas unifilares. He realizado los pasos iniciales para convertirla en PWA instalable en Windows/macOS/Android/iOS.

Qué cambié (cambios mínimos, seguros):

- `manifest.json`: actualizado `start_url`, `scope`, y rutas a la carpeta `icon/` existente. Añadido `shortcuts` y propiedades básicas.
- `service-worker.js`: corregidas rutas, añadido precache de recursos, fallback `offline.html`, estrategia cache-first y navigation network-first con fallback.
- `index.html`: ajustado `apple-touch-icon` y metadatos iOS.
- Añadido `offline.html` y este `README.md`.

Cómo probar localmente (Windows PowerShell):

Opción A — Usar el servidor incluido (si `iniciar-servidor.bat` está presente):

```powershell
# Abrir un terminal en la carpeta del proyecto y ejecutar el .bat
./"iniciar-servidor.bat"
```

Opción B — Python (si tienes Python instalado):

```powershell
# Desde la raíz del proyecto
python -m http.server 8000
# luego abrir http://localhost:8000 en el navegador
```

Opción C — http-server (Node.js)

```powershell
npx http-server -p 8080
# o instalarlo globalmente: npm i -g http-server
```

Probar PWA:

1. Abrir `http://localhost:8000` (o el puerto que uses) en Chrome o Edge.
2. Abrir DevTools > Application > Manifest para verificar que el `manifest.json` carga correctamente.
3. Ver en DevTools > Application > Service Worker que el SW se registra.
4. Simular offline en DevTools > Network > Offline y recargar: deberías ver `offline.html` para navegaciones.
5. Si aparece el prompt de instalación (o el icono "Install" en la barra de URL), instala la PWA.

Empaquetado multiplataforma (guía resumida):

- Windows (MSIX/Windows Store): usar https://www.pwabuilder.com/ para generar paquete MSIX y subir a Microsoft Partner Center.
- macOS: puedes usar PWABuilder o empaquetar como Electron si necesitas integración nativa; para distribuir en Mac App Store necesitarás una app nativa (Electron + notarization).
- Android: usar PWABuilder o Trusted Web Activity (TWA) con Android Studio para generar APK/AAB.
- iOS: Safari soporta "Add to Home Screen" pero con limitaciones (sin SW push, sin instalación como app store); para publicar en App Store necesitarás envolver la web en Capacitor/Cordova or create a native shell.

Siguientes pasos recomendados (puedo hacerlos si quieres):

- Generar iconos 192x192 y 512x512 (recomendado) y colocarlos en `icon/` (herramientas: https://realfavicongenerator.net/ o `pwabuilder images`).
- Añadir comprobaciones de versión y UI para actualizar SW (botón "Actualizar" cuando haya nueva versión).
- Si quieres publicar en Windows Store/Android, puedo generar los paquetes con PWABuilder y revisar el manifest para store fields.

Si quieres que continúe, dime qué prefieres: generar iconos correctamente, mejorar la estrategia de cache (Workbox), o crear paquetes para plataformas específicas (indica cuál).