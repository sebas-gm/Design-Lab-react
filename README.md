# Navishop

La marca de la aplicación es **Navishop**. El paquete del frontend se llama `navishop` y la documentación de FastAPI se presenta como Navishop API. La base existente conserva el nombre técnico `design_lab_db`, y se mantienen la cookie y los eventos internos de sesión anteriores para conservar la compatibilidad. El cambio de marca no requiere crear otra base ni modificar credenciales.

Directorio de negocios cercanos a TECBA. React + Vite, FastAPI, SQLAlchemy y MySQL. Conserva el diseño morado, las rutas y el catálogo original como datos de ejemplo importables.

## Requisitos

- Node.js compatible con Vite 8 (22.12+), Python 3.12+ y MySQL 8.
- Una base de datos MySQL y un usuario autorizado. No se proporcionan contraseñas ni se crean cuentas MySQL automáticamente.

## Ejecutar en Windows (PowerShell)

Desde la carpeta raíz `Proyecto React`:

```powershell
python -m venv .venv
.\.venv\Scripts\python -m pip install -r backend/requirements.txt
Copy-Item backend/.env.example backend/.env
```

Si `backend/.env` ya existe, edítalo sin sobrescribirlo. Está preparado para `localhost:3306`, base `design_lab_db`, usuario `root`. Completa `MYSQL_PASSWORD` con tu contraseña real. La contraseña permanece local y Git ignora el archivo. Si contiene `#` o espacios, escríbela entre comillas en el archivo `.env`. Las contraseñas con caracteres especiales se admiten sin codificación URL.

MySQL se detectó instalado: servicio `MySQL80` activo y puerto `3306` escuchando. No se intentaron contraseñas vacías. Después de guardar tu contraseña, crea la base y las tablas con:

```powershell
.\.venv\Scripts\python -m backend.init_db
```

El comando crea únicamente la base configurada si no existe, crea tablas ausentes y verifica `SELECT 1`. Si la base existe, conserva su contenido. También puedes ejecutar `backend/schema.sql` en MySQL Workbench para crear `design_lab_db` y las tablas. El usuario necesita permiso CREATE para la instalación.

Instalación local verificada el 14 de noviembre de 2026: `design_lab_db` creada, tablas `users`, `businesses`, `products` y `sessions` presentes. FastAPI respondió correctamente en `/api/health`, `/api/negocios` y `/api/productos` usando MySQL real. No se crearon cuentas ni registros de prueba en esta base.

```powershell
.\.venv\Scripts\python -m uvicorn backend.main:app --reload --host 127.0.0.1 --port 8000
```

El inicio crea tablas ausentes y aplica la migración aditiva de `backend/migrations.py` para contacto, horario y logo: solo agrega las columnas que falten, sin borrar datos. `backend/schema.sql` contiene el esquema completo para instalaciones nuevas. No contiene instrucciones DROP. `create_all` por sí solo no modifica tablas existentes.

En otra terminal:

```powershell
npm.cmd ci
npm.cmd run dev
```

Abre `http://localhost:5173`. Usa este host también para iniciar sesión: Vite reenvía `/api` a FastAPI. La documentación interactiva está en `http://127.0.0.1:8000/docs` y la comprobación de conexión en `/api/health`. Para probar escrituras autenticadas desde Swagger, configura temporalmente `FRONTEND_ORIGIN=http://127.0.0.1:8000`; restablece el origen del frontend después.

## Uso y conservación de datos

Solo editar, guardar y eliminar solicitan confirmación mediante un modal propio de Navishop. El fondo se oscurece y el usuario elige **Sí, editar/guardar/eliminar** o **No, cancelar**. Escape cancela; el foco queda dentro del modal y vuelve al control de origen al cerrarlo. Cancelar no envía la operación a la API; las imágenes del formulario se suben después de confirmar el guardado. El guardado incluye registrar un negocio/producto y guardar un enlace de video. Iniciar/cerrar sesión, registrarse como usuario, cambiar preferencias o estados de promoción, importar y cancelar formularios no muestran confirmación. No se utiliza `window.confirm`.

Pruebas de la decisión del modal: `node --test tests/confirmation.test.mjs`. Comprueban cancelación sin cambios, ejecución única al confirmar, bloqueo de solicitudes duplicadas y restricción a las tres acciones admitidas.

