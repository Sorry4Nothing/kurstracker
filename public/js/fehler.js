/**
 * Cevi Kurstracker - Fehlerseiten (401, 404, 502)
 * Punktfeld im Hintergrund: Punkte in der Rasterfarbe, in der Nähe des Mauszeigers wachsen sie und
 * nehmen die Akzentfarbe des Fehlers an. Farben kommen aus den Theme-Variablen. Mit «Bewegung reduzieren» steht das Raster still.
 */

const page = document.querySelector('.error-page');
const canvas = page?.querySelector('.error-dots');

if (canvas) {
  const context = canvas.getContext('2d');
  const style = getComputedStyle(page);
  const color = name => style.getPropertyValue(name).trim();
  const STEP = 24;
  const REACH = 170;
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let pointer = null;
  let frame = 0;

  const draw = () => {
    frame = 0;
    const { width, height } = canvas.getBoundingClientRect();
    const ratio = window.devicePixelRatio || 1;
    if (canvas.width !== Math.round(width * ratio) || canvas.height !== Math.round(height * ratio)) {
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
    }
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.clearRect(0, 0, width, height);
    const base = color('--border-subtle');
    const accent = color('--accent-solid');
    for (let y = STEP / 2; y < height; y += STEP) {
      for (let x = STEP / 2; x < width; x += STEP) {
        const near = pointer ? Math.max(0, 1 - Math.hypot(x - pointer.x, y - pointer.y) / REACH) : 0;
        context.beginPath();
        context.arc(x, y, 1.5 + near * 3, 0, Math.PI * 2);
        context.fillStyle = near > 0.05 ? accent : base;
        context.globalAlpha = near > 0.05 ? 0.25 + near * 0.6 : 1;
        context.fill();
      }
    }
    context.globalAlpha = 1;
  };
  const schedule = () => { frame ||= requestAnimationFrame(draw); };

  window.addEventListener('resize', schedule);
  if (!still) {
    page.addEventListener('pointermove', (event) => {
      const box = page.getBoundingClientRect();
      pointer = { x: event.clientX - box.left, y: event.clientY - box.top };
      schedule();
    });
    page.addEventListener('pointerleave', () => { pointer = null; schedule(); });
  }
  draw();
}

// 502: nach RETRY_SECONDS lädt die App von selbst neu. Die Restzeit kommt aus der Uhr, nicht aus gezählten Ticks,
// damit sie auch in einem Hintergrund-Tab stimmt, in dem Timer gedrosselt laufen.
const RETRY_SECONDS = 20;
const retry = document.querySelector('[data-retry]');
const ring = document.querySelector('.error-ring-fill');

if (retry && ring) {
  const end = Date.now() + RETRY_SECONDS * 1000;
  const tick = () => {
    const left = Math.max(0, (end - Date.now()) / 1000);
    ring.style.strokeDashoffset = String(100 - (left / RETRY_SECONDS) * 100);
    retry.textContent = left > 0 ? `Nächster Versuch in ${Math.ceil(left)} s` : 'Versuche es erneut …';
    if (left <= 0) location.assign('/');
  };
  tick();
  setInterval(tick, 500);
}
