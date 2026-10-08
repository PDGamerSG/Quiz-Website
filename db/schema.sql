CREATE TABLE IF NOT EXISTS quizly_quizzes (
  id uuid PRIMARY KEY,
  owner_key text NOT NULL,
  title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 180),
  title_key text NOT NULL,
  questions jsonb NOT NULL CHECK (jsonb_typeof(questions) = 'array'),
  question_count integer NOT NULL CHECK (question_count BETWEEN 1 AND 2000),
  revision integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (owner_key, title_key)
);

CREATE INDEX IF NOT EXISTS quizly_quizzes_owner_updated
  ON quizly_quizzes (owner_key, updated_at DESC);

CREATE TABLE IF NOT EXISTS quizly_attempts (
  id uuid PRIMARY KEY,
  owner_key text NOT NULL,
  quiz_id uuid REFERENCES quizly_quizzes(id) ON DELETE SET NULL,
  subject text NOT NULL CHECK (char_length(subject) BETWEEN 1 AND 360),
  questions jsonb NOT NULL CHECK (jsonb_typeof(questions) = 'array'),
  answers jsonb NOT NULL CHECK (jsonb_typeof(answers) = 'object'),
  settings jsonb NOT NULL CHECK (jsonb_typeof(settings) = 'object'),
  elapsed_ms bigint NOT NULL CHECK (elapsed_ms >= 0),
  correct integer NOT NULL CHECK (correct >= 0),
  wrong integer NOT NULL CHECK (wrong >= 0),
  skipped integer NOT NULL CHECK (skipped >= 0),
  question_count integer NOT NULL CHECK (question_count BETWEEN 1 AND 2000),
  completed_at timestamptz NOT NULL DEFAULT now(),
  CHECK (correct + wrong + skipped = question_count)
);

CREATE INDEX IF NOT EXISTS quizly_attempts_owner_completed
  ON quizly_attempts (owner_key, completed_at DESC);