1. Registra una cuenta con contraseña de 12 caracteres como mínimo.
2. Con una cuenta personal puedes acceder a Inicio, Negocios, Videos y Promociones. Desde **Registrar mi negocio** completas el formulario y activas tu cuenta de negocios al guardarlo. Después podrás administrar negocios, productos, horarios, promociones y videos. Cada propietario administra exclusivamente sus registros; el catálogo requiere iniciar sesión.
3. Para los registros anteriores, abre el mismo navegador, perfil y origen donde los guardaste. En **Mi panel → Importar mis datos locales**, revisa el conteo y confirma. La importación es transaccional y repetible por cuenta sin duplicados; nunca vacía localStorage. Un producto sin negocio en el lote produce un error y revierte todo el lote. Un JSON inválido se informa sin borrarlo. Los datos locales anteriores no tienen propietario verificable: importa solo tus registros.
4. El catálogo de ejemplo original se conserva en `src/data`. Puedes importarlo voluntariamente; sus direcciones son pendientes de verificar y no tienen coordenadas inventadas. Los registros de ejemplo importados pertenecen a tu cuenta.
5. Selecciona las imágenes desde tu PC mediante el selector de archivos. El registro de negocios solicita una foto de fachada; el logo es opcional. Los productos también permiten seleccionar una imagen. Se muestra una vista previa antes de guardar. Se admiten JPG, PNG y WebP de hasta 5 MB y 20 megapíxeles. Las imágenes anteriores por URL siguen funcionando y se conservan al editar si no seleccionas otra foto.
6. Registra latitud y longitud juntas para mostrar el mapa OpenStreetMap del negocio. Para la referencia configurable de TECBA, copia `.env.example` a `.env`, completa `VITE_TECBA_NAME`, `VITE_TECBA_LATITUDE` y `VITE_TECBA_LONGITUDE` y reinicia Vite. Se muestra en el catálogo. La sede exacta sigue pendiente; no se calculan distancias ni se afirma que una ubicación esté verificada. El mapa y las fotografías externas necesitan Internet.

Eliminar un negocio con productos está bloqueado para evitar borrar productos en cascada. El usuario debe eliminar primero cada producto y confirmar las acciones.

## Imágenes y formulario de negocios

El formulario organiza datos principales, horario y fotos. Teléfono, correo, dirección y descripción se muestran en el detalle público del negocio, junto con su logo y enlace de mapa. El horario permite cierres posteriores a medianoche. Los campos nuevos son opcionales en la API para mantener compatibilidad con los registros/importaciones anteriores.

`POST /api/imagenes` requiere sesión y recibe un archivo multipart. El servidor verifica el contenido real, limita tamaño y resolución, lo convierte a WebP y elimina metadatos EXIF. Se guardan archivos con identificadores aleatorios en `backend/uploads/<usuario>/`; MySQL guarda su ruta. Las imágenes son públicas para mostrar el catálogo, y Vite las sirve mediante el proxy `/api/uploads`. No se eliminan imágenes antiguas al reemplazarlas ni al cancelar un formulario. Incluye `backend/uploads/` en tus copias de seguridad junto con MySQL; la carpeta se excluye de Git. En producción configura también un límite de tamaño de peticiones en el proxy.

Después de actualizar dependencias, reinicia FastAPI. El inicio o `python -m backend.init_db` aplica los nuevos campos a la base sin borrar registros. `backend/schema.sql` es para instalaciones nuevas; para actualizar una instalación existente usa el inicializador o el arranque de la API.

## Seguridad de acceso

Contraseñas con scrypt y sal aleatoria por usuario. Sesiones aleatorias de ocho horas, guardadas como SHA-256 en la base; cookie HttpOnly y SameSite=Lax, revocada al cerrar sesión. Validación de Origin en escrituras con cookie para prevenir CSRF y CORS limitado al origen configurado. No se guardan contraseñas ni tokens en localStorage. El registro no permite conceder permisos administrativos; se habilitan mediante un comando local.

