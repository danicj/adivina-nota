const canvas = document.getElementById("pentagrama");
const ctx = canvas.getContext("2d");
const entradaNota = document.getElementById("entradaNota");

const centerX = canvas.width / 2;
const lineSpacing = 32;
const middleLineY = canvas.height / 2;
const staffInicio = 40;
const staffFin = 320;
const radioNota = 15;
const extensionLinea = 24;

// ▶ AJUSTE VISUAL DEL GLIFO DE CLAVE (por clave)
// tam = altura FINAL del símbolo en píxeles (se normaliza en todos los
//       dispositivos). x = posición horizontal del centro.
// y   = posición vertical del centro (mayor = más abajo).
// Ajusta a ojo y recarga. Valores calibrados para el pentagrama actual.
const glifo = {
  sol: { tam: 150, x: staffInicio + 6, y: middleLineY + 10 },
  fa: { tam: 80, x: staffInicio + 6, y: middleLineY - 10 },
};

// Dibuja el glifo con altura fija `tam` (normaliza las métricas de fuente,
// que varían entre dispositivos: en Android la 𝄞/𝄢 se renderiza más grande).
function dibujarGlifo(clave) {
  const cfg = glifo[clave] || glifo.sol;
  const glyph = clave === "fa" ? "𝄢" : "𝄞";
  const base = 150; // fuente base para medir (independiente de tam)
  ctx.font = `${base}px "Noto Music", "Segoe UI Symbol", serif`;
  const m = ctx.measureText(glyph);
  const alto = m.actualBoundingBoxAscent + m.actualBoundingBoxDescent;
  const escala = alto > 0 ? cfg.tam / alto : 1;
  ctx.save();
  ctx.translate(cfg.x, cfg.y);
  ctx.scale(escala, escala);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = cssVar("--linea");
  ctx.fillText(glyph, 0, 0);
  ctx.restore();
}

const esMovil =
  window.matchMedia("(pointer: coarse)").matches ||
  /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const NOTAS_SOL = [
  { nombre: "Do", paso: -6 }, // Do4
  { nombre: "Re", paso: -5 }, // Re4
  { nombre: "Mi", paso: -4 }, // Mi4
  { nombre: "Fa", paso: -3 }, // Fa4
  { nombre: "Sol", paso: -2 }, // Sol4
  { nombre: "La", paso: -1 }, // La4
  { nombre: "Si", paso: 0 }, // Si4
  { nombre: "Do", paso: 1 }, // Do5
  { nombre: "Re", paso: 2 }, // Re5
  { nombre: "Mi", paso: 3 }, // Mi5
  { nombre: "Fa", paso: 4 }, // Fa5
  { nombre: "Sol", paso: 5 }, // Sol5
  { nombre: "La", paso: 6 }, // La5
];

const NOTAS_FA = [
  { nombre: "Mi", paso: -6 }, // Mi2 (E2)
  { nombre: "Fa", paso: -5 }, // Fa2 (F2)
  { nombre: "Sol", paso: -4 }, // Sol2 (G2)
  { nombre: "La", paso: -3 }, // La2 (A2)
  { nombre: "Si", paso: -2 }, // Si2 (B2)
  { nombre: "Do", paso: -1 }, // Do3 (C3)
  { nombre: "Re", paso: 0 }, // Re3 (D3), línea central
  { nombre: "Mi", paso: 1 }, // Mi3 (E3)
  { nombre: "Fa", paso: 2 }, // Fa3 (F3)
  { nombre: "Sol", paso: 3 }, // Sol3 (G3)
  { nombre: "La", paso: 4 }, // La3 (A3)
  { nombre: "Si", paso: 5 }, // Si3 (B3)
  { nombre: "Do", paso: 6 }, // Do4 (C4)
];

const FRECUENCIAS_SOL = {
  "-6": 261.63, // Do4
  "-5": 293.66, // Re4
  "-4": 329.63, // Mi4
  "-3": 349.23, // Fa4
  "-2": 392.0, // Sol4
  "-1": 440.0, // La4
  "0": 493.88, // Si4
  "1": 523.25, // Do5
  "2": 587.33, // Re5
  "3": 659.26, // Mi5
  "4": 698.46, // Fa5
  "5": 783.99, // Sol5
  "6": 880.0, // La5
};

// Frecuencias en clave de Fa (rango E2..C4, mismo índice de pasos que Sol)
const FRECUENCIAS_FA = {
  "-6": 82.41, // Mi2
  "-5": 87.31, // Fa2
  "-4": 98.0, // Sol2
  "-3": 110.0, // La2
  "-2": 123.47, // Si2
  "-1": 130.81, // Do3
  "0": 146.83, // Re3
  "1": 164.81, // Mi3
  "2": 174.61, // Fa3
  "3": 196.0, // Sol3
  "4": 220.0, // La3
  "5": 246.94, // Si3
  "6": 261.63, // Do4
};

const CLAVE_STATS = "adivinaNotaStats";
const CLAVE_PREFS = "adivinaNotaPrefs";
const CLAVE_RANKING = "adivinaNotaRanking";
const UMBRAL_SESION = 10; // Registro de progreso cada 10 notas respondidas
const MAX_SESIONES = 15;
const OBJETIVO_CRONO = 10;
const PENALIZACION_CRONO_MS = 5000;
const MAX_RANKING = 5;

