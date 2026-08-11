# AGENTS.md

Juego vanilla (HTML/CSS/JS) sin dependencias ni build. Solo 3 archivos: `index.html`, `script.js`, `style.css`.

## Verificación
- No hay npm, tests ni linter. Único chequeo disponible: `node --check script.js` (sintaxis).
- Para probar en navegador no se necesita build; sirve abrir `index.html` o cualquier servidor estático.

## Arquitectura
- `verificar()` es el único punto de entrada de respuestas (botones e input de teclado llaman ahí); la lógica nueva de juego se engancha dentro de él.
- Modelo de notas: array `notas` con `paso` de -6 a 6. Un mismo nombre se repite (Do..La); "Do grave"/"Do agudo" lo decide `etiquetaNota()`.
- `registroErrores` está claveado por `paso` (string), NO por nombre. `cargarEstado()` filtra solo claves con paso válido, por lo que cambiar el modelo reinicia ese ranking.
- Dibujo: `centerX = canvas.width/2`, `middleLineY = canvas.height/2` y `lineSpacing` se ajustan al tamaño del canvas, pero `staffInicio=40` y `staffFin=320` están HARDCODEADOS. Si cambias `width` del canvas en `index.html`, revisa esas constantes (también `radioNota`/`extensionLinea`).
- Audio: Web Audio API (osciladores). `FRECUENCIAS` mapea `paso`→Hz. `sonidoAcierto()`/`sonidoError()` tocan la nota actual (`notaActual`); `tocarTono` respeta `sonidoActivado`.
- Contrarreloj: arranca automáticamente en la primera respuesta dentro de `verificar()`. `actualizarVisibilidadCompartir()` controla los botones de compartir: el de resultados requiere partidas; el de contrarreloj solo se muestra dentro de `#panelCrono` (modo activo) y con ranking.

## Persistencia (localStorage)
- `adivinaNotaStats`: marcadores, `registroErrores`, `historial`, `ultimoRegistro`.
- `adivinaNotaPrefs`: sonido, tema, modo contrarreloj.
- `adivinaNotaRanking`: top 5 tiempos de contrarreloj.

## Entrada por teclado
- `#entradaNota` está oculto (fuera de pantalla); Space/Enter confirman la nota escrita. Un click en el documento y el foco de la ventana lo reenfocan. `esMovil` (detección por userAgent) desactiva el auto-foco.

## GitHub Pages
- Desplegado en https://danicj.github.io/adivina-nota desde `main`; push = deploy.
- Gotcha real: el navegador cachea los assets; si tras un push "no funciona", probar en incógnito o limpiar caché antes de tocar código.

## Convenciones
- Commits en español, minúsculas, descriptivos (ver `git log`).
- Comentarios en español.