Para producción usa HTTPS, `COOKIE_SECURE=true`, limita intentos de acceso en el proxy, sirve frontend y `/api` desde el mismo origen, limita permisos del usuario MySQL y realiza copias de seguridad. El servidor de Vite es para desarrollo. `npm.cmd run build` genera `dist`; el servidor final debe reenviar `/api` al backend y resolver las rutas React hacia `index.html`. No uses `DATABASE_URL` de pruebas para producción.

## Verificación

```powershell
# Desde Proyecto React: SQLite en memoria, sin tocar MySQL
.\.venv\Scripts\python -m pytest backend/tests -q -p no:cacheprovider
npm.cmd run lint
npm.cmd run build
```

Las pruebas de API cubren registro, correos duplicados, login incorrecto/correcto, cookie, sesión y logout; creación/edición/eliminación; acceso entre propietarios; promociones; validación de imágenes/coordenadas; CSRF e importación atómica sin duplicados. Esta suite usa SQLite en memoria; la conexión, las tablas y los endpoints de lectura también se comprobaron con MySQL real. Queda pendiente el recorrido visual completo y las escrituras desde la interfaz sobre MySQL. Existe una advertencia de deprecación de Starlette sobre el cliente de pruebas httpx, que no impide ejecutar la suite.

También se verificó un recorrido HTTP real por `Vite → /api → FastAPI` con SQLite en memoria: página inicial, health, registro, cookie/sesión, negocio, producto, promoción, catálogo y cierre de sesión. Los servidores temporales se detuvieron después y esos datos de prueba desaparecieron. No hubo un navegador conectado disponible para comprobar visualmente escritorio/móvil.

## Organización y respaldo

Relaciones: `users` 1:N `businesses`, `businesses` 1:N `products`, `users` 1:N `sessions`. La promoción se conserva como estado booleano `products.promocion`, igual que en la aplicación original: activa/desactiva el destacado del producto, sin fechas ni precios promocionales separados. Propietarios y permisos se resuelven mediante `businesses.owner_id`. Los identificadores de importación tienen restricciones únicas por propietario/negocio. Los precios usan DECIMAL(10,2) y las ubicaciones DECIMAL(10,7).

- `backend/main.py`: API y permisos; `models.py`: tablas; `schemas.py`: validaciones; `security.py`: contraseñas y sesiones; `database.py`: configuración.
- `src/api.js`, `context.js`, `components/LabProvider.jsx`: conexión y estado compartido.
- `components/EntityForm.jsx`, `ManageEntities.jsx`, `AuthForm.jsx`: formularios reutilizables; páginas existentes conservan sus rutas.
- `components/LegacyImport.jsx`: importación voluntaria; `LocationMap.jsx`: mapa.
- `backend/tests/test_api.py`: pruebas aisladas.

Respaldo previo a los cambios: commit `97fed42`, etiqueta `respaldo-inicial`. Para inspeccionarlo sin modificar tu trabajo usa `git show respaldo-inicial:ruta/del/archivo` o crea otra carpeta con `git worktree add ../design-lab-respaldo respaldo-inicial`. No uses `git reset --hard` para consultarlo.


## Barra lateral y videos

### Administración del sistema

#### Moderación, avisos y revisión

Al suspender, archivar, restaurar o eliminar un negocio, el superadmin debe escribir un **motivo visible para el propietario**. Puede añadir una **nota interna**, accesible únicamente desde administración. El formulario se abre en el panel y solicita confirmación antes de guardar la decisión.

- **Suspendido:** oculto para otros usuarios; su propietario puede corregir el negocio y contenido y enviar una solicitud de revisión.
- **Archivado:** oculto y de solo lectura para su propietario; puede solicitar restauración. El administrador conserva sus herramientas de gestión.
- **Eliminado definitivamente:** se conserva la decisión en el historial del propietario, pero no el negocio borrado. La cuenta queda sin permiso de registrar o importar otro hasta recibir autorización. Puede pedirla desde **Estado y solicitudes**, o el superadmin puede concederla desde **Usuarios → Autorizar** con motivo obligatorio. Autorizar un registro nuevo no recupera el negocio eliminado ni permite tener más de uno.