const registroErrores = {};

function etiquetaNota(nota, clave = claveActual) {
  const base = clave === "fa" ? NOTAS_FA : NOTAS_SOL;
  const duplicada = base.filter((n) => n.nombre === nota.nombre).length > 1;
  if (!duplicada) return nota.nombre;
  return nota.paso <= 0 ? `${nota.nombre} grave` : `${nota.nombre} agudo`;
}

function claveDeError(clavePaso) {
  return clavePaso.includes(":") ? clavePaso.split(":")[0] : "sol";
}

function notaDeError(clavePaso) {
  const [clave, paso] = clavePaso.includes(":")
    ? clavePaso.split(":")
    : ["sol", clavePaso];
  const base = clave === "fa" ? NOTAS_FA : NOTAS_SOL;
  return base.find((n) => String(n.paso) === paso);
}

function esClavePasoValido(clavePaso) {
  const clave = claveDeError(clavePaso);
  const paso = clavePaso.includes(":") ? clavePaso.split(":")[1] : clavePaso;
  const base = clave === "fa" ? NOTAS_FA : NOTAS_SOL;
  return base.some((n) => String(n.paso) === paso);
}

let notaActual;
let notaAnterior = null;

let claveActual = "sol";
let notas = obtenerNotas();
let erroresConsecutivos = 0;

let aciertos = 0;
let errores = 0;
let racha = 0;
let mejorRacha = 0;
let sonidoActivado = true;
let temaOscuro = false;
let historial = [];
let ultimoRegistro = { aciertos: 0, errores: 0 };
let rankingTiempos = [];
let modoCronometro = false;
let cronometroActivo = false;
let cronoTiempoInicio = 0;
let cronoPenalizacion = 0;
let cronoCorrectas = 0;
let cronoTiempoFinal = 0;
let cronoIntervalo = null;
let ultimaPartidaCrono = null;

function obtenerNotas() {
  return claveActual === "fa" ? NOTAS_FA : NOTAS_SOL;
}

function frecuenciaDePaso(paso) {
  const tabla = claveActual === "fa" ? FRECUENCIAS_FA : FRECUENCIAS_SOL;
  return tabla[String(paso)];
}

// ---------- Tema ----------

function cssVar(nombre) {
  return (
    getComputedStyle(document.body).getPropertyValue(nombre).trim() || "#000000"
  );
}

function aplicarTema() {
  document.body.dataset.theme = temaOscuro ? "dark" : "light";
  document.getElementById("btnTema").textContent = temaOscuro ? "☀️" : "🌙";
}

function toggleTema() {
  temaOscuro = !temaOscuro;
  aplicarTema();
  guardarPrefs();
  redibujar();
  enfocar();
}

// ---------- Sonido (Web Audio API) ----------

let audioCtx = null;

function obtenerAudioCtx() {
  if (!audioCtx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (AC) audioCtx = new AC();
  }
  if (audioCtx && audioCtx.state === "suspended") audioCtx.resume();
  return audioCtx;
}

function tocarTono(frecuencia, duracion, tipo = "sine", volumen = 0.2) {
  if (!sonidoActivado) return;
  const ctx = obtenerAudioCtx();
  if (!ctx) return;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = tipo;
  osc.frequency.value = frecuencia;

  const t = ctx.currentTime;
  gain.gain.setValueAtTime(0, t);
  gain.gain.linearRampToValueAtTime(volumen, t + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + duracion);

  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(t);
  osc.stop(t + duracion + 0.05);
}

function sonidoAcierto() {
  if (!notaActual) return;
  tocarTono(frecuenciaDePaso(notaActual.paso), 0.7, "sine", 0.3);
}

function sonidoError() {
  if (!notaActual) return;
  tocarTono(frecuenciaDePaso(notaActual.paso), 0.4, "square", 0.1);
}

function reproducirNota() {
  if (!notaActual) return;
  tocarTono(frecuenciaDePaso(notaActual.paso), 0.7, "sine", 0.25);
}

function actualizarBotonSonido() {
  document.getElementById("btnSonido").textContent = sonidoActivado
    ? "🔊"
    : "🔇";
}

function toggleSonido() {
  sonidoActivado = !sonidoActivado;
  actualizarBotonSonido();
  guardarPrefs();
  if (sonidoActivado) sonidoAcierto();
  enfocar();
}

// ---------- Persistencia ----------

function guardarPrefs() {
  localStorage.setItem(
    CLAVE_PREFS,
    JSON.stringify({
      sonido: sonidoActivado,
      tema: temaOscuro,
      crono: modoCronometro,
      clave: claveActual,
    })
  );
}

function guardarEstado() {
  localStorage.setItem(
    CLAVE_STATS,
    JSON.stringify({
      aciertos,
      errores,
      racha,
      mejorRacha,
      registroErrores,
      historial,
      ultimoRegistro,
    })
  );
}

