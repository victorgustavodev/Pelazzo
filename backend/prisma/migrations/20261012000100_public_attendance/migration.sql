CREATE TABLE match_attendance_links (
  id UUID PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE RESTRICT ON UPDATE NO ACTION,
  match_id UUID NOT NULL,
  token_hash VARCHAR(64) NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_by UUID NOT NULL,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT match_attendance_links_match_id_key UNIQUE (match_id),
  CONSTRAINT match_attendance_links_token_hash_key UNIQUE (token_hash),
  CONSTRAINT match_attendance_links_group_match_key UNIQUE (group_id, match_id),
  CONSTRAINT match_attendance_links_group_id_match_id_fkey FOREIGN KEY (group_id, match_id) REFERENCES matches(group_id, id) ON DELETE RESTRICT ON UPDATE NO ACTION,
  CONSTRAINT match_attendance_links_group_id_created_by_fkey FOREIGN KEY (group_id, created_by) REFERENCES memberships(group_id, user_id) ON DELETE RESTRICT ON UPDATE NO ACTION,
  CONSTRAINT match_attendance_links_hash_check CHECK (token_hash ~ '^[0-9a-f]{64}$')
);
ALTER TABLE match_participants ADD COLUMN public_confirmed_at TIMESTAMPTZ;
ALTER TABLE audit_events ALTER COLUMN actor_user_id DROP NOT NULL;
-- Permite reaproveitar um jogador ativo sem impor unicidade a homônimos.
CREATE INDEX participants_group_active_name_idx ON participants (
  group_id, lower(regexp_replace(normalize(btrim(name), NFC), '[[:space:]]+', ' ', 'g'))
) WHERE active = TRUE;
