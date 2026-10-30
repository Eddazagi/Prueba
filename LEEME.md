# U.E. Fabricio Ojeda · Gestión estudiantil

Aplicación web hecha a la medida de la **U.E. Fabricio Ojeda** (Boconó, Trujillo) para administrar la matrícula y la caracterización de estudiantes sin depender de Excel.

## Cómo abrirla

1. Entra a la carpeta `liceo`.
2. Haz doble clic en **`index.html`**.
3. Se abre en el navegador (Chrome, Edge, Brave o Firefox). No necesita internet ni instalación.

> Si mueves la app a otro equipo, copia la **carpeta completa** `liceo` (no solo el `index.html`): los datos, el logo y los estilos viven en `assets/`.

## Cómo empezar

La app arranca **vacía**, tal como la pediste, y con una sección **A** creada en cada año como punto de partida:

1. Pulsa **“Añadir estudiante”** y completa la ficha (nombre, año, sección, sexo, cédula V- o E-, fecha y lugar de nacimiento, representante, teléfono, dirección y observaciones).
2. La **edad se calcula automáticamente** al elegir la fecha de nacimiento.
3. Ve a **Matrícula** y escribe la matrícula inicial de cada año (masculino y femenino). Se guarda sola.
4. La matrícula actual se calcula automáticamente con los estudiantes registrados.
5. En **Configuración → Secciones** puedes añadir o eliminar grupos como 1° A, 1° B, 1° C, etc.

En **Configuración → Datos** tienes la opción de recuperar los **106 estudiantes del Excel original** si quieres partir de esa información.

## Qué incluye

- **Resumen tipo dashboard**: hora y fecha en vivo, KPIs, estudiantes por año, composición por sexo, procedencia, estado de las fichas y actividad reciente.
- **Directorio**: búsqueda por nombre, cédula, representante, teléfono, dirección u observaciones; filtros por año, sección y sexo; orden por nombre, año, edad o últimos actualizados.
- **CRUD completo**: añadir, editar y eliminar estudiantes con validación y confirmación.
- **Ficha lateral**: datos completos, llamada, WhatsApp, copiar ficha y observaciones.
- **Matrícula inicial manual**: editable por año y sexo, con totales, variación y comparativo contra la matrícula actual.
- **Secciones por año**: crea o elimina grupos (A, B, C…), asigna cada estudiante y filtra el directorio por sección.
- **Configuración**:
  - Temas **Claro**, **Oscuro** y **Negro** (OLED).
  - Nombre de la institución, ubicación y año escolar.
  - Filas por página del directorio.
  - Exportar respaldo `.json`, restaurarlo y exportar a CSV/Excel.
  - Recuperar los datos del Excel original y limpiar todos los estudiantes.
- **Extras**: exportar CSV, imprimir el listado, atajos `/` y `Esc`, logo institucional y diseño adaptable a celular.

## Atajos

- `/` enfoca la búsqueda.
- `Esc` cierra la ficha o el modal activo.
- `Enter` sobre una fila abre la ficha.

## Datos y privacidad

- Todo se guarda en el **almacenamiento local del navegador**. No hay servidor, cuentas ni envío de datos.
- El archivo contiene datos personales reales (cédulas, teléfonos, direcciones). **No publiques esta carpeta en internet** ni la compartas sin autorización.
- Si borras los datos del navegador, se pierde la información. Usa **Configuración → Exportar respaldo** con frecuencia.
- Los 106 estudiantes del Excel original están en `assets/legacy.js` y solo se cargan si pulsas el botón de recuperación.

## Estructura

```
liceo/
├── index.html          → interfaz
├── LEEME.md
└── assets/
    ├── styles.css      → diseño, temas, animaciones y responsive
    ├── app.js          → CRUD, dashboard, matrícula, configuración
    ├── logo.webp       → escudo institucional
    └── legacy.js       → datos opcionales del Excel original
```

## Notas

- Versión 2.1 · 2026.
- La matrícula inicial es manual; la actual se recalcula con los estudiantes.
- Cada estudiante pertenece a un año y a una sección (o queda “sin sección” si no hay grupos).
- Las edades y la fecha se calculan con el reloj del equipo.
- El saludo del panel cambia automáticamente entre “Buenos días”, “Buenas tardes” y “Buenas noches”.

## Próximos pasos posibles

- Importar directamente un Excel nuevo.
- Adjuntar fotografías o documentos por estudiante.
- Reportes PDF con el membrete de la institución.
- Varios usuarios o respaldo automático en la nube.
