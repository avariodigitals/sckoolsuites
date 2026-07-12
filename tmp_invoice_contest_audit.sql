CREATE TABLE IF NOT EXISTS "invoice_contest_audit" (
  id SERIAL PRIMARY KEY,
  school_id TEXT NOT NULL DEFAULT 'default',
  invoice_id INTEGER NOT NULL,
  actor_user_id INTEGER,
  actor_role TEXT,
  action TEXT NOT NULL,
  details JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  CONSTRAINT invoice_contest_audit_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES invoice(id) ON DELETE CASCADE,
  CONSTRAINT invoice_contest_audit_actor_user_id_fkey FOREIGN KEY (actor_user_id) REFERENCES "user"(id) ON DELETE SET NULL,
  CONSTRAINT invoice_contest_audit_school_id_fkey FOREIGN KEY (school_id) REFERENCES school(id)
);
CREATE INDEX IF NOT EXISTS invoice_contest_audit_school_id_idx ON invoice_contest_audit(school_id);
CREATE INDEX IF NOT EXISTS invoice_contest_audit_invoice_id_idx ON invoice_contest_audit(invoice_id);
CREATE INDEX IF NOT EXISTS invoice_contest_audit_actor_user_id_idx ON invoice_contest_audit(actor_user_id);