function cargarEstado() {
  try {
    const s = JSON.parse(localStorage.getItem(CLAVE_STATS));
    if (s) {
      aciertos = s.aciertos || 0;
      errores = s.errores || 0;
      racha = s.racha || 0;
      mejorRacha = s.mejorRacha || 0;
      if (s.registroErrores) {
        Object.entries(s.registroErrores).forEach(([k, v]) => {
          const clavePaso = k.includes(":") ? k : `sol:${k}`;
          if (esClavePasoValido(clavePaso)) registroErrores[clavePaso] = v;
        });
      }
      historial = Array.isArray(s.historial) ? s.historial : [];
      ultimoRegistro = s.ultimoRegistro || { aciertos: 0, errores: 0 };
    }
  } catch (e) {}

  try {
    const p = JSON.parse(localStorage.getItem(CLAVE_PREFS));
    if (p) {
      sonidoActivado = p.sonido !== false;
      temaOscuro = !!p.tema;
      modoCronometro = !!p.crono;
      claveActual = p.clave === "fa" ? "fa" : "sol";
    }
  } catch (e) {}

  notas = obtenerNotas();

  try {
    const r = JSON.parse(localStorage.getItem(CLAVE_RANKING));
    if (Array.isArray(r)) rankingTiempos = r;
  } catch (e) {}
}

function cambiarClave() {
  claveActual = document.getElementById("selectorClave").value;
  notas = obtenerNotas();
  guardarPrefs();
  redibujar();
  nuevaNota();
}

// ---------- Dibujo ----------

function dibujarPentagrama() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.lineWidth = 2;
  ctx.strokeStyle = cssVar("--linea");
  for (let i = -2; i <= 2; i++) {
    const y = middleLineY + i * lineSpacing;
    ctx.beginPath();
    ctx.moveTo(staffInicio, y);
    ctx.lineTo(staffFin, y);
    ctx.stroke();
  }

  // Glifo de clave (Sol o Fa) — tamaño/posición en el objeto `glifo` (arriba)
  dibujarGlifo(claveActual);
}

function yDesdePaso(paso) {
  return middleLineY - paso * (lineSpacing / 2);
}

function dibujarNota(nota, color) {
  const y = yDesdePaso(nota.paso);

  // Dibujar círculo de nota
  ctx.fillStyle = color || cssVar("--nota");
  ctx.beginPath();
  ctx.arc(centerX, y, radioNota, 0, Math.PI * 2);
  ctx.fill();

  // Dibujar líneas adicionales si es necesario
  if (nota.paso <= -6) {
    for (let p = -6; p <= nota.paso; p += 2) {
      const ly = yDesdePaso(p);
      ctx.beginPath();
      ctx.moveTo(centerX - extensionLinea, ly);
      ctx.lineTo(centerX + extensionLinea, ly);
      ctx.stroke();
    }
  }

  if (nota.paso >= 5) {
    for (let p = 6; p <= nota.paso; p += 2) {
      const ly = yDesdePaso(p);
      ctx.beginPath();
      ctx.moveTo(centerX - extensionLinea, ly);
      ctx.lineTo(centerX + extensionLinea, ly);
      ctx.stroke();
    }
  }
}

function redibujar() {
  dibujarPentagrama();
  if (notaActual) dibujarNota(notaActual);
}

// ---------- Animaciones ----------

function spawnConfetti() {
  if (reduceMotion) return;
  const colores = [
    "#f44336",
    "#e91e63",
    "#9c27b0",
    "#3f51b5",
    "#2196f3",
    "#009688",
    "#4caf50",
    "#ff9800",
    "#ffc107",
  ];

  for (let i = 0; i < 40; i++) {
    const pieza = document.createElement("div");
    pieza.className = "confeti";
    pieza.style.left = Math.random() * 100 + "vw";
    pieza.style.backgroundColor =
      colores[Math.floor(Math.random() * colores.length)];
    pieza.style.animationDuration = 1.4 + Math.random() * 1.2 + "s";
    pieza.style.animationDelay = Math.random() * 0.4 + "s";
    pieza.style.transform = `rotate(${Math.random() * 360}deg)`;
    document.body.appendChild(pieza);
    pieza.addEventListener("animationend", () => pieza.remove());
  }
}

// ---------- Juego ----------

function nuevaNota() {
  dibujarPentagrama();

  let nueva;
  do {
    nueva = Math.floor(Math.random() * notas.length);
  } while (nueva === notaAnterior);

  notaAnterior = nueva;
  notaActual = notas[nueva];
  erroresConsecutivos = 0;
  dibujarNota(notaActual);
  canvas.setAttribute(
    "aria-label",
    `Pentagrama con la nota ${etiquetaNota(notaActual)}`
  );

  const resultado = document.getElementById("resultado");
  resultado.textContent = "";
  resultado.className = "";

  actualizarMarcadores();
  actualizarRankingErrores();
  enfocar();
}

function pistaDireccional(respuesta) {
  const candidatas = notas.filter((n) => n.nombre === respuesta);
  if (candidatas.length === 0) return null;
  const masCercana = candidatas.reduce((mejor, n) =>
    Math.abs(n.paso - notaActual.paso) < Math.abs(mejor.paso - notaActual.paso)
      ? n
      : mejor
  );
  if (masCercana.paso === notaActual.paso) return null;
  return masCercana.paso < notaActual.paso ? "aguda" : "grave";
}