El propietario ve un aviso persistente en su espacio administrativo, la sección **Estado y solicitudes** y una campana de **Notificaciones**. Se actualizan al entrar, recuperar el foco y cada 30 segundos mientras la sesión está abierta; no se envían correos ni notificaciones push. Puede marcar cada aviso como leído y cargar notificaciones anteriores. La decisión, su motivo y las respuestas permanecen accesibles aunque el negocio ya no exista. El motivo original y la fecha se muestran en el historial. No se exponen notas internas a usuarios ordinarios.

Solo se permite una solicitud pendiente por negocio/propietario, o una de autorización de registro por cuenta. El superadmin la aprueba o rechaza en **Solicitudes**, con respuesta obligatoria. Aprobar una revisión/restauración reactiva el negocio; aprobar una solicitud posterior a eliminación solo concede permiso para registrar otro. Rechazar conserva el estado y muestra la respuesta. Si cambia el estado o propietario mientras hay una solicitud pendiente, se cierra para evitar resolver una decisión obsoleta. Las autorizaciones manuales también cierran las solicitudes de permiso pendientes.

Las tablas `moderation_events`, `review_requests` y `notifications` se guardan en MySQL. Los historiales conservan el identificador y el nombre del negocio como referencia, sin clave foránea que impida conservarlos tras un borrado. La restricción única de solicitudes pendientes y las verificaciones de propiedad se aplican en el backend. Ningún endpoint público permite cambiar el permiso `puede_registrar`.

La migración `migrate_moderation` agrega el permiso de registro por defecto y registra una explicación para negocios previamente suspendidos o archivados que no tenían historial, sin inventar un motivo original. La fecha de esas entradas corresponde a su incorporación al historial. No reconstruye decisiones de negocios eliminados antes de esta función. El inicio de FastAPI o `python -m backend.init_db` aplica la migración sin borrar usuarios ni negocios. Respaldo previo: `0e1a937`, etiqueta `respaldo-antes-moderacion`.

Validación: 24 pruebas de API aprobadas, incluida privacidad de notas, una sola solicitud pendiente, revisión rechazada/aprobada, archivo de solo lectura, solicitudes obsoletas, avisos privados y permisos tras eliminación. También pasan ESLint y la compilación. La revisión visual de este flujo queda pendiente en el navegador.

El administrador del sistema es un permiso independiente (`users.is_admin`), adicional al tipo de cuenta personal o de negocios. Después de iniciar sesión entra a `/admin` y obtiene una barra lateral con Panel del sistema, Todos los negocios, Usuarios, Contenido, Historial y Mi cuenta. Puede explorar la plataforma con **Ver como cliente** y regresar a su panel. Las rutas de React y todos los endpoints `/api/admin/*` verifican el permiso; el registro y la edición de perfil nunca pueden concederlo.

Para habilitar una cuenta **ya registrada**, desde una terminal local de confianza en `Proyecto React`:

```powershell
.\.venv\Scripts\python -m backend.init_db
.\.venv\Scripts\python -m backend.manage_admin --email CORREO_DE_LA_CUENTA
```

Sustituye `CORREO_DE_LA_CUENTA` por el correo real. No se crean contraseñas ni usuarios predeterminados. El comando revoca las sesiones anteriores de la cuenta y registra la habilitación en el historial; después hay que iniciar sesión de nuevo. Debe ejecutarlo exclusivamente quien tenga acceso autorizado al servidor y a la configuración MySQL. No existe un botón público para hacerse administrador.

**Negocios:** crear y editar negocios asignando una cuenta propietaria registrada. Cada propietario sigue limitado a un negocio, incluso si la creación la realiza un administrador. La asignación activa el tipo de cuenta de negocios del propietario, no el del administrador. Se puede transferir la propiedad a otra cuenta sin negocio. El propietario anterior conserva su cuenta, pero pierde los permisos sobre ese negocio.

**Estados:** `activo`, `suspendido`, `archivado`. Suspender o archivar oculta el negocio y sus productos/promociones/videos del catálogo para otros usuarios. Su propietario puede corregir la información si está suspendido; si está archivado, conserva acceso de solo lectura. Ve el estado y motivo en su panel. No puede reactivarlo ni eliminarlo para eludir la suspensión. Las URLs de imágenes ya publicadas siguen disponibles; cambiar el estado no elimina archivos.

