/**
 * CEVI KURSTRACKER - CLIENT LOGIC
 */

let allCourses = [];
let currentUser = null;
let currentConfig = null;

// Initialisierung bei DOMContentLoaded
document.addEventListener('DOMContentLoaded', async () => {
  await loadConfig();
  await checkAuth();
  await Promise.all([
    loadQualifications(),
    loadHistory(),
    loadCourses()
  ]);
});

// 1. Konfiguration & Umgebung laden
async function loadConfig() {
  try {
    const res = await fetch('/api/config');
    currentConfig = await res.json();

    const envBadge = document.getElementById('envBadge');
    const envLabel = document.getElementById('envLabel');
    const dbStatusText = document.getElementById('dbStatusText');
    const footerEnvText = document.getElementById('footerEnvText');

    envBadge.className = `env-pill env-${currentConfig.appEnv}`;
    
    let envNameDisplay = currentConfig.appEnv.toUpperCase();
    if (currentConfig.isLocal) {
      envNameDisplay = currentConfig.isMock ? '🟢 LOCAL (MOCK)' : '🟢 LOCAL';
    } else if (currentConfig.isDevelopment) {
      envNameDisplay = '🟡 DEV SERVER';
    } else if (currentConfig.isProduction) {
      envNameDisplay = '🔴 LIVE / PROD';
    }

    envLabel.textContent = envNameDisplay;
    footerEnvText.textContent = `${currentConfig.appEnv} (${currentConfig.nodeEnv})`;

    dbStatusText.textContent = currentConfig.isMock
      ? 'Cevi-DB: Mock-Modus'
      : 'Cevi-DB: db.cevi.ch';

    // System-Panel Daten befüllen
    document.getElementById('sysDbBaseUrl').textContent = currentConfig.ceviDbBaseUrl;
    document.getElementById('sysAppEnv').textContent = currentConfig.appEnv;
    document.getElementById('sysNodeEnv').textContent = currentConfig.nodeEnv;
    document.getElementById('sysMockStatus').textContent = currentConfig.isMock
      ? 'Mock-Modus aktiviert (Lokale Simulation)'
      : 'Echte Verbindung zu db.cevi.ch';
    document.getElementById('sysEnvBadge').textContent = currentConfig.appEnv.toUpperCase();

  } catch (err) {
    console.error('Fehler beim Laden der Konfiguration:', err);
  }
}

// 2. Auth Status prüfen
async function checkAuth() {
  const userNavActions = document.getElementById('userNavActions');
  const heroGreeting = document.getElementById('heroGreeting');
  const heroDescription = document.getElementById('heroDescription');
  const userGreetingTag = document.getElementById('userGreetingTag');
  const heroUserCard = document.getElementById('heroUserCard');

  try {
    const res = await fetch('/api/auth/me');
    if (res.ok) {
      const data = await res.json();
      if (data.authenticated && data.user) {
        currentUser = data.user;

        // Navbar aktualisieren
        userNavActions.innerHTML = `
          <div class="user-nav-badge">
            <div class="user-avatar">${(currentUser.nickname || currentUser.first_name || 'C').charAt(0).toUpperCase()}</div>
            <div class="user-info-text">
              <span class="user-ceviname">${currentUser.nickname ? currentUser.nickname : currentUser.first_name}</span>
              <span class="user-realname">${currentUser.first_name} ${currentUser.last_name}</span>
            </div>
            <button class="btn btn-secondary btn-sm" onclick="logout()" title="Abmelden" style="margin-left: 0.5rem; padding: 0.2rem 0.5rem;">
              ✕
            </button>
          </div>
        `;

        // Hero anpassen
        userGreetingTag.textContent = `Angemeldet als Cevi-Leitende(r)`;
        heroGreeting.textContent = `Hallo ${currentUser.nickname || currentUser.first_name}! Deine Ausbildungsübersicht`;
        heroDescription.textContent = `Mitglied von: ${currentUser.groups?.[0]?.name || 'Cevi Schweiz'}. Rolle: ${currentUser.roles?.join(', ') || 'Leiter'}.`;

        // Sidebar anpassen
        heroUserCard.innerHTML = `
          <div class="quick-login-card" style="text-align: left;">
            <div style="display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.75rem;">
              <div class="user-avatar" style="width: 44px; height: 44px; font-size: 1.1rem;">
                ${(currentUser.nickname || 'C').charAt(0).toUpperCase()}
              </div>
              <div>
                <h3 style="margin: 0; font-size: 1.1rem;">${currentUser.nickname || currentUser.first_name}</h3>
                <span style="font-size: 0.75rem; color: var(--text-muted);">${currentUser.email}</span>
              </div>
            </div>
            <div style="font-size: 0.8rem; color: var(--text-dim); margin-bottom: 1rem;">
              <div><strong>Cevi-ID:</strong> ${currentUser.sub || currentUser.id}</div>
              <div><strong>J+S Nummer:</strong> ${currentUser.js_person_id || 'JS-882194-CH'}</div>
            </div>
            <button class="btn btn-secondary btn-block btn-sm" onclick="logout()">
              🚪 Abmelden
            </button>
          </div>
        `;
        return;
      }
    }
  } catch (err) {
    console.warn('Nicht eingeloggt oder Backend nicht erreichbar:', err);
  }

  // Nicht eingeloggt
  userNavActions.innerHTML = `
    <button class="btn btn-outline" id="btnLogin" onclick="initiateLogin()">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M15 12H3"/>
      </svg>
      Mit Cevi-DB anmelden
    </button>
  `;
}

