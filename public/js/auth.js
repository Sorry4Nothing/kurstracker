/**
 * Cevi Kurstracker - Authentication & User Profile Sync
 * Cevi-DB (Hitobito) OAuth & Profil-Synchronisation
 */

import { formatEuropeanDate } from './utils.js';

let currentUser = null;

export function getCurrentUser() {
  return currentUser;
}

export function setCurrentUser(user) {
  currentUser = user;
}

export async function checkAuth() {
  const navUserAvatar = document.getElementById('navUserAvatar');
  const navUserCeviname = document.getElementById('navUserCeviname');
  const navUserRealname = document.getElementById('navUserRealname');
  const navUserRole = document.getElementById('navUserRole');
  const heroGreeting = document.getElementById('heroGreeting');
  const heroDescription = document.getElementById('heroDescription');
  const heroUserAvatar = document.getElementById('heroUserAvatar');

  try {
    const res = await fetch('/api/auth/me');
    if (res.ok) {
      const data = await res.json();
      if (data.authenticated && data.user) {
        currentUser = data.user;
        const initial = (currentUser.nickname || currentUser.first_name || 'S').charAt(0).toUpperCase();
        const ceviname = currentUser.nickname || currentUser.first_name || 'Siro';
        const realname = `${currentUser.first_name || 'Robin'} ${currentUser.last_name || 'Notter'}`.trim();
        const initials = ((currentUser.first_name?.[0] || 'R') + (currentUser.last_name?.[0] || currentUser.nickname?.[0] || 'N')).toUpperCase();
        const primaryRole = currentUser.roles?.[0] || 'Abteilungsleiter';
        const role = currentUser.roles?.join(', ') || 'Leiter Lagersport/Trekking';
        const group = currentUser.groups?.[0]?.name || 'Cevi Winti';

        if (navUserAvatar) navUserAvatar.textContent = initial;
        if (navUserCeviname) navUserCeviname.textContent = ceviname;
        if (navUserRealname) navUserRealname.textContent = realname;
        if (navUserRole) navUserRole.textContent = primaryRole;
        if (heroUserAvatar) heroUserAvatar.textContent = initial;
        if (heroGreeting) heroGreeting.textContent = `Hallo ${ceviname}! Dein persoenlicher Ausbildungsweg`;
        if (heroDescription) {
          heroDescription.textContent = `Abteilung: ${group} • Anerkennung: J+S ${role} • Naechster Schritt: Kaderstufe (LLM / SLK)`;
        }

        // Dynamisches Profilfoto aus DB oder Initials-Fallback
        const navUserInitials = document.getElementById('navUserInitials');
        const profileHeroInitials = document.getElementById('profileHeroInitials');
        const navUserPhoto = document.getElementById('navUserPhoto');
        const profileHeroPhoto = document.getElementById('profileHeroPhoto');

        if (navUserInitials) navUserInitials.textContent = initials;
        if (profileHeroInitials) profileHeroInitials.textContent = initials;

        if (currentUser.picture_url) {
          if (navUserPhoto) {
            navUserPhoto.src = currentUser.picture_url;
            navUserPhoto.style.display = 'block';
          }
          if (profileHeroPhoto) {
            profileHeroPhoto.src = currentUser.picture_url;
            profileHeroPhoto.style.display = 'block';
          }
        } else {
          if (navUserPhoto) {
            navUserPhoto.src = '';
            navUserPhoto.style.display = 'none';
          }
          if (profileHeroPhoto) {
            profileHeroPhoto.src = '';
            profileHeroPhoto.style.display = 'none';
          }
        }

        // Stufenleiter-Planer Zugriffskontrolle (nur sichtbar fuer Stufenleiter, Abteilungsleiter, Kader, Kursleiter)
        const allowedRoles = ['abteilungsleiter', 'stufenleiter', 'kader', 'kursleiter', 'admin'];
        const userRoles = (currentUser.roles || []).map(r => String(r).toLowerCase());
        const hasPlannerPermission = userRoles.some(r => allowedRoles.some(ar => r.includes(ar)));

        const tabPlanner = document.getElementById('tabPlanner');
        if (tabPlanner) {
          tabPlanner.style.display = hasPlannerPermission ? 'flex' : 'none';
        }

        // Stammdaten im Profil-Modal & Cockpit aktualisieren (europaeisches Format)
        const dbBirthdate = document.getElementById('dbBirthdate');
        const profileDbBirthdate = document.getElementById('profileDbBirthdate');
        const formattedBday = currentUser.birthday ? `${formatEuropeanDate(currentUser.birthday)} (25 Jahre)` : '14.08.2001 (25 Jahre)';
        if (dbBirthdate) dbBirthdate.textContent = formattedBday;
        if (profileDbBirthdate) profileDbBirthdate.textContent = formattedBday;

        const dbRealName = document.getElementById('dbRealName');
        if (dbRealName) dbRealName.textContent = realname;
        const profileDbRealName = document.getElementById('profileDbRealName');
        if (profileDbRealName) profileDbRealName.textContent = realname;

        const dbCevinameEl = document.getElementById('dbCeviname');
        if (dbCevinameEl) dbCevinameEl.textContent = ceviname;
        const profileDbCeviname = document.getElementById('profileDbCeviname');
        if (profileDbCeviname) profileDbCeviname.textContent = ceviname;

        const profileHeroName = document.getElementById('profileHeroName');
        if (profileHeroName) profileHeroName.textContent = realname;
        const profileHeroCeviname = document.getElementById('profileHeroCeviname');
        if (profileHeroCeviname) profileHeroCeviname.textContent = `«${ceviname}»`;
      }
    }
  } catch (err) {
    console.warn('Auth check fallback:', err);
  }
}

export function initiateLogin() {
  window.location.href = '/api/auth/login';
}

export function loginWithMock() {
  window.location.href = '/api/auth/mock-login';
}

export async function logout() {
  try {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.reload();
  } catch (err) {
    console.error('Logout fehlgeschlagen:', err);
  }
}
