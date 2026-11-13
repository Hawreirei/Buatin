-- Learning Chinese core schema (PostgreSQL / Supabase). Target: HSK 3.0 (2025 syllabus).

-- Level 7 stands for the combined advanced band 7-9.
create table vocab (
  id           integer primary key,            -- official syllabus sequence number (1..11000)
  level        smallint not null check (level between 1 and 7),
  also_levels  smallint[] not null default '{}', -- other bands where the word returns with another sense
  word         text not null,
  homograph    smallint,                        -- official marker, e.g. 点1 -> word '点', homograph 1
  pinyin       text not null,
  pos          text not null default '',
  gloss_en     text[]                           -- CC-CEDICT (CC BY-SA 4.0); not in official syllabus
);
create index vocab_level_idx on vocab (level);
create index vocab_word_idx on vocab (word);

create table handwriting_char (   -- the official list of 1,200 characters to write by hand
  id    integer primary key,
  level smallint not null check (level between 1 and 7),
  char  text not null
);

create table exam_blueprint (
  id        serial primary key,
  syllabus  text not null,
  level     smallint not null,
  verified  boolean not null default false,
  spec      jsonb not null,
  unique (syllabus, level)
);

create type question_status as enum ('draft', 'auto_rejected', 'needs_review', 'approved', 'retired');

create table question (
  id             uuid primary key default gen_random_uuid(),
  syllabus       text not null,
  level          smallint not null,
  skill          text not null check (skill in ('listening','reading','writing','speaking')),
  part_type      text not null,
  payload        jsonb not null,     -- stem, options, audio_url, image_url ...
  answer_key     jsonb not null,
  difficulty     real,               -- calibrated later (IRT)
  status         question_status not null default 'draft',
  generator_meta jsonb not null default '{}',  -- generator_version, prompt_hash, solver result
  reviewer_id    uuid,
  created_at     timestamptz not null default now()
);
create index question_lookup_idx on question (syllabus, level, skill, part_type, status);

create table question_vocab (
  question_id uuid not null references question(id) on delete cascade,
  vocab_id    integer not null references vocab(id),
  role        text not null check (role in ('target','context','distractor')),
  primary key (question_id, vocab_id, role)
);
