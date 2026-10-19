import { execSync } from 'child_process';

const targetBranch = process.argv[2];

if (!targetBranch) {
  console.error('\n❌ Fehler: Bitte Zielbranch angeben!');
  console.log('Beispiel: npm run switch:dev  oder  node scripts/safe-git-switch.js <branch-name>\n');
  process.exit(1);
}

console.log('\n======================================================');
console.log('       CEVI KURSTRACKER - SAFE BRANCH SWITCHER        ');
console.log('======================================================');

try {
  // 1. Aktuellen Branch ermitteln
  const currentBranch = execSync('git branch --show-current').toString().trim();
  console.log(`📌 Aktueller Branch : ${currentBranch}`);
  console.log(`🎯 Ziel-Branch      : ${targetBranch}`);

  if (currentBranch === targetBranch) {
    console.log(`\nℹ️ Du bist bereits auf dem Branch '${targetBranch}'. Keine Aktion erforderlich.\n`);
    process.exit(0);
  }

  // 2. Status prüfen (insbesondere Untracked Files)
  const statusOutput = execSync('git status --porcelain').toString();
  const lines = statusOutput.split('\n').filter(Boolean);

  const untrackedFiles = lines.filter(l => l.startsWith('??')).map(l => l.substring(3));
  const modifiedFiles = lines.filter(l => !l.startsWith('??')).map(l => l.trim());

  if (untrackedFiles.length > 0) {
    console.log('\n🛡️  SCHUTZ VOR DATENVERLUST AKTIVIERT:');
    console.log(`   Es wurden ${untrackedFiles.length} nicht getrackte Dateien (untracked files) gefunden:`);
    untrackedFiles.forEach(f => console.log(`   - ${f}`));
    
    console.log('\n📦 Sichere nicht getrackte und geänderte Dateien vor Branch-Wechsel im Git Stash...');
    const stashMsg = `safe_switch_backup_${currentBranch}_to_${targetBranch}_${Date.now()}`;
    execSync(`git stash push -u -m "${stashMsg}"`, { stdio: 'inherit' });
    console.log(`✅ Dateien sicher in Stash "${stashMsg}" gesichert.`);
  } else if (modifiedFiles.length > 0) {
    console.log('\n📦 Geänderte getrackte Dateien gefunden. Sichere sie im Stash...');
    const stashMsg = `safe_switch_backup_${currentBranch}_to_${targetBranch}_${Date.now()}`;
    execSync(`git stash push -m "${stashMsg}"`, { stdio: 'inherit' });
    console.log(`✅ Dateien sicher in Stash gesichert.`);
  } else {
    console.log('\n✨ Working Tree ist sauber (keine nicht getrackten oder ungesicherten Dateien).');
  }

  // 3. Branch wechseln
  console.log(`\n🔀 Wechsle zu Branch '${targetBranch}'...`);
  try {
    execSync(`git switch ${targetBranch}`, { stdio: 'inherit' });
  } catch {
    // Falls Branch noch nicht lokal existiert, versuche checkout -b oder checkout
    try {
      execSync(`git checkout ${targetBranch}`, { stdio: 'inherit' });
    } catch {
      console.log(`Branch '${targetBranch}' existiert noch nicht lokal. Erstelle ihn...`);
      execSync(`git checkout -b ${targetBranch}`, { stdio: 'inherit' });
    }
  }

  console.log(`\n🎉 Erfolgreich gewechselt zu: ${targetBranch}`);
  console.log('Hinweis: Falls du vorherige lokale Änderungen zurückholen möchtest:');
  console.log('         git stash pop\n');

} catch (err) {
  console.error('\n❌ Fehler beim sicheren Branch-Wechsel:', err.message);
  process.exit(1);
}