function verificar(respuesta) {
  const boton = document.querySelector(`button[data-nota="${respuesta}"]`);
  const resultado = document.getElementById("resultado");

  if (modoCronometro && cronoTiempoFinal === 0 && !cronometroActivo) {
    iniciarCronometro();
  }

  if (respuesta === notaActual.nombre) {
    boton.classList.add("correcto");
    spawnConfetti();
    aciertos++;
    racha++;
    if (racha > mejorRacha) mejorRacha = racha;
    if (cronometroActivo) {
      cronoCorrectas++;
      actualizarCronoProgreso();
      if (cronoCorrectas >= OBJETIVO_CRONO) detenerCronometro();
    }
    sonidoAcierto();
    resultado.textContent = "¡Correcto!";
    resultado.className = "resultado-correcto";
    actualizarMarcadores();
    registrarSesionSiProcede();
    guardarEstado();

    setTimeout(() => {
      boton.classList.remove("correcto");
      nuevaNota();
    }, 300);
  } else {
    boton.classList.add("incorrecto");
    errores++;
    racha = 0;
    erroresConsecutivos++;
    const kError = `${claveActual}:${notaActual.paso}`;
    registroErrores[kError] = (registroErrores[kError] || 0) + 1;
    if (cronometroActivo) cronoPenalizacion += PENALIZACION_CRONO_MS;
    sonidoError();
    if (!reduceMotion) {
      canvas.classList.remove("agitar");
      void canvas.offsetWidth;
      canvas.classList.add("agitar");
    }
    dibujarPentagrama();
    dibujarNota(notaActual, cssVar("--feedback-error"));
    if (erroresConsecutivos >= 3) {
      resultado.textContent = `Era un ${etiquetaNota(notaActual)}`;
    } else {
      const pista = pistaDireccional(respuesta);
      resultado.textContent = pista
        ? `Incorrecto. La nota es más ${pista}. Inténtalo de nuevo`
        : "Incorrecto. Inténtalo de nuevo";
    }
    resultado.className = "resultado-error";
    actualizarMarcadores();
    actualizarRankingErrores();
    registrarSesionSiProcede();
    guardarEstado();

    setTimeout(() => {
      boton.classList.remove("incorrecto");
    }, 300);
  }

  actualizarVisibilidadCompartir();
  enfocar();
}

// ---------- Contrarreloj ----------

function formatearTiempo(ms) {
  const total = Math.max(0, ms);
  const minutos = Math.floor(total / 60000);
  const segundos = Math.floor((total % 60000) / 1000);
  const decimas = Math.floor((total % 1000) / 100);
  return `${minutos}:${String(segundos).padStart(2, "0")}.${decimas}`;
}

function toggleCronometro() {
  if (cronometroActivo) detenerCronometro(true);
  modoCronometro = !modoCronometro;
  document
    .getElementById("panelCrono")
    .classList.toggle("oculto", !modoCronometro);
  document.getElementById("btnCrono").classList.toggle("activo", modoCronometro);
  const mini = document.getElementById("cronoMini");
  mini.classList.toggle("oculto", !modoCronometro);
  if (modoCronometro) {
    actualizarCronoProgreso();
    actualizarDisplayCrono();
    renderRankingTiempos();
  } else {
    cronoTiempoFinal = 0;
    cronoCorrectas = 0;
    cronoPenalizacion = 0;
    mini.textContent = formatearTiempo(0);
  }
  actualizarVisibilidadCompartir();
  guardarPrefs();
  enfocar();
}

function iniciarCronometro() {
  cronoCorrectas = 0;
  cronoPenalizacion = 0;
  cronoTiempoInicio = Date.now();
  cronoTiempoFinal = 0;
  cronometroActivo = true;
  ultimaPartidaCrono = null;
  document.getElementById("cronoResultado").textContent = "";
  document.getElementById("btnCronoNueva").classList.add("oculto");
  actualizarCronoProgreso();
  actualizarDisplayCrono();
  cronoIntervalo = setInterval(actualizarDisplayCrono, 100);
}

function cronoTranscurrido() {
  return cronoTiempoInicio
    ? Date.now() - cronoTiempoInicio + cronoPenalizacion
    : 0;
}

function actualizarDisplayCrono() {
  const texto = formatearTiempo(cronoTranscurrido());
  document.getElementById("cronoDisplay").textContent = texto;
  document.getElementById("cronoMini").textContent = texto;
}

function actualizarCronoProgreso() {
  document.getElementById("cronoProgreso").textContent = `${cronoCorrectas}/${OBJETIVO_CRONO} correctas`;
}

function detenerCronometro(manual = false) {
  if (!cronometroActivo) return;
  clearInterval(cronoIntervalo);
  cronoIntervalo = null;
  cronometroActivo = false;

  if (manual) {
    cronoTiempoFinal = 0;
    cronoCorrectas = 0;
    cronoPenalizacion = 0;
    const cero = formatearTiempo(0);
    document.getElementById("cronoDisplay").textContent = cero;
    document.getElementById("cronoMini").textContent = cero;
    document.getElementById("cronoResultado").textContent = "";
    return;
  }

  cronoTiempoFinal = cronoTranscurrido();
  const display = formatearTiempo(cronoTiempoFinal);
  document.getElementById("cronoDisplay").textContent = display;
  document.getElementById("cronoMini").textContent = display;
  ultimaPartidaCrono = cronoTiempoFinal;
  const resultado = document.getElementById("cronoResultado");
  const esRecord = guardarRanking(cronoTiempoFinal);
  resultado.textContent = esRecord
    ? `🏆 ¡Nuevo récord! ${display}`
    : `Ronda completada en ${display}`;
  renderRankingTiempos();
  actualizarVisibilidadCompartir();
}

