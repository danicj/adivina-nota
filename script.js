const canvas = document.getElementById("pentagrama");
const ctx = canvas.getContext("2d");

const centerX = 300;
const lineSpacing = 24; // ← Espaciado más cómodo
const middleLineY = 240; // ← Ajustado para el nuevo espaciado

const esMovil = /Mobi|Android/i.test(navigator.userAgent);

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

let notaActual;
let notaAnterior = null;

let aciertos = 0;
let errores = 0;

const registroErrores = {
  Do: 0,
  Re: 0,
  Mi: 0,
  Fa: 0,
  Sol: 0,
  La: 0,
  Si: 0,
};

function dibujarPentagrama() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.lineWidth = 2;
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

function dibujarNota(nota) {
  const y = yDesdePaso(nota.paso);

  // Dibujar círculo de nota
  ctx.beginPath();
  ctx.arc(centerX, y, 10, 0, Math.PI * 2); // Radio de 10 para un círculo más grande
  ctx.fillStyle = "black";
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

function nuevaNota() {
  dibujarPentagrama();

  let nueva;
  do {
    nueva = Math.floor(Math.random() * notas.length);
  } while (nueva === notaAnterior);

  notaAnterior = nueva;
  notaActual = notas[nueva];
  dibujarNota(notaActual);

  actualizarMarcadores();
  actualizarRankingErrores();

  const entradaNota = document.getElementById("entradaNota");

  // Enfocar automáticamente
  enfocar();

  // Validar al pulsar la barra espaciadora
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

  enfocar();
}

function verificar(respuesta) {
  const botones = document.querySelectorAll("button");
  const boton = [...botones].find((b) => b.textContent === respuesta);

  if (respuesta === notaActual.nombre) {
    boton.classList.add("correcto");
    aciertos++;
    actualizarMarcadores();

    setTimeout(() => {
      boton.classList.remove("correcto");
      nuevaNota();
    }, 300);
  } else {
    boton.classList.add("incorrecto");
    errores++;
    registroErrores[notaActual.nombre]++;
    actualizarMarcadores();
    actualizarRankingErrores();

    setTimeout(() => {
      boton.classList.remove("incorrecto");
    }, 300);
  }

  enfocar();
}

nuevaNota();

function actualizarMarcadores() {
  document.getElementById("contadorAciertos").textContent = aciertos;
  document.getElementById("contadorErrores").textContent = errores;
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