// 3. Qualifikationen laden
async function loadQualifications() {
  const container = document.getElementById('qualsContainer');
  try {
    const res = await fetch('/api/qualifications');
    const data = await res.json();
    const quals = data.qualifications || [];

    // Stats aktualisieren
    const validCount = quals.filter(q => q.status === 'Gültig' || q.status === 'Aktiv').length;
    document.getElementById('statValidQuals').textContent = validCount;

    if (quals.length === 0) {
      container.innerHTML = '<div class="loading-placeholder">Keine Qualifikationen hinterlegt.</div>';
      return;
    }

    container.innerHTML = quals.map(q => {
      const isPending = q.status_code === 'pending';
      const badgeClass = isPending ? 'badge-warning' : 'badge-success';
      const badgeText = q.status;

      return `
        <div class="card">
          <div class="card-top">
            <span class="card-category">${q.type}</span>
            <span class="badge ${badgeClass}">${badgeText}</span>
          </div>
          <h3 class="card-title">${q.title}</h3>
          <p class="card-subtitle">${q.sub_title}</p>
          <div class="meta-list">
            <div class="meta-item">
              <span>Ausgestellt von:</span>
              <strong>${q.issuer || 'Cevi Schweiz'}</strong>
            </div>
            <div class="meta-item">
              <span>Gültig bis:</span>
              <strong>${q.valid_until}</strong>
            </div>
            ${q.renewal_recommended ? `
              <div class="meta-item" style="color: var(--cevi-gold); margin-top: 0.25rem;">
                <span>💡 Empfehlung:</span>
                <span>${q.renewal_recommended}</span>
              </div>
            ` : ''}
          </div>
        </div>
      `;
    }).join('');

  } catch (err) {
    container.innerHTML = `<div class="loading-placeholder">Fehler beim Laden: ${err.message}</div>`;
  }
}

// 4. Kurshistorie laden
async function loadHistory() {
  const container = document.getElementById('historyContainer');
  try {
    const res = await fetch('/api/participations');
    const data = await res.json();
    const parts = data.participations || [];

    // Stat completed
    const completedCount = parts.filter(p => p.result && p.result.includes('bestanden')).length;
    document.getElementById('statCompleted').textContent = completedCount;

    const nextCourse = parts.find(p => p.year >= 2026);
    document.getElementById('statNextCourse').textContent = nextCourse ? nextCourse.date.split('-')[0].trim() : '2026';

    if (parts.length === 0) {
      container.innerHTML = '<div class="loading-placeholder">Noch keine Kurse eingetragen.</div>';
      return;
    }

    container.innerHTML = parts.map(p => `
      <div class="timeline-item">
        <div class="timeline-header">
          <span class="timeline-year">${p.year} &bull; ${p.category}</span>
          <span class="badge ${p.result.includes('bestanden') ? 'badge-success' : 'badge-info'}">${p.result}</span>
        </div>
        <h3 class="card-title" style="font-size: 1.1rem; margin-bottom: 0.25rem;">${p.course_title}</h3>
        <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 0.5rem;">
          📅 ${p.date} &nbsp;|&nbsp; Rolle: <strong>${p.role}</strong>
        </p>
        <p style="font-size: 0.8rem; color: var(--text-dim);">${p.notes || ''}</p>
      </div>
    `).join('');

  } catch (err) {
    container.innerHTML = `<div class="loading-placeholder">Fehler beim Laden: ${err.message}</div>`;
  }
}