function prepararNuevaRonda() {
  cronoTiempoFinal = 0;
  cronoCorrectas = 0;
  cronoPenalizacion = 0;
  cronometroActivo = false;
  ultimaPartidaCrono = null;
  const cero = formatearTiempo(0);
  document.getElementById("cronoDisplay").textContent = cero;
  document.getElementById("cronoMini").textContent = cero;
  document.getElementById("cronoProgreso").textContent = `0/${OBJETIVO_CRONO} correctas`;
  document.getElementById("cronoResultado").textContent = "";
  document.getElementById("btnCronoNueva").classList.add("oculto");
  enfocar();
}

function actualizarVisibilidadCompartir() {
  const hayPartidas = aciertos + errores > 0;
  const hayCrono = modoCronometro && rankingTiempos.length > 0;
  document.getElementById("btnCompartir").classList.toggle("oculto", !hayPartidas);
  document.getElementById("btnCompartirCrono").classList.toggle(
    "oculto",
    !hayCrono
  );
}

function guardarRanking(tiempoMs) {
  const esRecord =
    rankingTiempos.length === 0 ||
    tiempoMs < Math.min(...rankingTiempos.map((r) => r.tiempoMs));
  rankingTiempos.push({ fecha: Date.now(), tiempoMs });
  rankingTiempos.sort((a, b) => a.tiempoMs - b.tiempoMs);
  rankingTiempos = rankingTiempos.slice(0, MAX_RANKING);
  localStorage.setItem(CLAVE_RANKING, JSON.stringify(rankingTiempos));
  return esRecord;
}

function renderRankingTiempos() {
  const cont = document.getElementById("rankingTiempos");
  cont.innerHTML = "";

  if (rankingTiempos.length === 0) {
    const p = document.createElement("p");
    p.className = "vacio";
    p.textContent = "Aún no hay tiempos. ¡Completa una ronda contrarreloj!";
    cont.appendChild(p);
    return;
  }

  const lista = document.createElement("ol");
  lista.className = "ranking-lista";
  rankingTiempos.forEach((r, i) => {
    const li = document.createElement("li");
    li.className = "fila-tiempo";
    const medalla = document.createElement("span");
    medalla.className = "medalla";
    medalla.textContent = i < 3 ? MEDALLAS[i] : `${i + 1}.`;
    const tiempo = document.createElement("span");
    tiempo.className = "tiempo";
    tiempo.textContent = formatearTiempo(r.tiempoMs);
    const fecha = document.createElement("span");
    fecha.className = "grafica-fecha";
    fecha.textContent = formatearFecha(r.fecha);
    li.appendChild(medalla);
    li.appendChild(tiempo);
    li.appendChild(fecha);
    lista.appendChild(li);
  });
  cont.appendChild(lista);
}

// ---------- Compartir resultados ----------

function datosCompartir() {
  const total = aciertos + errores;
  const pct = total > 0 ? Math.round((aciertos / total) * 100) : 0;
  return {
    aciertos,
    errores,
    pct,
    racha: mejorRacha,
    tiempo: ultimaPartidaCrono,
  };
}

function resumenTexto() {
  const d = datosCompartir();
  let t = `🎵 ¿Qué nota es esta?\nAciertos: ${d.aciertos}\nErrores: ${d.errores}\nPrecisión: ${d.pct}%\nMejor racha: ${d.racha}`;
  if (d.tiempo != null) t += `\nContrarreloj: ${formatearTiempo(d.tiempo)}`;
  return t;
}

function generarTarjetaCompartir() {
  const datos = datosCompartir();
  const ancho = 640;
  const alto = 520;
  const c = document.createElement("canvas");
  c.width = ancho * 2;
  c.height = alto * 2;
  const d = c.getContext("2d");
  d.scale(2, 2);

  const grad = d.createLinearGradient(0, 0, 0, alto);
  grad.addColorStop(0, "#2b5876");
  grad.addColorStop(1, "#4e4376");
  d.fillStyle = grad;
  d.fillRect(0, 0, ancho, alto);

  d.fillStyle = "#ffffff";
  d.textAlign = "center";
  d.font = "bold 34px sans-serif";
  d.fillText("🎵 ¿Qué nota es esta?", ancho / 2, 72);

  d.fillStyle = "rgba(255,255,255,0.85)";
  d.font = "18px sans-serif";
  d.fillText(
    new Date().toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    }),
    ancho / 2,
    104
  );

  const filas = [
    ["✅ Aciertos", String(datos.aciertos)],
    ["❌ Errores", String(datos.errores)],
    ["🎯 Precisión", `${datos.pct}%`],
    ["🏆 Mejor racha", String(datos.racha)],
  ];
  if (datos.tiempo != null) {
    filas.push(["⏱️ Contrarreloj", formatearTiempo(datos.tiempo)]);
  }

  d.textAlign = "left";
  d.font = "22px sans-serif";
  filas.forEach(([k, v], i) => {
    const y = 168 + i * 52;
    d.fillStyle = "#ffffff";
    d.fillText(k, 80, y);
    d.fillStyle = "#ffd54f";
    d.font = "bold 22px sans-serif";
    d.fillText(v, 380, y);
    d.font = "22px sans-serif";
  });

  d.fillStyle = "rgba(255,255,255,0.7)";
  d.font = "14px sans-serif";
  d.textAlign = "center";
  d.fillText("¡Aprende notas y reta a tus amigos!", ancho / 2, alto - 28);
  return c;
}

