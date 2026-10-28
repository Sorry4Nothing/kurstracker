/**
 * Cevi Kurstracker - Authentication & User Profile Sync
 * Cevi-DB (Hitobito) OAuth & Profil-Synchronisation
 */

import { formatEuropeanDate } from './utils.js';

// Alter in ganzen Jahren aus einem ISO-Geburtsdatum (YYYY-MM-DD), sonst null
function ageInYears(birthday, today = new Date()) {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(birthday || ''));
  if (!match) return null;
  const [year, month, day] = match.slice(1).map(Number);
  let age = today.getFullYear() - year;
  const currentMonth = today.getMonth() + 1;
  if (currentMonth < month || (currentMonth === month && today.getDate() < day)) {
    age--;
  }
  return age;
}

function setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

function setPhoto(id, url) {
  const img = document.getElementById(id);
  if (!img) return;
  // Property statt onerror-Attribut: die CSP erlaubt keine Inline-Handler (#171). Ein kaputtes Bild bleibt verborgen
  img.onerror = () => { img.style.display = 'none'; };
  img.src = url || '';
  img.style.display = url ? 'block' : 'none';
}

export async function checkAuth() {
  try {
    const res = await fetch('/api/auth/me');
    if (!res.ok) return;
    const data = await res.json();
    if (!data.authenticated || !data.user) return;

    const user = data.user;
    const ceviname = user.nickname || user.first_name || '';
    const realname = `${user.first_name || ''} ${user.last_name || ''}`.trim();
    const initials = ((user.first_name?.[0] || '') + (user.last_name?.[0] || user.nickname?.[0] || '')).toUpperCase();
    const age = ageInYears(user.birthday);

    setText('navUserCeviname', ceviname);
    setText('navUserRealname', realname);
    setText('navUserRole', user.roles?.[0] || '');

    // Dynamisches Profilfoto aus DB oder Initials-Fallback
    setText('navUserInitials', initials);
    setText('profileHeroInitials', initials);
    setPhoto('navUserPhoto', user.picture_url);
    setPhoto('profileHeroPhoto', user.picture_url);

    // Stufenleiter-Planer nur sichtbar, wenn der Server die Rolle freigibt
    const tabPlanner = document.getElementById('tabPlanner');
    if (tabPlanner) {
      tabPlanner.style.display = data.canUsePlanner ? 'flex' : 'none';
    }

    // Kursvorschläge und Umgebungseinstellungen nur für Abteilungsleitungen
    const tabProposals = document.getElementById('tabProposals');
    if (tabProposals) tabProposals.hidden = !data.canReviewProposals;
    const tabSettings = document.getElementById('tabSettings');
    if (tabSettings) tabSettings.hidden = !data.canManageSettings;
    const tabSystemLog = document.getElementById('tabSystemLog');
    if (tabSystemLog) tabSystemLog.hidden = !data.canViewSystemLog;

    // Stammdaten im Profil-Cockpit aktualisieren (europaeisches Format)
    setText('profileDbBirthdate', user.birthday
      ? `${formatEuropeanDate(user.birthday)}${age !== null ? ` (${age} Jahre)` : ''}`
      : 'Unbekannt');
    setText('profileHeroName', realname);
    setText('profileHeroCeviname', `«${ceviname}»`);
  } catch (err) {
    console.warn('Auth check fallback:', err);
  }
}
