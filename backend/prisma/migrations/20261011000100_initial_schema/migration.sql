-- Migration inicial do Pelazzo, derivada do modelo físico documentado em .ai/database.
-- Inclui checks e índices parciais que devem ser preservados em novas migrations.
-- IDs UUID são fornecidos pelo Prisma/Infrastructure. updated_at é mantido pelo ORM.
BEGIN;

CREATE TYPE membership_role AS ENUM ('USER', 'ADMIN');
CREATE TYPE participant_modality AS ENUM ('MONTHLY', 'DAILY');
CREATE TYPE match_status AS ENUM ('SCHEDULED', 'FINISHED', 'CANCELED');
CREATE TYPE financial_status AS ENUM ('CONFIRMED', 'VOIDED');
CREATE TYPE payment_method AS ENUM ('PIX', 'CASH', 'OTHER');
CREATE TYPE pix_key_type AS ENUM ('CPF', 'CNPJ', 'EMAIL', 'PHONE', 'RANDOM');

CREATE TABLE users (
    id uuid PRIMARY KEY,
    display_name varchar(120) NOT NULL CHECK (length(btrim(display_name)) > 0),
    auth_provider varchar(100) NOT NULL CHECK (length(btrim(auth_provider)) > 0),
    auth_subject varchar(255) NOT NULL CHECK (length(btrim(auth_subject)) > 0),
    created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (auth_provider, auth_subject)
);

