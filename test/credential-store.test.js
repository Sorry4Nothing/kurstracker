import { test } from 'node:test';
import assert from 'node:assert/strict';
import { encrypt, decrypt, createCredentialStore } from '../src/services/credentialStore.js';
import { leadDepartments, ABTEILUNGSLEITUNG } from '../src/domain/plannerAccess.js';

const key = Buffer.alloc(32, 7);

test('Credential-Store: Chiffretext lässt sich nur mit Schlüssel und passender Abteilung entschlüsseln (#129)', () => {
  const payload = encrypt('geheim-1234', key, '42');
  assert.ok(!payload.includes('geheim'));
  assert.equal(decrypt(payload, key, '42'), 'geheim-1234');
  assert.throws(() => decrypt(payload, key, '43'));
  assert.throws(() => decrypt(payload, Buffer.alloc(32, 8), '42'));
});

test('Credential-Store: speichert nie Klartext und liefert nur Status mit letzten 4 Zeichen (#129)', async () => {
  const rows = new Map();
  const query = async (sql, params) => {
    if (sql.includes('CREATE')) return { rows: [] };
    if (sql.includes('INSERT')) {
      const [id, , ciphertext, last4, savedBy] = params;
      rows.set(id, { ciphertext, last4, saved_by: savedBy, saved_at: new Date('2026-10-27T10:00:00Z') });
      return { rows: [rows.get(id)] };
    }
    if (sql.includes('DELETE')) return { rowCount: rows.delete(params[0]) ? 1 : 0, rows: [] };
    return { rows: rows.has(params[0]) ? [rows.get(params[0])] : [] };
  };
  const store = createCredentialStore({ query, key });

  assert.deepEqual(await store.status('42'), { configured: false });
  const saved = await store.save({ departmentId: '42', departmentName: 'Bern', token: 'abcdef-9876', savedBy: 'p_1' });
  assert.deepEqual(saved, { configured: true, last4: '9876', savedAt: '2026-10-27T10:00:00.000Z', savedBy: 'p_1' });
  assert.ok(!JSON.stringify([...rows.values()]).includes('abcdef'));
  assert.equal(await store.reveal('42'), 'abcdef-9876');
  assert.equal(await store.remove('42'), true);
  assert.equal(await store.remove('42'), false);
});

test('Credential-Store: leadDepartments liefert nur Abteilungen mit Abteilungsleitungs-Rolle (#129)', () => {
  assert.deepEqual(leadDepartments({ roles: ['Mitglied'] }), []);
  assert.deepEqual(leadDepartments({ roles: [{ group_id: 7, group_name: 'Bern', role_class: ABTEILUNGSLEITUNG }] }), [{ id: '7', name: 'Bern' }]);
  assert.deepEqual(leadDepartments({ roles: ['Abteilungsleiter'], groups: [{ id: 104, name: 'Cevi Abteilung Zürcher Oberland', role: 'Abteilungsleiter' }, { id: 1, name: 'Cevi Schweiz', role: 'Mitglied' }] }), [{ id: '104', name: 'Cevi Abteilung Zürcher Oberland' }]);
  assert.deepEqual(leadDepartments({ roles: [{ group_id: 8, role_class: 'Group::Abteilung::Mitglied' }] }), []);
});