**Borrado definitivo:** solo desde administración, después de archivar el negocio y retirar sus productos y enlaces de video. No hay borrado en cascada ni eliminación de imágenes. Archivar permite conservar todo y restaurarlo después.

**Usuarios:** consultar cuentas y su negocio asignado, sin exponer contraseñas. No se habilita eliminación de usuarios ni cambio de roles desde la interfaz. **Contenido:** crear, editar y eliminar productos y enlaces de video de cualquier negocio y cambiar promociones. **Historial:** últimas 100 acciones administrativas, con administrador, fecha UTC, operación y recurso; se guarda en `audit_logs` en la misma transacción que cada cambio. No se registran contraseñas, tokens ni credenciales MySQL.

La migración `migrate_admin` agrega el permiso y estado por defecto sin borrar registros: las cuentas existentes permanecen sin permisos administrativos hasta habilitarlas explícitamente, y los negocios existentes quedan activos. El inicio de FastAPI o el inicializador crea también `audit_logs`. Respaldo previo: `65a46f8`, etiqueta `respaldo-antes-admin`.

### Mi cuenta y perfil

La vista `/mi-cuenta` presenta una tarjeta con nombre, correo, avatar y tipo de cuenta. **Editar perfil** permite cambiar el nombre y seleccionar una foto local con el mismo validador JPG/PNG/WebP de hasta 5 MB. La foto se guarda en `backend/uploads/` y su ruta en `users.avatar`. La edición de correo no está incluida; se muestra como dato de identificación de la cuenta. El avatar también se muestra en la barra lateral.

Las secciones de configuración se despliegan al pulsarlas. **Preferencias** guarda la reducción de animaciones en `users.reducir_movimiento` y la aplica a toda la interfaz. **Privacidad** explica qué datos de cuenta y de negocio se muestran. **Seguridad** informa sobre la sesión y permite cerrarla. **Cuenta de negocios** lleva a activar o administrar el único negocio de la cuenta. La importación de datos anteriores sigue disponible en una sección desplegable.

`PATCH /api/auth/profile` actualiza exclusivamente el perfil de la sesión actual. No admite cambiar correo, contraseña, identificador ni tipo de cuenta. Las fotos deben ser archivos ya subidos por ese usuario. La migración `migrate_profile` añade los campos sin borrar datos; se ejecuta al iniciar FastAPI o mediante `python -m backend.init_db`. Respaldo previo: `2898a30`, etiqueta `respaldo-antes-perfil`.

### Pantalla de bienvenida

La dirección principal `/` muestra una bienvenida a pantalla completa, con identidad morada, fotografía urbana ilustrativa y el botón **Iniciar sesión**. No tiene barra lateral, catálogo ni opción de omitir. El enlace secundario permite crear una cuenta. Login y registro comparten el fondo y se presentan fuera de la interfaz interna.

El inicio del catálogo está en `/inicio` y requiere sesión. Después de autenticarse, una cuenta personal entra a `/inicio` y una cuenta de negocios a `/dashboard`, salvo que se recupere una página protegida solicitada. Si ya hay una sesión válida, la bienvenida sigue apareciendo en `/` y **Iniciar sesión** permite continuar al destino de su cuenta sin pedir otra contraseña.

