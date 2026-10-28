import { query } from './database.js';
import { STATUS_DRAFT, STATUS_SUBMITTED } from '../domain/proposals.js';

// Kursvorschläge je Stufe (#131): eine Zeile pro Stufe, die Einträge als JSON-Array.
// Rückgabe überall: { groupId, departmentId, status, entries, updatedBy, updatedAt, submittedBy, submittedAt, returnNote } oder null,
// wenn der Statuswechsel nicht erlaubt ist (Abgegebenes lässt sich nicht überschreiben, ein Entwurf nicht zurückgeben).

const view = row => row && {
  groupId: row.group_id,
  departmentId: row.department_id,
  status: row.status,
  entries: row.entries,
  updatedBy: row.updated_by,
  updatedAt: row.updated_at.toISOString(),
  submittedBy: row.submitted_by,
  submittedAt: row.submitted_at?.toISOString() ?? null,
  returnNote: row.return_note
};

/** @param {{ query: (sql: string, params?: any[]) => Promise<{ rows: any[] }> }} deps */
export function createProposalStore({ query }) {
  let ready;
  // shortcut: Tabelle wird beim ersten Zugriff angelegt, wie bei department_credentials; bei einem dritten Schema eine Migrationsverwaltung einführen
  const ensureTable = () => (ready ??= query(`
    CREATE TABLE IF NOT EXISTS stufe_proposals (
      group_id      text PRIMARY KEY,
      department_id text NOT NULL,
      status        text NOT NULL CHECK (status IN ('${STATUS_DRAFT}', '${STATUS_SUBMITTED}')),
      entries       jsonb NOT NULL DEFAULT '[]',
      updated_by    text NOT NULL,
      updated_at    timestamptz NOT NULL DEFAULT now(),
      submitted_by  text,
      submitted_at  timestamptz,
      return_note   text
    )`).then(() => query('ALTER TABLE stufe_proposals ADD COLUMN IF NOT EXISTS return_note text')).catch(err => { ready = undefined; throw err; }));
  const one = async (sql, params) => {
    await ensureTable();
    return view((await query(sql, params)).rows[0]);
  };

  return {
    async getMany(groupIds) {
      await ensureTable();
      const { rows } = await query('SELECT * FROM stufe_proposals WHERE group_id = ANY($1)', [groupIds]);
      return new Map(rows.map(row => [row.group_id, view(row)]));
    },

    saveDraft: ({ groupId, departmentId, entries, user }) => one(`
      INSERT INTO stufe_proposals (group_id, department_id, status, entries, updated_by)
      VALUES ($1, $2, '${STATUS_DRAFT}', $3::jsonb, $4)
      ON CONFLICT (group_id) DO UPDATE SET entries = $3::jsonb, updated_by = $4, updated_at = now()
      WHERE stufe_proposals.status = '${STATUS_DRAFT}'
      RETURNING *`, [groupId, departmentId, JSON.stringify(entries), user]),

    submit: ({ groupId, departmentId, user }) => one(`
      INSERT INTO stufe_proposals (group_id, department_id, status, updated_by, submitted_by, submitted_at)
      VALUES ($1, $2, '${STATUS_SUBMITTED}', $3, $3, now())
      ON CONFLICT (group_id) DO UPDATE SET status = '${STATUS_SUBMITTED}', updated_by = $3, updated_at = now(), submitted_by = $3, submitted_at = now(), return_note = NULL
      WHERE stufe_proposals.status = '${STATUS_DRAFT}'
      RETURNING *`, [groupId, departmentId, user]),

    // Abgegeben bleibt abgegeben: nur die Einträge ändern sich (Anpassung durch die Abteilungsleitung)
    saveFinal: ({ groupId, entries, user }) => one(`
      UPDATE stufe_proposals SET entries = $2::jsonb, updated_by = $3, updated_at = now()
      WHERE group_id = $1 AND status = '${STATUS_SUBMITTED}'
      RETURNING *`, [groupId, JSON.stringify(entries), user]),

    reopen: ({ groupId, user, note = null }) => one(`
      UPDATE stufe_proposals SET status = '${STATUS_DRAFT}', updated_by = $2, updated_at = now(), submitted_by = NULL, submitted_at = NULL, return_note = $3
      WHERE group_id = $1 AND status = '${STATUS_SUBMITTED}'
      RETURNING *`, [groupId, user, note])
  };
}

// shortcut: ohne DATABASE_URL (lokale Entwicklung, Tests, Demo) liegen die Vorschläge im Arbeitsspeicher und gehen beim Neustart verloren; auf dem Server ist die Datenbank Pflicht
export function createMemoryProposalStore() {
  const rows = new Map();
  const now = () => new Date().toISOString();
  return {
    async getMany(groupIds) {
      return new Map(groupIds.filter(id => rows.has(id)).map(id => [id, structuredClone(rows.get(id))]));
    },
    async saveDraft({ groupId, departmentId, entries, user }) {
      if (rows.get(groupId)?.status === STATUS_SUBMITTED) return null;
      const saved = { groupId, departmentId, status: STATUS_DRAFT, entries: structuredClone(entries), updatedBy: user, updatedAt: now(), submittedBy: null, submittedAt: null, returnNote: rows.get(groupId)?.returnNote ?? null };
      rows.set(groupId, saved);
      return structuredClone(saved);
    },
    async submit({ groupId, departmentId, user }) {
      const row = rows.get(groupId);
      if (row?.status === STATUS_SUBMITTED) return null;
      const saved = { entries: [], ...row, groupId, departmentId, status: STATUS_SUBMITTED, updatedBy: user, updatedAt: now(), submittedBy: user, submittedAt: now(), returnNote: null };
      rows.set(groupId, saved);
      return structuredClone(saved);
    },
    async saveFinal({ groupId, entries, user }) {
      const row = rows.get(groupId);
      if (row?.status !== STATUS_SUBMITTED) return null;
      Object.assign(row, { entries: structuredClone(entries), updatedBy: user, updatedAt: now() });
      return structuredClone(row);
    },
    async reopen({ groupId, user, note = null }) {
      const row = rows.get(groupId);
      if (row?.status !== STATUS_SUBMITTED) return null;
      Object.assign(row, { status: STATUS_DRAFT, updatedBy: user, updatedAt: now(), submittedBy: null, submittedAt: null, returnNote: note });
      return structuredClone(row);
    }
  };
}

export const proposalStore = query ? createProposalStore({ query }) : createMemoryProposalStore();