function compartirCanvas(tarjeta, nombreArchivo, texto) {
  tarjeta.toBlob(
    async (blob) => {
      const file = new File([blob], nombreArchivo, { type: "image/png" });
      const shareData = {
        files: [file],
        title: "¿Qué nota es esta?",
        text: texto,
      };
      if (navigator.canShare && navigator.canShare(shareData)) {
        try {
          await navigator.share(shareData);
          return;
        } catch (e) {
          if (e.name === "AbortError") return;
        }
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = nombreArchivo;
      a.click();
      URL.revokeObjectURL(url);
    },
    "image/png"
  );
}

function compartirResultados() {
  compartirCanvas(
    generarTarjetaCompartir(),
    "mis-resultados.png",
    resumenTexto()
  );
}

function generarTarjetaContrarreloj() {
  const ultimo = ultimaPartidaCrono;
  const mejor = rankingTiempos.length > 0 ? rankingTiempos[0].tiempoMs : null;

  const ancho = 640;
  const alto = 560;
  const c = document.createElement("canvas");
  c.width = ancho * 2;
  c.height = alto * 2;
  const d = c.getContext("2d");
  d.scale(2, 2);

  const grad = d.createLinearGradient(0, 0, 0, alto);
  grad.addColorStop(0, "#134e5e");
  grad.addColorStop(1, "#71b280");
  d.fillStyle = grad;
  d.fillRect(0, 0, ancho, alto);

  d.fillStyle = "#ffffff";
  d.textAlign = "center";
  d.font = "bold 34px sans-serif";
  d.fillText("⏱️ Contrarreloj", ancho / 2, 70);

  d.fillStyle = "rgba(255,255,255,0.85)";
  d.font = "18px sans-serif";
  d.fillText(
    "¿Qué nota es esta? — 10 notas correctas",
    ancho / 2,
    102
  );

  d.fillStyle = "rgba(255,255,255,0.7)";
  d.font = "15px sans-serif";
  d.fillText(
    new Date().toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    }),
    ancho / 2,
    126
  );

  const filas = [
    ["Último tiempo", ultimo != null ? formatearTiempo(ultimo) : "—"],
    ["🏆 Récord", mejor != null ? formatearTiempo(mejor) : "—"],
  ];

  d.textAlign = "left";
  d.font = "22px sans-serif";
  filas.forEach(([k, v], i) => {
    const y = 170 + i * 44;
    d.fillStyle = "#ffffff";
    d.fillText(k, 80, y);
    d.fillStyle = "#ffe082";
    d.font = "bold 22px sans-serif";
    d.fillText(v, 400, y);
    d.font = "22px sans-serif";
  });

  const listaY = 278;
  d.fillStyle = "rgba(255,255,255,0.95)";
  d.font = "bold 18px sans-serif";
  d.fillText("Ranking de tiempos", 80, listaY);

  d.font = "18px sans-serif";
  rankingTiempos.slice(0, MAX_RANKING).forEach((r, i) => {
    const y = listaY + 32 + i * 32;
    const medalla = i < 3 ? MEDALLAS[i] : `${i + 1}.`;
    d.fillStyle = "#ffffff";
    d.fillText(medalla, 80, y);
    d.font = "bold 18px sans-serif";
    d.fillText(formatearTiempo(r.tiempoMs), 130, y);
    d.font = "15px sans-serif";
    d.fillStyle = "rgba(255,255,255,0.75)";
    d.fillText(formatearFecha(r.fecha), 240, y);
    d.fillStyle = "#ffffff";
    d.font = "18px sans-serif";
  });

  if (rankingTiempos.length === 0) {
    d.fillStyle = "rgba(255,255,255,0.75)";
    d.font = "17px sans-serif";
    d.fillText("Aún no hay tiempos registrados.", 80, listaY + 32);
  }

  d.fillStyle = "rgba(255,255,255,0.7)";
  d.font = "14px sans-serif";
  d.textAlign = "center";
  d.fillText("¡Aprende notas y reta a tus amigos!", ancho / 2, alto - 28);
  return c;
}

