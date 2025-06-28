const canvas = document.getElementById("pentagrama");
const ctx = canvas.getContext("2d");

const centerX = 300;
const lineSpacing = 24; // ← Espaciado más cómodo
const middleLineY = 240; // ← Ajustado para el nuevo espaciado

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
}

function verificar(respuesta) {
  const resultado = document.getElementById("resultado");
  if (respuesta === notaActual.nombre) {
    resultado.textContent = "¡Correcto!";
    setTimeout(() => {
      resultado.textContent = "";
      nuevaNota();
    }, 250);
  } else {
    resultado.textContent = "Incorrecto, intenta de nuevo.";
  }
}

nuevaNota();