Fondo local: `public/welcome-city.jpg`, fotografía urbana de [Unsplash](https://images.unsplash.com/photo-1486406146926-c627a92ad1ab), ilustrativa y sin relación con una sede específica de TECBA. La capa morada se aplica con CSS. Respaldo previo: `1847fbf`, etiqueta `respaldo-antes-bienvenida`.

### Cuentas personales y cuentas de negocios

Solo registro e inicio de sesión son vistas públicas. Al entrar sin sesión a una página protegida se abre el login; después se recupera la ruta y sus filtros. Las cuentas nuevas son personales. Inicio, Negocios, Videos y Promociones requieren sesión también en sus endpoints de datos. La expiración de la sesión vuelve a cerrar las vistas privadas y limpia el catálogo en memoria.

**Mi cuenta** muestra nombre, correo y tipo de cuenta. **Registrar mi negocio** abre `/activar-negocio`, explica la activación gratuita y lleva al formulario existente. El primer negocio y `users.tipo_cuenta = 'negocios'` se guardan en la misma transacción. Cancelar o fallar una validación deja la cuenta personal. No se puede elegir un tipo privilegiado durante el registro de usuario. Al activar se habilitan Mi panel, Mi negocio, Mis productos, Mis promociones y Mis videos. Los botones de creación siguen disponibles dentro de esas vistas.

La API exige cuenta de negocios y propiedad para modificar negocios, productos, promociones y videos. Las imágenes se pueden subir con una cuenta personal para completar el primer formulario: subir una imagen no activa la cuenta. Los archivos de imagen siguen teniendo rutas públicas para compatibilidad; las vistas y los datos del catálogo requieren sesión. El administrador del sistema dispone de endpoints separados con permisos propios.

La migración `migrate_account_types` agrega el campo sin borrar usuarios y convierte en cuentas de negocios a los propietarios existentes. Importar un negocio anterior también activa la cuenta en la misma transacción; una importación vacía o fallida no activa nada. Cada cuenta puede tener un solo negocio. Eliminar el negocio no desactiva la cuenta de negocios.

La restricción única `uq_business_owner` en MySQL impide crear dos negocios con el mismo propietario, incluso con solicitudes simultáneas. La API devuelve 409 cuando la cuenta ya tiene uno y permite seguir editándolo. La importación permite seleccionar un solo negocio y sus productos; repetir el mismo lote sigue siendo válido, pero importar otro negocio se rechaza. Los datos originales del navegador se conservan.

`migrate_single_business` añade la restricción a instalaciones existentes. Si encuentra cuentas con varios negocios, se detiene con un mensaje sin borrar ni fusionar registros: esos casos requieren decidir cómo conservarlos antes de continuar. Respaldo anterior: `3db7fa8`, etiqueta `respaldo-antes-negocio-unico`.

El arranque de FastAPI y `python -m backend.init_db` aplican esta migración. Respaldo previo: `4e6142c`, etiqueta `respaldo-antes-tipos-cuenta`. La suite incluye registro personal, activación, validación fallida, protección del catálogo, separación de propietarios, migración de cuentas existentes e importación atómica.

Las cuentas personales tienen Inicio, Negocios, Videos y Promociones en la barra superior, junto al buscador y el acceso a Mi cuenta. No tienen barra lateral y utilizan todo el ancho del contenido; pueden cerrar sesión desde la cabecera y activar su negocio desde Mi cuenta.

Las cuentas de negocios entran por defecto a **Mi panel** después del login. Su cabecera administrativa no muestra las cuatro pestañas ni el buscador del catálogo. **Ver como cliente** abre `/inicio`: muestra las pestañas de exploración, oculta la barra lateral y permite ver el catálogo con la misma cuenta. **Volver a mi panel** recupera las herramientas administrativas. Este modo se deduce de la ruta, funciona al recargar o usar Atrás y no modifica `tipo_cuenta` ni los permisos. Los enlaces directos al catálogo siguen disponibles para propietarios. Respaldo previo: `a41e21a`, etiqueta `respaldo-antes-vista-cliente`.

La barra lateral es exclusiva de las cuentas de negocios: Mi panel, Mi cuenta, Mi negocio, Mis productos, Mis promociones y Mis videos. En móvil se abre con el botón de menú; se cierra al elegir una opción, pulsar Escape o tocar fuera del menú. Las pestañas de exploración permanecen en la cabecera, en una segunda fila desplazable en pantallas pequeñas. El buscador superior abre el catálogo con el texto consultado. Respaldo previo a esta separación: `b480258`, etiqueta `respaldo-antes-topbar-personal`.

En **Mis videos**, el propietario selecciona uno de sus negocios e introduce título y enlace HTTPS. Puede editar o quitar sus enlaces. La pestaña pública **Videos** permite filtrar por negocio y cargar más resultados, en páginas de 12. El detalle del negocio también enlaza a sus videos.

Se integran los reproductores oficiales de YouTube (incluye Shorts y directos) y TikTok mediante iframe, sin claves API. Se cargan cuando el visitante pulsa **Ver video**. La API de Navishop valida dominios/identificadores y genera la dirección del reproductor; no descarga videos ni ejecuta HTML proporcionado por usuarios. MySQL guarda solamente `id`, `negocioId`, `titulo` y `url` en la tabla `videos`. Los archivos originales permanecen en la plataforma. No se siguen enlaces arbitrarios desde el servidor.

Para TikTok usa `https://www.tiktok.com/@usuario/video/ID`; abre primero los enlaces cortos `vm.tiktok.com`/`vt.tiktok.com` en la plataforma y copia la dirección completa. En YouTube se admiten `watch?v=ID`, `youtu.be/ID`, `/shorts/ID`, `/live/ID` y `/embed/ID`. Otras plataformas todavía no están integradas. Los videos privados, eliminados o con inserción restringida pueden no reproducirse; siempre se ofrece un enlace a la plataforma original. La disponibilidad final depende del proveedor y de la conexión a Internet.

El arranque del backend o `python -m backend.init_db` crea la tabla `videos` sin borrar registros existentes. No se permite eliminar un negocio que aún tenga productos o enlaces de video. Respaldo previo: `76b1aed`, etiqueta `respaldo-antes-sidebar-videos`.

Verificación de esta etapa: once pruebas de API aprobadas, ESLint y compilación aprobados; tabla y endpoint `/api/videos` comprobados con MySQL real. La suite prueba enlaces, permisos, edición, eliminación, filtros y paginación. La reproducción real en cada plataforma y la revisión visual quedan pendientes en un navegador conectado.

Reproductores utilizados: [YouTube](https://developers.google.com/youtube/player_parameters) y [TikTok](https://developers.tiktok.com/docs/en/embed-player).

## Carpeta unificada

React se ejecuta directamente desde `Proyecto React`: `src/`, `public/`, `package.json` y `vite.config.js` están en la raíz. FastAPI permanece en `backend/`. Ejecuta `npm.cmd run dev` en la raíz e inicia FastAPI en otra terminal situada en esa misma carpeta.

Respaldo anterior al traslado: commit `6685ab8`, etiqueta `respaldo-antes-unificar`. Los archivos Node que antes estaban en la raíz y el README/gitignore anterior del frontend se conservan en `.reorganization-backup/`, excluida de Git. La configuración de MySQL sigue en `backend/.env`.

Protección administrativa: ningún superadmin puede restringir su propio permiso de registro, tampoco mediante la eliminación administrativa de su negocio (puede mantenerlo archivado). Usuarios deshabilita ese control y la API rechaza el intento sin guardar cambios. Se protege también al último administrador frente a restricciones. El rol administrativo no puede retirarse ni la cuenta eliminarse mediante la API o la interfaz; el comando local de administración únicamente concede el rol.

Crear usuarios: el superadmin dispone de Usuarios → Agregar usuario. Solicita nombre, correo único y contraseña de al menos 12 caracteres con confirmación. Crea cuentas personales sin permisos administrativos; después se puede asignar un negocio desde Negocios. La contraseña se almacena con hash y no se registra en el historial. La creación no inicia sesión como el usuario nuevo ni cambia la sesión del superadmin.

Eliminación y tipo de cuenta: al eliminar voluntariamente un negocio activo (sin productos ni videos), la cuenta vuelve a personal y se establece users.registro_disponible_desde a 15 días exactos desde la eliminación, en UTC. El mensaje de confirmación avisa del plazo y Estado y solicitudes muestra la fecha en hora local. El servidor bloquea creación, importación y asignación administrativa hasta ese instante; una autorización no acorta el plazo. Al vencer no requiere aprobación si puede_registrar sigue habilitado. La eliminación por superadmin también convierte la cuenta a personal, pero exige autorización administrativa para otro registro; no impone una nueva espera de 15 días. Se conservan historial y notificaciones. El rol de superadmin permanece independiente. La migración añade un campo nullable y no aplica esperas retroactivas.

Excepción a la espera: Superadmin → Usuarios → Espera de registro → Levantar espera permite retirar un plazo vigente con motivo obligatorio, confirmación, notificación al titular y auditoría de la fecha anterior. No cambia puede_registrar, el tipo de cuenta ni la regla de un negocio por propietario. Si la cuenta está restringida, también es necesario Autorizar. No permite levantar esperas inexistentes o vencidas.