CREATE TABLE groups (
    id uuid PRIMARY KEY,
    name varchar(80) NOT NULL CHECK (length(btrim(name)) BETWEEN 2 AND 80),
    primary_color varchar(7) NOT NULL DEFAULT '#15803D'
        CHECK (primary_color ~ '^#[0-9A-Fa-f]{6}$'),
    timezone varchar(100) NOT NULL DEFAULT 'America/Sao_Paulo'
        CHECK (length(btrim(timezone)) > 0),
    created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE memberships (
    id uuid PRIMARY KEY,
    group_id uuid NOT NULL REFERENCES groups(id) ON DELETE RESTRICT,
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    role membership_role NOT NULL DEFAULT 'USER',
    active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (group_id, user_id)
);
CREATE INDEX memberships_user_active_idx ON memberships(user_id, active);

CREATE TABLE participants (
    id uuid PRIMARY KEY,
    group_id uuid NOT NULL REFERENCES groups(id) ON DELETE RESTRICT,
    user_id uuid REFERENCES users(id) ON DELETE RESTRICT,
    name varchar(120) NOT NULL CHECK (length(btrim(name)) > 0),
    modality participant_modality NOT NULL,
    active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (group_id, id),
    FOREIGN KEY (group_id, user_id) REFERENCES memberships(group_id, user_id)
        ON DELETE RESTRICT
);
CREATE UNIQUE INDEX participants_active_user_uq ON participants(group_id, user_id)
    WHERE active AND user_id IS NOT NULL;

CREATE TABLE matches (
    id uuid PRIMARY KEY,
    group_id uuid NOT NULL REFERENCES groups(id) ON DELETE RESTRICT,
    title varchar(120) NOT NULL CHECK (length(btrim(title)) > 0),
    starts_at timestamptz NOT NULL,
    location varchar(255),
    status match_status NOT NULL DEFAULT 'SCHEDULED',
    created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (group_id, id)
);
CREATE INDEX matches_group_start_idx ON matches(group_id, starts_at);

CREATE TABLE match_participants (
    id uuid PRIMARY KEY,
    group_id uuid NOT NULL REFERENCES groups(id) ON DELETE RESTRICT,
    match_id uuid NOT NULL,
    participant_id uuid NOT NULL,
    modality_snapshot participant_modality NOT NULL,
    expected_amount_cents integer CHECK (expected_amount_cents > 0),
    created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (group_id, match_id, participant_id),
    UNIQUE (group_id, id, participant_id),
    FOREIGN KEY (group_id, match_id) REFERENCES matches(group_id, id) ON DELETE RESTRICT,
    FOREIGN KEY (group_id, participant_id) REFERENCES participants(group_id, id) ON DELETE RESTRICT
);
CREATE INDEX match_participants_participant_idx ON match_participants(group_id, participant_id);

CREATE TABLE payments (
    id uuid PRIMARY KEY,
    group_id uuid NOT NULL REFERENCES groups(id) ON DELETE RESTRICT,
    participant_id uuid NOT NULL,
    match_participant_id uuid,
    competence varchar(7),
    amount_cents integer NOT NULL CHECK (amount_cents > 0),
    currency varchar(3) NOT NULL DEFAULT 'BRL' CHECK (currency = 'BRL'),
    received_at timestamptz NOT NULL,
    method payment_method NOT NULL,
    status financial_status NOT NULL DEFAULT 'CONFIRMED',
    recorded_by uuid NOT NULL,
    void_reason varchar(500),
    voided_by uuid,
    voided_at timestamptz,
    idempotency_key varchar(128) NOT NULL CHECK (length(btrim(idempotency_key)) > 0),
    created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (group_id, idempotency_key),
    CONSTRAINT payments_reference_ck CHECK (
        (match_participant_id IS NOT NULL AND competence IS NULL) OR
        (match_participant_id IS NULL AND competence IS NOT NULL)
    ),
    CONSTRAINT payments_competence_ck CHECK (
        competence IS NULL OR competence ~ '^[1-9][0-9]{3}-(0[1-9]|1[0-2])$'
    ),
    CONSTRAINT payments_void_ck CHECK (
        (status = 'CONFIRMED' AND void_reason IS NULL AND voided_by IS NULL AND voided_at IS NULL) OR
        (status = 'VOIDED' AND void_reason IS NOT NULL AND length(btrim(void_reason)) > 0
            AND voided_by IS NOT NULL AND voided_at IS NOT NULL)
    ),
    FOREIGN KEY (group_id, participant_id) REFERENCES participants(group_id, id) ON DELETE RESTRICT,
    FOREIGN KEY (group_id, match_participant_id, participant_id)
        REFERENCES match_participants(group_id, id, participant_id) ON DELETE RESTRICT,
    FOREIGN KEY (group_id, recorded_by) REFERENCES memberships(group_id, user_id) ON DELETE RESTRICT,
    FOREIGN KEY (group_id, voided_by) REFERENCES memberships(group_id, user_id) ON DELETE RESTRICT
);
CREATE INDEX payments_participation_status_idx ON payments(group_id, match_participant_id, status);
CREATE INDEX payments_participant_received_idx ON payments(group_id, participant_id, received_at);
CREATE INDEX payments_competence_status_idx ON payments(group_id, competence, status)
    WHERE competence IS NOT NULL;

CREATE TABLE expenses (
    id uuid PRIMARY KEY,
    group_id uuid NOT NULL REFERENCES groups(id) ON DELETE RESTRICT,
    match_id uuid NOT NULL,
    description varchar(255) NOT NULL CHECK (length(btrim(description)) > 0),
    amount_cents integer NOT NULL CHECK (amount_cents > 0),
    currency varchar(3) NOT NULL DEFAULT 'BRL' CHECK (currency = 'BRL'),
    occurred_at timestamptz NOT NULL,
    status financial_status NOT NULL DEFAULT 'CONFIRMED',
    recorded_by uuid NOT NULL,
    void_reason varchar(500),
    voided_by uuid,
    voided_at timestamptz,
    idempotency_key varchar(128) NOT NULL CHECK (length(btrim(idempotency_key)) > 0),
    created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (group_id, idempotency_key),
    CONSTRAINT expenses_void_ck CHECK (
        (status = 'CONFIRMED' AND void_reason IS NULL AND voided_by IS NULL AND voided_at IS NULL) OR
        (status = 'VOIDED' AND void_reason IS NOT NULL AND length(btrim(void_reason)) > 0
            AND voided_by IS NOT NULL AND voided_at IS NOT NULL)
    ),
    FOREIGN KEY (group_id, match_id) REFERENCES matches(group_id, id) ON DELETE RESTRICT,
    FOREIGN KEY (group_id, recorded_by) REFERENCES memberships(group_id, user_id) ON DELETE RESTRICT,
    FOREIGN KEY (group_id, voided_by) REFERENCES memberships(group_id, user_id) ON DELETE RESTRICT
);
CREATE INDEX expenses_match_status_idx ON expenses(group_id, match_id, status);

CREATE TABLE pix_settings (
    group_id uuid PRIMARY KEY REFERENCES groups(id) ON DELETE RESTRICT,
    recipient_admin_user_id uuid NOT NULL,
    key_type pix_key_type NOT NULL,
    key_value varchar(255) NOT NULL CHECK (length(btrim(key_value)) > 0),
    recipient_name varchar(120) NOT NULL CHECK (length(btrim(recipient_name)) > 0),
    contact_phone varchar(16) NOT NULL CHECK (contact_phone ~ '^\+[1-9][0-9]{7,14}$'),
    created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (group_id, recipient_admin_user_id)
        REFERENCES memberships(group_id, user_id) ON DELETE RESTRICT
);

CREATE TABLE audit_events (
    id uuid PRIMARY KEY,
    group_id uuid NOT NULL REFERENCES groups(id) ON DELETE RESTRICT,
    actor_user_id uuid NOT NULL,
    action varchar(100) NOT NULL CHECK (length(btrim(action)) > 0),
    entity_type varchar(100) NOT NULL CHECK (length(btrim(entity_type)) > 0),
    entity_id uuid NOT NULL,
    metadata jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(metadata) = 'object'),
    created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (group_id, actor_user_id) REFERENCES memberships(group_id, user_id) ON DELETE RESTRICT
);
CREATE INDEX audit_events_group_created_idx ON audit_events(group_id, created_at);

COMMIT;
