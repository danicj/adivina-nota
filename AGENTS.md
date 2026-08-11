# AGENTS.md

Juego vanilla (HTML/CSS/JS) sin dependencias ni build. Solo 3 archivos: `index.html`, `script.js`, `style.css`.

## Verificación
- No hay npm, tests ni linter. Único chequeo disponible: `node --check script.js` (sintaxis).
- Para probar en navegador no se necesita build; sirve abrir `index.html` o cualquier servidor estático.

## Arquitectura
- `verificar()` es el único punto de entrada de respuestas (botones e input de teclado llaman ahí); la lógica nueva de juego se engancha dentro de él.
- Modelo de notas: `NOTAS_SOL` (Do4..La5, con Si4 en la línea central del pentagrama) y `NOTAS_FA` (E2..C4, con Re3 en la línea central). `notas` es un array derivado de `obtenerNotas()` según `claveActual` (sol/fa). Ambos usan pasos -6..6: el mismo `paso` ocupa la misma posición vertical en ambas claves, pero nombra notas DIFERENTES (así las notas de Sol y Fa ocupan líneas/huecos distintos). Un mismo nombre se repite; "Do grave"/"Do agudo" lo decide `etiquetaNota()`.
- `frecuenciaDePaso(paso)` reemplaza a `FRECUENCIAS` directamente (usa `FRECUENCIAS_SOL` o `FRECUENCIAS_FA` según `claveActual`); úsalo para tocar tonos.
- `registroErrores` está claveado por `clave:paso` (string, ej. `"sol:-6"`, `"fa:3"`), NO por nombre. Las claves antiguas sin ":" se migran a `sol:` en `cargarEstado()`, que valida con `esClavePasoValido()`. `actualizarRankingErrores()` muestra la nota fallada con un icono del glifo (𝄞/𝄢) indicando la clave. Los helpers `claveDeError()`/`notaDeError()`/`etiquetaNota(nota, clave)` son conscientes de clave.
- `erroresConsecutivos` se resetea en `nuevaNota()`; la respuesta "Era un X" solo se revela al 3er error seguido. Los errores 1º/2º muestran pista direccional (más aguda/grave) vía `pistaDireccional()`.
- Dibujo: `centerX = canvas.width/2`, `middleLineY = canvas.height/2` y `lineSpacing` se ajustan al tamaño del canvas, pero `staffInicio=40` y `staffFin=320` están HARDCODEADOS. Si cambias `width` del canvas en `index.html`, revisa esas constantes (también `radioNota`/`extensionLinea`). `dibujarPentagrama()` pinta el glifo de clave (𝄞/𝄢); su tamaño/posición por clave se ajusta en el objeto `glifo` (justo debajo de `staffFin`).
- Audio: Web Audio API (osciladores). `FRECUENCIAS_SOL`/`FRECUENCIAS_FA` mapean `paso`→Hz por clave. `sonidoAcierto()`/`sonidoError()` tocan la nota actual (`notaActual`); `tocarTono` respeta `sonidoActivado`.
- Contrarreloj: arranca automáticamente en la primera respuesta dentro de `verificar()`. `actualizarVisibilidadCompartir()` controla los botones de compartir: el de resultados requiere partidas; el de contrarreloj solo se muestra dentro de `#panelCrono` (modo activo) y con ranking.
- `esMovil` usa `matchMedia("(pointer: coarse)")` (con regex como fallback). `reduceMotion` (prefers-reduced-motion) desactiva confeti y sacudida.
- El `<select>` de clave y el botón de reproducir viven en `.configuracion`. El click global que reenfoca `#entradaNota` excluye los `<select>` (o el desplegable se cerraría al instante).

## Persistencia (localStorage)
- `adivinaNotaStats`: marcadores, `registroErrores`, `historial`, `ultimoRegistro`.
- `adivinaNotaPrefs`: sonido, tema, modo contrarreloj, `claveActual`.
- `adivinaNotaRanking`: top 5 tiempos de contrarreloj.

## Entrada por teclado
- `#entradaNota` está oculto (fuera de pantalla); Space/Enter confirman la nota escrita. Un click en el documento y el foco de la ventana lo reenfocan. `esMovil` (detección por userAgent) desactiva el auto-foco.

## GitHub Pages
- Desplegado en https://danicj.github.io/adivina-nota desde `main`; push = deploy.
- Gotcha real: el navegador cachea los assets; si tras un push "no funciona", probar en incógnito o limpiar caché antes de tocar código.
- Cache-busting: los assets se referencian versionados en `index.html` (`style.css?v=N`, `script.js?v=N`). Al tocar `style.css` o `script.js`, sube el `v=` para que los usuarios no vean la versión cacheada.

## Convenciones
- Commits en español, minúsculas, descriptivos (ver `git log`).
- Comentarios en español.
