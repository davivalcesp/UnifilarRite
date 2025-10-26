# Generar MSIX para Windows (Guía)

Este documento explica cómo obtener un paquete MSIX para Windows a partir de la PWA usando PWABuilder y cómo firmarlo/prepararlo para publicar o para instalar localmente (sideload).

Resumen rápido
- Usa PWABuilder para generar un paquete MSIX a partir del ZIP (`esquemapro-pwa.zip`) o desde la URL pública de tu app.
- Si quieres publicar en Microsoft Store, sube el MSIX a Partner Center; PWABuilder puede ayudar a crear el MSIX.
- Para instalar localmente, firma el MSIX con un certificado PFX y usa `Add-AppxPackage` o doble clic si tienes habilitado sideload.

1) Generar el MSIX con PWABuilder

Opción A — Usar PWABuilder web (recomendado para empezar):

1. Abre https://www.pwabuilder.com/
2. Selecciona "Upload a ZIP" y sube `esquemapro-pwa.zip` (ya creado en la raíz del repo).
3. En el asistente elige "Windows (MSIX)" y completa los metadatos que te pida (Display name, Publisher display name, Publisher ID — para publicar en Store necesitarás el Publisher ID que te da Partner Center).
4. Descarga el artefacto MSIX que PWABuilder genera. Si PWABuilder te entrega un proyecto para Visual Studio, puedes abrirlo y compilar el MSIX localmente.

2) Firmar el MSIX (requisito para instalar y publicar)

Para instalar un MSIX en Windows 10/11 sin pasar por la Store es necesario que el paquete esté firmado con un certificado válido y que la máquina acepte ese certificado (sideload). Hay dos opciones:

- Usar un certificado emitido por una CA pública (recomendado para publicación en Store / clientes).
- Usar un certificado autofirmado (ok para pruebas internas). En este caso tendrás que instalar el certificado en la máquina como Trusted Root CA.

Crear un certificado autofirmado (PowerShell):

```powershell
# Crear el certificado en el almacén CurrentUser
$cert = New-SelfSignedCertificate -Type CodeSigningCert -Subject "CN=UnifilarRite" -KeyExportPolicy Exportable -FriendlyName "UnifilarRite PWA Test Cert" -CertStoreLocation "Cert:\CurrentUser\My" -NotAfter (Get-Date).AddYears(5)

# Exportar a PFX (introduce una contraseña segura en lugar de 'p@ssw0rd')
$pwd = ConvertTo-SecureString -String 'p@ssw0rd' -Force -AsPlainText
Export-PfxCertificate -Cert $cert -FilePath .\unifilarrite_cert.pfx -Password $pwd
```

Firmar MSIX con SignTool (parte del Windows SDK):

```powershell
# Ruta a SignTool.exe (instala Windows SDK o Visual Studio para obtenerlo)
# Ejemplo de uso:
& "C:\Program Files (x86)\Windows Kits\10\bin\x64\signtool.exe" sign /fd SHA256 /a /f .\unifilarrite_cert.pfx /p p@ssw0rd .\EsquemaPro.msix
```

Si no tienes `signtool.exe`, PWABuilder ofrece la opción de generar paquetes ya firmados si proporcionas las credenciales (no recomendado compartir en abierto).

3) Instalar localmente (sideload)

Habilitar sideload (en Windows 10/11):

1. Configuración → Actualización y Seguridad → Para desarrolladores → activar "Modo de desarrollador" o "Sideload apps".

Instalar el certificado raíz (si usaste uno autofirmado):

```powershell
# Importar PFX al almacén de CurrentUser (ejecutar como user normal)
$password = ConvertTo-SecureString -String 'p@ssw0rd' -AsPlainText -Force
Import-PfxCertificate -FilePath .\unifilarrite_cert.pfx -CertStoreLocation Cert:\CurrentUser\TrustedPeople -Password $password
# (o para que el SO confíe globalmente) instalar en Trusted Root (administrador)
# Import-PfxCertificate -FilePath .\unifilarrite_cert.pfx -CertStoreLocation Cert:\LocalMachine\Root -Password $password
```

Instalar el MSIX:

```powershell
Add-AppxPackage -Path .\EsquemaPro.msix
```

4) Publicar en Microsoft Store

1. Accede a Microsoft Partner Center y crea una nueva app.
2. En el proceso de creación obtendrás tu Publisher ID (formato CN=...). Este Publisher ID debe coincidir con el campo `Publisher` del AppxManifest (PWABuilder suele encargarse de esto si usas su asistente).
3. Sube el MSIX y completa las pantallas de metadatos, capturas y certificaciones.

5) Notas y recomendaciones

- PWABuilder es la vía más sencilla para generar el MSIX sin configurar todo localmente. Si necesitas más control, puedes abrir el proyecto que PWABuilder entrega en Visual Studio y editar el `Package.appxmanifest`.
- Asegúrate de que el `manifest.json` de la PWA contenga `start_url`, `scope`, `display` y los iconos requeridos.
- Para clientes/profesionales, usa un certificado emitido por una CA pública para firmar el MSIX y evitar pasos manuales de confianza por parte del usuario.

Si quieres, puedo:
- Generar un `AppxManifest.xml` base que puedas usar en Visual Studio (lo creo en `msix/AppxManifest.xml`).
- Crear un script PowerShell que intente empaquetar con `MakeAppx.exe` y firmar con `signtool.exe` si localmente tienes las herramientas (te mostraré advertencias si faltan).
- Guiarte en tiempo real a través del asistente PWABuilder desde tu navegador.

Di cómo quieres continuar: ¿quieres el `AppxManifest.xml` y el script de empaquetado ahora? (puedo generarlos automáticamente).
