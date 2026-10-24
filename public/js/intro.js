/**
 * Cevi Kurstracker - Login-Intro (#90)
 * Partikel schweben als Kugel und ordnen sich per Feder zum Cevi-Logo, dann blendet das scharfe Logo ein
 * und die App öffnet. Eigene Umsetzung nach dem Motion-Beispiel js-three-tsl, mit Canvas 2D statt Three.js.
 * theme-init.js setzt intro-pending nur direkt nach dem Login und ohne «Bewegung reduzieren».
 */

const COLUMNS = 120; // Logo-Raster: ein Partikel pro deckendem Feld
const DELAY = 0.8;   // s, so lange schwebt die Kugel, bevor die Feder zieht
const END = 2.6;     // s, die Feder ruht nach rund 1.2 s, danach steht das Logo noch gut 0.6 s

// Feder wie im Vorbild (stiffness 55, damping 16, mass 1): überdämpft mit Polen bei -5 und -11, also ohne Überschwingen
const spring = t => (t <= 0 ? 1 : (11 * Math.exp(-5 * t) - 5 * Math.exp(-11 * t)) / 6);

// Das scharfe Logo blendet ein, während die Partikel die letzten Pixel zurücklegen
function logoOpacity(globe) {
  const t = Math.min(1, Math.max(0, (0.035 - globe) / 0.03));
  return t * t * (3 - 2 * t);
}

// Ein Partikel pro deckendem Feld des Logos, in dessen Farbe, mit Startpunkt auf einer Kugel
function createParticles(logo) {
  const sample = document.createElement('canvas');
  sample.width = sample.height = COLUMNS;
  const context = sample.getContext('2d', { willReadFrequently: true });
  context.drawImage(logo, 0, 0, COLUMNS, COLUMNS);
  const pixels = context.getImageData(0, 0, COLUMNS, COLUMNS).data;

  const particles = [];
  for (let i = 0; i < COLUMNS * COLUMNS; i++) {
    const p = i * 4;
    if (pixels[p + 3] < 128) continue;
    particles.push({
      x: (i % COLUMNS + 0.5) / COLUMNS - 0.5,
      y: 0.5 - (Math.floor(i / COLUMNS) + 0.5) / COLUMNS,
      color: `rgb(${pixels[p]}, ${pixels[p + 1]}, ${pixels[p + 2]})`,
      phase: Math.random() * Math.PI * 2,
      speed: 0.7 + Math.random() * 0.35
    });
  }

  // Fibonacci-Kugel, zufällig gedreht und leicht gekippt wie im Vorbild; die oberen Logo-Zeilen liegen oben
  const yaw = Math.random() * Math.PI * 2;
  const tilt = -0.28;
  particles.forEach((particle, k) => {
    const y = 1 - (k / Math.max(particles.length - 1, 1)) * 2;
    const ring = Math.sqrt(1 - y * y);
    const x = Math.cos(k * 2.39996323) * ring;
    const z = Math.sin(k * 2.39996323) * ring;
    const spunZ = -x * Math.sin(yaw) + z * Math.cos(yaw);
    particle.globeX = x * Math.cos(yaw) + z * Math.sin(yaw);
    particle.globeY = y * Math.cos(tilt) - spunZ * Math.sin(tilt);
    particle.depth = y * Math.sin(tilt) + spunZ * Math.cos(tilt);
  });

  // Hinten zuerst zeichnen, damit die vordere Kugelhälfte obenauf liegt
  return particles.sort((a, b) => a.depth - b.depth);
}

export async function playLoginIntro() {
  const overlay = document.createElement('div');
  overlay.className = 'login-intro';
  overlay.innerHTML = `
    <canvas aria-hidden="true"></canvas>
    <img class="login-intro-logo" src="favicon.svg" alt="">
    <button type="button" class="btn btn-secondary login-intro-skip">Intro überspringen</button>
  `;
  document.body.append(overlay);
  const [canvas, logo, skip] = overlay.children;
  const context = canvas.getContext('2d');
  let done = false;
  let frameId = 0;
  let unit, size, cell, centerX, centerY;

  // Masse wie im Vorbild in Einheiten der halben kürzeren Fensterseite
  function layout() {
    const ratio = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(innerWidth * ratio);
    canvas.height = Math.round(innerHeight * ratio);
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    unit = Math.min(innerWidth, innerHeight) / 2;
    size = Math.min(unit * 1.1, 420);
    cell = (size / COLUMNS) * 1.01;
    centerX = innerWidth / 2;
    centerY = innerHeight / 2;
    logo.style.width = `${size}px`;
  }

  function finish() {
    if (done) return;
    done = true;
    cancelAnimationFrame(frameId);
    removeEventListener('resize', layout);
    document.removeEventListener('keydown', onKey);
    document.documentElement.classList.remove('intro-pending');
    overlay.classList.add('is-leaving');
    setTimeout(() => overlay.remove(), 400); // nach der Ausblende-Transition (--dur-med)
  }

  const onKey = e => {
    if (e.key === 'Escape') finish();
  };
  skip.addEventListener('click', finish);
  document.addEventListener('keydown', onKey);
  skip.focus({ preventScroll: true });

  try {
    await logo.decode();
    if (done) return;
    const particles = createParticles(logo);
    layout();
    addEventListener('resize', layout);
    const start = performance.now();

    const draw = now => {
      const time = (now - start) / 1000;
      const globe = spring(time - DELAY);
      context.clearRect(0, 0, innerWidth, innerHeight);
      for (const p of particles) {
        // Auf der Kugel zittern die Partikel leicht, im Logo stehen sie still
        const globeX = (p.globeX * 0.58 + Math.sin(time * (p.speed + 0.6) + p.phase) * 0.045) * unit;
        const globeY = (p.globeY * 0.58 + Math.cos(time * (p.speed + 0.37) + p.phase * 1.71) * 0.035) * unit;
        const x = p.x * size + (globeX - p.x * size) * globe;
        const y = p.y * size + (globeY - p.y * size) * globe;
        context.fillStyle = p.color;
        context.fillRect(centerX + x - cell / 2, centerY - y - cell / 2, cell, cell);
      }
      const opacity = logoOpacity(globe);
      logo.style.opacity = opacity;
      // Ohne Platte ragen die Treppenkanten der Partikel unter dem scharfen Logo hervor, deshalb weg, sobald es deckt
      canvas.hidden = opacity === 1;
      if (time >= END) finish();
      else frameId = requestAnimationFrame(draw);
    };
    frameId = requestAnimationFrame(draw);
  } catch {
    finish(); // Logo oder Canvas nicht verfügbar: App ohne Intro öffnen
  }
}
