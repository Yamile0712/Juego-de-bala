const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const W = canvas.width, H = canvas.height;

const el = {
  score: document.getElementById("score"),
  level: document.getElementById("level"),
  lives: document.getElementById("lives"),
};

let player, target, bullets, particles, score, level, lives, gameOver, cooldown, time;
const stars = Array.from({ length: 70 }, () => ({ x: Math.random() * W, y: Math.random() * (H - 20), s: Math.random() < .2 ? 2 : 1, p: Math.random() * 6 }));
const mouse = { x: W / 2, y: H / 2 };
const keys = {};

function reset() {
  player = { x: 90, y: H / 2 };
  target = { x: W - 80, baseX: W - 80, y: H / 2, dir: 1, phase: 0 };
  bullets = [];
  particles = [];
  score = 0; level = 1; lives = 3;
  gameOver = false; cooldown = 0; time = 0;
  updateHud();
}

// La dificultad sube con cada nivel
function difficulty() {
  return {
    radius: Math.max(14, 42 - level * 3),     // el blanco se achica
    speed: 1.2 + level * 0.5,                   // se mueve más rápido
    wobble: Math.min(80, (level - 1) * 12),   // zigzag vertical
    sway: level >= 4 ? Math.min(120, (level - 3) * 20) : 0, // va y viene en X
    bulletSpeed: 13,
  };
}

function updateHud() {
  el.score.textContent = score;
  el.level.textContent = level;
  el.lives.textContent = "❤".repeat(Math.max(0, lives)) || "💀";
}

function shoot() {
  if (gameOver || cooldown > 0) return;
  const a = angle();
  const d = difficulty();
  bullets.push({
    x: player.x + 20 + Math.cos(a) * 40,
    y: player.y - 10 + Math.sin(a) * 40,
    vx: Math.cos(a) * d.bulletSpeed,
    vy: Math.sin(a) * d.bulletSpeed,
  });
  cooldown = 15;
}

function angle() {
  return Math.atan2(mouse.y - (player.y - 10), mouse.x - (player.x + 20));
}

function boom(x, y, color) {
  for (let i = 0; i < 25; i++) {
    const a = Math.random() * Math.PI * 2, s = 2 + Math.random() * 5;
    particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 30, color: i % 2 ? color : "#e3c98a" });
  }
}

function update() {
  if (gameOver) return;
  time++;
  if (cooldown > 0) cooldown--;

  // mover jugador
  if (keys["w"] || keys["arrowup"]) player.y -= 4;
  if (keys["s"] || keys["arrowdown"]) player.y += 4;
  player.y = Math.max(60, Math.min(H - 60, player.y));

  // mover blanco
  const d = difficulty();
  target.phase += 0.03;
  target.y += target.dir * d.speed;
  const margin = d.radius + 5;
  if (target.y < margin) { target.y = margin; target.dir = 1; }
  if (target.y > H - margin) { target.y = H - margin; target.dir = -1; }
  target.x = target.baseX - d.sway / 2 + Math.sin(target.phase) * d.sway / 2;
  const yOffset = Math.sin(target.phase * 3) * d.wobble * 0.3;
  target.drawY = Math.max(margin, Math.min(H - margin, target.y + yOffset));

  // balas
  for (let i = bullets.length - 1; i >= 0; i--) {
    const b = bullets[i];
    b.x += b.vx; b.y += b.vy;

    if (Math.hypot(b.x - target.x, b.y - target.drawY) < d.radius) {
      bullets.splice(i, 1);
      score += 10 * level;
      level++;
      boom(target.x, target.drawY, "#d98a99");
      updateHud();
      continue;
    }
    if (b.x > W || b.x < 0 || b.y < 0 || b.y > H) {
      bullets.splice(i, 1);
      lives--;
      updateHud();
      if (lives <= 0) gameOver = true;
    }
  }

  particles.forEach(p => { p.x += p.vx; p.y += p.vy; p.life--; });
  particles = particles.filter(p => p.life > 0);
}