// 5. Kursangebot laden
async function loadCourses() {
  const container = document.getElementById('coursesContainer');
  try {
    const res = await fetch('/api/courses');
    const data = await res.json();
    allCourses = data.courses || [];

    document.getElementById('statOpenOffer').textContent = allCourses.length;
    renderCourses(allCourses);
  } catch (err) {
    container.innerHTML = `<div class="loading-placeholder">Fehler beim Laden: ${err.message}</div>`;
  }
}

function renderCourses(courses) {
  const container = document.getElementById('coursesContainer');
  if (courses.length === 0) {
    container.innerHTML = '<div class="loading-placeholder">Keine Kurse gefunden, die den Suchkriterien entsprechen.</div>';
    return;
  }

  container.innerHTML = courses.map(c => `
    <div class="card">
      <div class="card-top">
        <span class="card-category">${c.category}</span>
        <span class="badge ${c.status.includes('Offen') ? 'badge-success' : 'badge-warning'}">${c.status}</span>
      </div>
      <h3 class="card-title">${c.title}</h3>
      <p class="card-subtitle">${c.description}</p>
      <div class="meta-list">
        <div class="meta-item">
          <span>Veranstalter:</span>
          <strong>${c.organizer}</strong>
        </div>
        <div class="meta-item">
          <span>Kursort:</span>
          <strong>${c.location}</strong>
        </div>
        <div class="meta-item">
          <span>Kursdatum:</span>
          <strong>${c.start_date} bis ${c.end_date}</strong>
        </div>
        <div class="meta-item">
          <span>Anmeldeschluss:</span>
          <strong style="color: var(--cevi-gold);">${c.registration_deadline}</strong>
        </div>
      </div>
      <div style="margin-top: 1rem;">
        <button class="btn btn-secondary btn-block btn-sm" onclick="alert('Anmeldung für ${c.title} wird über Cevi-DB (${c.code}) eingeleitet.')">
          📋 Kursdetails & Anmeldung
        </button>
      </div>
    </div>
  `).join('');
}

function filterCourses() {
  const search = document.getElementById('courseSearchInput').value.toLowerCase();
  const category = document.getElementById('courseCategoryFilter').value;

  const filtered = allCourses.filter(c => {
    const matchesSearch = c.title.toLowerCase().includes(search) ||
                          c.description.toLowerCase().includes(search) ||
                          c.location.toLowerCase().includes(search) ||
                          c.code.toLowerCase().includes(search);
    const matchesCat = category === 'all' || c.category === category;
    return matchesSearch && matchesCat;
  });

  renderCourses(filtered);
}

// 6. Navigation Tabs umschalten
function switchTab(tabId) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));

  const btnMap = {
    quals: 'tabQuals',
    history: 'tabHistory',
    courses: 'tabCourses',
    system: 'tabSystem'
  };

  const btn = document.getElementById(btnMap[tabId]);
  const panel = document.getElementById(`panel-${tabId}`);

  if (btn) btn.classList.add('active');
  if (panel) panel.classList.add('active');
}

// 7. Auth Aktionen
function initiateLogin() {
  window.location.href = '/api/auth/login';
}

function loginWithMock() {
  window.location.href = '/api/auth/mock-login';
}

async function logout() {
  try {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/';
  } catch (err) {
    console.error('Logout Fehler:', err);
  }
}

async function loadSystemStatus() {
  await loadConfig();
  alert('Systemstatus & Umgebungsdaten erfolgreich neu geladen!');
}