function resumenContrarreloj() {
  const ultimo = ultimaPartidaCrono;
  const mejor = rankingTiempos.length > 0 ? rankingTiempos[0].tiempoMs : null;
  let t = `⏱️ Contrarreloj — ¿Qué nota es esta?\n10 notas correctas`;
  if (ultimo != null) t += `\nÚltimo tiempo: ${formatearTiempo(ultimo)}`;
  if (mejor != null) t += `\nRécord: ${formatearTiempo(mejor)}`;
  if (rankingTiempos.length > 0) {
    t += "\nRanking:";
    rankingTiempos.slice(0, MAX_RANKING).forEach((r, i) => {
      t += `\n${i + 1}. ${formatearTiempo(r.tiempoMs)} (${formatearFecha(r.fecha)})`;
    });
  }
  return t;
}

function compartirContrarreloj() {
  compartirCanvas(
    generarTarjetaContrarreloj(),
    "mi-contrarreloj.png",
    resumenContrarreloj()
  );
}

// ---------- Entrada por teclado ----------

function configurarEntradaTeclado() {
  const notasValidas = ["Do", "Re", "Mi", "Fa", "Sol", "La", "Si"];

  entradaNota.addEventListener("keydown", function (e) {
    if (e.code === "Space" || e.code === "Enter") {
      e.preventDefault(); // Evita que se añada un espacio
      const texto = entradaNota.value.trim().toLowerCase();
      const entradaCapitalizada =
        texto.charAt(0).toUpperCase() + texto.slice(1);

      if (notasValidas.includes(entradaCapitalizada)) {
        verificar(entradaCapitalizada);
      }

      // Limpiar el campo SIEMPRE
      entradaNota.value = "";
    }
  });
}

// ---------- Marcadores, ranking y progreso ----------

function actualizarMarcadores() {
  document.getElementById("contadorAciertos").textContent = aciertos;
  document.getElementById("contadorErrores").textContent = errores;
  document.getElementById("contadorRacha").textContent = racha;
  document.getElementById("contadorMejorRacha").textContent = mejorRacha;
}

const MEDALLAS = ["🥇", "🥈", "🥉"];

function actualizarRankingErrores() {
  const lista = document.getElementById("listaErrores");
  lista.innerHTML = "";

  const ordenado = Object.entries(registroErrores)
    .filter(([_, valor]) => valor > 0)
    .sort((a, b) => b[1] - a[1]);

  if (ordenado.length === 0) {
    const li = document.createElement("li");
    li.className = "vacio";
    li.textContent = "¡Sin errores todavía! Sigue así 🎉";
    lista.appendChild(li);
    return;
  }

  ordenado.forEach(([clavePaso, veces], indice) => {
    const clave = claveDeError(clavePaso);
    const nota = notaDeError(clavePaso);
    if (!nota) return;
    const etiqueta = etiquetaNota(nota, clave);

    const li = document.createElement("li");
    li.className = "fila-nota";

    const medalla = document.createElement("span");
    medalla.className = "medalla";
    medalla.textContent = indice < 3 ? MEDALLAS[indice] : `${indice + 1}.`;

    const pildora = document.createElement("span");
    pildora.className = "pildora-nota";
    if (indice === 0) pildora.classList.add("top");
    pildora.textContent = etiqueta;

    const glifoClave = document.createElement("span");
    glifoClave.className = "glifo-clave";
    glifoClave.title = clave === "fa" ? "Clave de Fa" : "Clave de Sol";
    glifoClave.textContent = clave === "fa" ? "𝄢" : "𝄞";

    const contador = document.createElement("span");
    contador.className = "contador";
    contador.textContent = `${veces} ${veces === 1 ? "fallo" : "fallos"}`;

    li.appendChild(medalla);
    li.appendChild(pildora);
    li.appendChild(glifoClave);
    if (indice === 0) {
      const fuego = document.createElement("span");
      fuego.className = "fuego";
      fuego.textContent = "🔥";
      li.appendChild(fuego);
    }
    li.appendChild(contador);
    lista.appendChild(li);
  });
}

function registrarSesionSiProcede() {
  const a = aciertos - ultimoRegistro.aciertos;
  const e = errores - ultimoRegistro.errores;

  if (a + e >= UMBRAL_SESION) {
    historial.push({ timestamp: Date.now(), aciertos: a, errores: e });
    if (historial.length > MAX_SESIONES) {
      historial.splice(0, historial.length - MAX_SESIONES);
    }
    ultimoRegistro = { aciertos, errores };
    renderProgreso();
  }
}

function formatearFecha(ts) {
  const d = new Date(ts);
  return (
    d.toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit" }) +
    " " +
    d.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })
  );
}