function drawPlayer() {
  const { x, y } = player;
  ctx.strokeStyle = "#e3c98a"; ctx.lineWidth = 4; ctx.lineCap = "round";
  ctx.beginPath(); ctx.arc(x, y - 40, 14, 0, Math.PI * 2); ctx.stroke(); // cabeza
  ctx.beginPath(); ctx.moveTo(x, y - 26); ctx.lineTo(x, y + 20); ctx.stroke(); // cuerpo
  ctx.beginPath(); ctx.moveTo(x, y + 20); ctx.lineTo(x - 15, y + 55); ctx.stroke(); // piernas
  ctx.beginPath(); ctx.moveTo(x, y + 20); ctx.lineTo(x + 15, y + 55); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x, y - 15); ctx.lineTo(x - 18, y + 5); ctx.stroke(); // brazo atrás

  // brazo + pistola apuntando al mouse
  const a = angle(), sx = x, sy = y - 10;
  ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx + Math.cos(a) * 22, sy + Math.sin(a) * 22); ctx.stroke();
  ctx.lineWidth = 7; ctx.strokeStyle = "#d98a99";
  ctx.beginPath();
  ctx.moveTo(sx + Math.cos(a) * 20, sy + Math.sin(a) * 20);
  ctx.lineTo(sx + Math.cos(a) * 42, sy + Math.sin(a) * 42);
  ctx.stroke();
}

function drawTarget() {
  const r = difficulty().radius, y = target.drawY ?? target.y;
  const colors = ["#d98a99", "#f6efe0", "#d98a99", "#f6efe0", "#c9a15e"];
  colors.forEach((c, i) => {
    ctx.fillStyle = c;
    ctx.beginPath(); ctx.arc(target.x, y, r * (1 - i * 0.2), 0, Math.PI * 2); ctx.fill();
  });
  ctx.strokeStyle = "#e3c98a"; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(target.x, y, r, 0, Math.PI * 2); ctx.stroke();
}

function draw() {
  ctx.clearRect(0, 0, W, H);
  // suelo
  ctx.fillStyle = "rgba(201,161,94,.25)"; ctx.fillRect(0, H - 8, W, 8);
  stars.forEach(st => {
    ctx.globalAlpha = 0.3 + 0.5 * Math.abs(Math.sin(time * 0.02 + st.p));
    ctx.fillStyle = "#f6efe0"; ctx.fillRect(st.x, st.y, st.s, st.s);
  });
  ctx.globalAlpha = 1;

  // línea de mira
  ctx.setLineDash([6, 8]); ctx.strokeStyle = "rgba(227,201,138,.25)"; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(player.x, player.y - 10); ctx.lineTo(mouse.x, mouse.y); ctx.stroke();
  ctx.setLineDash([]);

  drawPlayer();
  drawTarget();

  ctx.fillStyle = "#e3c98a";
  bullets.forEach(b => { ctx.beginPath(); ctx.arc(b.x, b.y, 4, 0, Math.PI * 2); ctx.fill(); });
  particles.forEach(p => {
    ctx.globalAlpha = p.life / 30; ctx.fillStyle = p.color;
    ctx.fillRect(p.x, p.y, 4, 4);
  });
  ctx.globalAlpha = 1;

  if (gameOver) {
    ctx.fillStyle = "rgba(10,12,22,.82)"; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#eee8da"; ctx.textAlign = "center";
    ctx.font = "italic 500 46px Fraunces, serif"; ctx.fillText("Se acabó, pero lo intentamos", W / 2, H / 2 - 20);
    ctx.font = "18px Manrope, sans-serif";
    ctx.fillText(`Puntos: ${score} · Nivel: ${level}`, W / 2, H / 2 + 20);
    ctx.fillText("Presiona R o haz clic para reiniciar", W / 2, H / 2 + 55);
    ctx.textAlign = "left";
  }
}

function loop() { update(); draw(); requestAnimationFrame(loop); }

// Controles
canvas.addEventListener("mousemove", e => {
  const r = canvas.getBoundingClientRect();
  mouse.x = (e.clientX - r.left) * (W / r.width);
  mouse.y = (e.clientY - r.top) * (H / r.height);
});
canvas.addEventListener("mousedown", () => (gameOver ? reset() : shoot()));
window.addEventListener("keydown", e => {
  const k = e.key.toLowerCase();
  keys[k] = true;
  if (k === " ") { e.preventDefault(); shoot(); }
  if (k === "r") reset();
  if (k.startsWith("arrow")) e.preventDefault();
});
window.addEventListener("keyup", e => (keys[e.key.toLowerCase()] = false));

reset();
loop();
