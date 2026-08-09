const canvas = document.getElementById("pentagrama");
const ctx = canvas.getContext("2d");
const entradaNota = document.getElementById("entradaNota");

const centerX = 300;
const lineSpacing = 24; // ← Espaciado más cómodo
const middleLineY = 240; // ← Ajustado para el nuevo espaciado

const esMovil = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

const notas = [
  { nombre: "Do", paso: -6 },
  { nombre: "Re", paso: -5 },
  { nombre: "Mi", paso: -4 },
  { nombre: "Fa", paso: -3 },
  { nombre: "Sol", paso: -2 },
  { nombre: "La", paso: -1 },
  { nombre: "Si", paso: 0 },
  { nombre: "Do", paso: 1 },
  { nombre: "Re", paso: 2 },
  { nombre: "Mi", paso: 3 },
  { nombre: "Fa", paso: 4 },
  { nombre: "Sol", paso: 5 },
  { nombre: "La", paso: 6 },
];

const CLAVE_STATS = "adivinaNotaStats";
const CLAVE_PREFS = "adivinaNotaPrefs";
const UMBRAL_SESION = 10; // Registro de progreso cada 10 notas respondidas
const MAX_SESIONES = 15;

const registroErrores = {
  Do: 0,
  Re: 0,
  Mi: 0,
  Fa: 0,
  Sol: 0,
  La: 0,
  Si: 0,
};

let notaActual;
let notaAnterior = null;

let aciertos = 0;
let errores = 0;
let racha = 0;
let mejorRacha = 0;
let sonidoActivado = true;
let temaOscuro = false;
let historial = [];
let ultimoRegistro = { aciertos: 0, errores: 0 };

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
  tocarTono(880, 0.15);
  setTimeout(() => tocarTono(1174.66, 0.25), 120);
}

function sonidoError() {
  tocarTono(196, 0.3, "square", 0.1);
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
    JSON.stringify({ sonido: sonidoActivado, tema: temaOscuro })
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
      if (s.registroErrores) Object.assign(registroErrores, s.registroErrores);
      historial = Array.isArray(s.historial) ? s.historial : [];
      ultimoRegistro = s.ultimoRegistro || { aciertos: 0, errores: 0 };
    }
  } catch (e) {}

  try {
    const p = JSON.parse(localStorage.getItem(CLAVE_PREFS));
    if (p) {
      sonidoActivado = p.sonido !== false;
      temaOscuro = !!p.tema;
    }
  } catch (e) {}
}

// ---------- Dibujo ----------

function dibujarPentagrama() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.lineWidth = 2;
  ctx.strokeStyle = cssVar("--linea");
  for (let i = -2; i <= 2; i++) {
    const y = middleLineY + i * lineSpacing;
    ctx.beginPath();
    ctx.moveTo(80, y);
    ctx.lineTo(520, y);
    ctx.stroke();
  }
}

function yDesdePaso(paso) {
  return middleLineY - paso * (lineSpacing / 2);
}

function dibujarNota(nota, color) {
  const y = yDesdePaso(nota.paso);

  // Dibujar círculo de nota
  ctx.fillStyle = color || cssVar("--nota");
  ctx.beginPath();
  ctx.arc(centerX, y, 10, 0, Math.PI * 2); // Radio de 10 para un círculo más grande
  ctx.fill();

  // Dibujar líneas adicionales si es necesario
  if (nota.paso <= -6) {
    for (let p = -6; p <= nota.paso; p += 2) {
      const ly = yDesdePaso(p);
      ctx.beginPath();
      ctx.moveTo(centerX - 20, ly);
      ctx.lineTo(centerX + 20, ly);
      ctx.stroke();
    }
  }

  if (nota.paso >= 5) {
    for (let p = 6; p <= nota.paso; p += 2) {
      const ly = yDesdePaso(p);
      ctx.beginPath();
      ctx.moveTo(centerX - 20, ly);
      ctx.lineTo(centerX + 20, ly);
      ctx.stroke();
    }
  }
}

function redibujar() {
  dibujarPentagrama();
  if (notaActual) dibujarNota(notaActual);
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
  dibujarNota(notaActual);

  const resultado = document.getElementById("resultado");
  resultado.textContent = "";
  resultado.className = "";

  actualizarMarcadores();
  actualizarRankingErrores();
  enfocar();
}

function verificar(respuesta) {
  const botones = document.querySelectorAll("button");
  const boton = [...botones].find((b) => b.textContent === respuesta);
  const resultado = document.getElementById("resultado");

  if (respuesta === notaActual.nombre) {
    boton.classList.add("correcto");
    aciertos++;
    racha++;
    if (racha > mejorRacha) mejorRacha = racha;
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
    registroErrores[notaActual.nombre]++;
    sonidoError();
    dibujarPentagrama();
    dibujarNota(notaActual, cssVar("--feedback-error"));
    resultado.textContent = `Era un ${notaActual.nombre}`;
    resultado.className = "resultado-error";
    actualizarMarcadores();
    actualizarRankingErrores();
    registrarSesionSiProcede();
    guardarEstado();

    setTimeout(() => {
      boton.classList.remove("incorrecto");
    }, 300);
  }

  enfocar();
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

function actualizarRankingErrores() {
  const lista = document.getElementById("listaErrores");
  lista.innerHTML = "";

  const ordenado = Object.entries(registroErrores)
    .filter(([_, valor]) => valor > 0)
    .sort((a, b) => b[1] - a[1]);

  ordenado.forEach(([nota, veces]) => {
    const li = document.createElement("li");
    li.textContent = `${nota}: ${veces} errores`;
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

  historial.forEach((s) => {
    const total = s.aciertos + s.errores;
    const pct = total > 0 ? Math.round((s.aciertos / total) * 100) : 0;

    const etiqueta = document.createElement("div");
    etiqueta.className = "etiqueta";
    etiqueta.textContent = `${formatearFecha(s.timestamp)} · ${pct}% aciertos`;

    const barra = document.createElement("div");
    barra.className = "barra-progreso";
    const relleno = document.createElement("div");
    relleno.className = "relleno";
    relleno.style.width = pct + "%";
    barra.appendChild(relleno);

    cont.appendChild(etiqueta);
    cont.appendChild(barra);
  });
}

function reiniciarMarcadores() {
  aciertos = 0;
  errores = 0;
  racha = 0;
  mejorRacha = 0;
  Object.keys(registroErrores).forEach((k) => (registroErrores[k] = 0));
  historial = [];
  ultimoRegistro = { aciertos: 0, errores: 0 };
  guardarEstado();
  actualizarMarcadores();
  actualizarRankingErrores();
  renderProgreso();
  enfocar();
}

// ---------- Inicialización ----------

cargarEstado();
aplicarTema();
actualizarBotonSonido();
configurarEntradaTeclado();
renderProgreso();
nuevaNota();

// Enfocar el input si se hace clic en cualquier parte del documento
document.addEventListener("click", () => {
  enfocar();
});

// Enfocar el input al volver a la pestaña
window.addEventListener("focus", () => {
  enfocar();
});

function enfocar() {
  if (!esMovil) {
    entradaNota.focus();
  }
}
