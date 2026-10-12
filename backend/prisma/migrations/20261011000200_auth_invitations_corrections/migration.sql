BEGIN;
ALTER TABLE users ADD COLUMN email varchar(254), ADD COLUMN email_verified boolean NOT NULL DEFAULT false, ADD COLUMN image text;
ALTER TABLE users ALTER COLUMN auth_provider SET DEFAULT 'local';
CREATE UNIQUE INDEX users_email_key ON users(email);
ALTER TABLE users ADD CONSTRAINT users_email_ck CHECK (email IS NULL OR (email = lower(email) AND length(btrim(email)) > 0));

CREATE TABLE auth_sessions (
  id uuid PRIMARY KEY, token text NOT NULL UNIQUE, user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  expires_at timestamptz NOT NULL, ip_address varchar(64), user_agent text,
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX auth_sessions_user_id_idx ON auth_sessions(user_id);
CREATE TABLE auth_accounts (
  id uuid PRIMARY KEY, user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  account_id text NOT NULL, provider_id text NOT NULL, password text,
  access_token text, refresh_token text, id_token text, access_token_expires_at timestamptz, refresh_token_expires_at timestamptz, scope text,
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(provider_id, account_id)
);
CREATE INDEX auth_accounts_user_id_idx ON auth_accounts(user_id);
CREATE TABLE auth_verifications (
  id uuid PRIMARY KEY, identifier text NOT NULL, value text NOT NULL, expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX auth_verifications_identifier_idx ON auth_verifications(identifier);
CREATE TABLE group_invitations (
  id uuid PRIMARY KEY, group_id uuid NOT NULL REFERENCES groups(id) ON DELETE RESTRICT,
  email varchar(254) NOT NULL CHECK (email = lower(email) AND length(btrim(email)) > 0),
  role membership_role NOT NULL DEFAULT 'USER', token_hash varchar(64) NOT NULL UNIQUE CHECK (token_hash ~ '^[0-9a-f]{64}$'),
  expires_at timestamptz NOT NULL, created_by uuid NOT NULL,
  accepted_at timestamptz, accepted_by uuid, revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK ((accepted_at IS NULL) = (accepted_by IS NULL)), CHECK (expires_at > created_at),
  FOREIGN KEY (group_id, created_by) REFERENCES memberships(group_id, user_id) ON DELETE RESTRICT,
  FOREIGN KEY (group_id, accepted_by) REFERENCES memberships(group_id, user_id) ON DELETE RESTRICT
);
CREATE INDEX group_invitations_group_id_created_at_idx ON group_invitations(group_id, created_at);

ALTER TABLE payments ADD COLUMN replaces_id uuid UNIQUE, ADD CONSTRAINT payments_group_id_id_key UNIQUE(group_id, id);
ALTER TABLE payments ADD CONSTRAINT payments_replaces_fk FOREIGN KEY(group_id, replaces_id) REFERENCES payments(group_id, id) ON DELETE RESTRICT;
ALTER TABLE payments ADD CONSTRAINT payments_no_self_replace_ck CHECK (replaces_id IS NULL OR replaces_id <> id);
ALTER TABLE expenses ADD COLUMN replaces_id uuid UNIQUE, ADD CONSTRAINT expenses_group_id_id_key UNIQUE(group_id, id);
ALTER TABLE expenses ADD CONSTRAINT expenses_replaces_fk FOREIGN KEY(group_id, replaces_id) REFERENCES expenses(group_id, id) ON DELETE RESTRICT;
ALTER TABLE expenses ADD CONSTRAINT expenses_no_self_replace_ck CHECK (replaces_id IS NULL OR replaces_id <> id);
COMMIT;