function renderProgreso() {
  const cont = document.getElementById("barrasProgreso");
  cont.innerHTML = "";

  if (historial.length === 0) {
    const p = document.createElement("p");
    p.textContent =
      "Sin datos todavía. Responde a 10 notas para ver tu progreso.";
    cont.appendChild(p);
    return;
  }

  const sesiones = historial.map((s) => {
    const total = s.aciertos + s.errores;
    return { pct: total > 0 ? Math.round((s.aciertos / total) * 100) : 0, s };
  });

  const W = 460;
  const H = 140;
  const PADX = 12;
  const PADTOP = 24;
  const PADBOT = 26;

  const svNS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(svNS, "svg");
  svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
  svg.setAttribute("class", "grafica-evolucion");
  svg.setAttribute("role", "img");
  svg.setAttribute(
    "aria-label",
    "Gráfica de porcentaje de aciertos por sesión"
  );

  if (sesiones.length === 1) {
    const solo = sesiones[0];
    const cx = W / 2;
    const cy = PADTOP + (1 - solo.pct / 100) * (H - PADTOP - PADBOT);
    const punto = document.createElementNS(svNS, "circle");
    punto.setAttribute("cx", cx);
    punto.setAttribute("cy", cy);
    punto.setAttribute("r", 5);
    punto.setAttribute("class", "grafica-punto");
    svg.appendChild(punto);
    const etiqueta = document.createElementNS(svNS, "text");
    etiqueta.setAttribute("x", cx);
    etiqueta.setAttribute("y", cy - 10);
    etiqueta.setAttribute("class", "grafica-texto");
    etiqueta.textContent = solo.pct + "%";
    svg.appendChild(etiqueta);
    const fecha = document.createElementNS(svNS, "text");
    fecha.setAttribute("x", cx);
    fecha.setAttribute("y", H - 8);
    fecha.setAttribute("text-anchor", "middle");
    fecha.setAttribute("class", "grafica-fecha");
    fecha.textContent = formatearFecha(solo.s.timestamp);
    svg.appendChild(fecha);
  } else {
    const stepX = (W - PADX * 2) / (sesiones.length - 1);
    const puntos = sesiones.map((ses, i) => {
      const x = PADX + i * stepX;
      const y = PADTOP + (1 - ses.pct / 100) * (H - PADTOP - PADBOT);
      return { x, y, ...ses };
    });

    const linea = document.createElementNS(svNS, "polyline");
    linea.setAttribute(
      "points",
      puntos.map((p) => `${p.x},${p.y}`).join(" ")
    );
    linea.setAttribute("class", "grafica-linea");
    svg.appendChild(linea);

    puntos.forEach((p) => {
      const punto = document.createElementNS(svNS, "circle");
      punto.setAttribute("cx", p.x);
      punto.setAttribute("cy", p.y);
      punto.setAttribute("r", 4);
      punto.setAttribute("class", "grafica-punto");
      svg.appendChild(punto);

      const etiqueta = document.createElementNS(svNS, "text");
      etiqueta.setAttribute("x", p.x);
      etiqueta.setAttribute("y", p.y - 9);
      etiqueta.setAttribute("text-anchor", "middle");
      etiqueta.setAttribute("class", "grafica-texto");
      etiqueta.textContent = p.pct + "%";
      svg.appendChild(etiqueta);

      const fecha = document.createElementNS(svNS, "text");
      fecha.setAttribute("x", p.x);
      fecha.setAttribute("y", H - 8);
      fecha.setAttribute("text-anchor", "middle");
      fecha.setAttribute("class", "grafica-fecha");
      fecha.textContent = formatearFecha(p.s.timestamp);
      svg.appendChild(fecha);
    });
  }

  cont.appendChild(svg);
}

function reiniciarMarcadores() {
  if (cronometroActivo) detenerCronometro(true);
  aciertos = 0;
  errores = 0;
  racha = 0;
  mejorRacha = 0;
  Object.keys(registroErrores).forEach((k) => (registroErrores[k] = 0));
  historial = [];
  ultimoRegistro = { aciertos: 0, errores: 0 };
  ultimaPartidaCrono = null;
  guardarEstado();
  actualizarMarcadores();
  actualizarRankingErrores();
  renderProgreso();
  document.getElementById("btnCronoNueva").classList.add("oculto");
  actualizarVisibilidadCompartir();
  enfocar();
}

// ---------- Inicialización ----------

cargarEstado();
aplicarTema();
actualizarBotonSonido();
document.getElementById("selectorClave").value = claveActual;
canvas.addEventListener("animationend", () => canvas.classList.remove("agitar"));
canvas.addEventListener("click", (e) => {
  if (!notaActual) return;
  const rect = canvas.getBoundingClientRect();
  const escalaX = canvas.width / rect.width;
  const escalaY = canvas.height / rect.height;
  const mx = (e.clientX - rect.left) * escalaX;
  const my = (e.clientY - rect.top) * escalaY;
  const ny = yDesdePaso(notaActual.paso);
  if (Math.hypot(mx - centerX, my - ny) <= radioNota + 8) reproducirNota();
});
configurarEntradaTeclado();
document
  .getElementById("selectorClave")
  .addEventListener("change", cambiarClave);
renderProgreso();
actualizarVisibilidadCompartir();
if (modoCronometro) {
  document
    .getElementById("panelCrono")
    .classList.remove("oculto");
  document.getElementById("btnCrono").classList.add("activo");
  document.getElementById("cronoMini").classList.remove("oculto");
  actualizarCronoProgreso();
  actualizarDisplayCrono();
  renderRankingTiempos();
}
nuevaNota();

// Enfocar el input si se hace clic en cualquier parte del documento
document.addEventListener("click", (e) => {
  if (e.target.closest("select")) return;
  enfocar();
});

// Enfocar el input al volver a la pestaña
window.addEventListener("focus", () => {
  enfocar();
});

function enfocar() {
  if (!esMovil) {
    // preventScroll: evita que el navegador haga scroll hasta el input oculto
    entradaNota.focus({ preventScroll: true });
  }
}
