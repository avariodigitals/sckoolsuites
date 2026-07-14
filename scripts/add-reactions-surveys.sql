-- Add announcement reactions table
CREATE TABLE IF NOT EXISTS announcement_reaction (
  id SERIAL PRIMARY KEY,
  announcement_id INTEGER NOT NULL REFERENCES announcement(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  emoji VARCHAR(255) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS announcement_reaction_announcement_id_user_id_emoji_idx ON announcement_reaction(announcement_id, user_id, emoji);
CREATE INDEX IF NOT EXISTS announcement_reaction_announcement_id_idx ON announcement_reaction(announcement_id);

-- Add survey tables
CREATE TABLE IF NOT EXISTS survey (
  id SERIAL PRIMARY KEY,
  school_id VARCHAR(255) NOT NULL DEFAULT 'default' REFERENCES school(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(50) NOT NULL DEFAULT 'DRAFT',
  created_by INTEGER REFERENCES "user"(id) ON DELETE SET NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS survey_school_id_idx ON survey(school_id);
CREATE INDEX IF NOT EXISTS survey_status_idx ON survey(status);

CREATE TABLE IF NOT EXISTS survey_question (
  id SERIAL PRIMARY KEY,
  survey_id INTEGER NOT NULL REFERENCES survey(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  type VARCHAR(50) NOT NULL DEFAULT 'text',
  options TEXT,
  "order" INTEGER NOT NULL DEFAULT 0,
  required BOOLEAN NOT NULL DEFAULT true
);
CREATE INDEX IF NOT EXISTS survey_question_survey_id_idx ON survey_question(survey_id);

CREATE TABLE IF NOT EXISTS survey_response (
  id SERIAL PRIMARY KEY,
  survey_id INTEGER NOT NULL REFERENCES survey(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS survey_response_survey_id_user_id_idx ON survey_response(survey_id, user_id);
CREATE INDEX IF NOT EXISTS survey_response_survey_id_idx ON survey_response(survey_id);

CREATE TABLE IF NOT EXISTS survey_answer (
  id SERIAL PRIMARY KEY,
  response_id INTEGER NOT NULL REFERENCES survey_response(id) ON DELETE CASCADE,
  question_id INTEGER NOT NULL REFERENCES survey_question(id) ON DELETE CASCADE,
  answer_text TEXT,
  answer_value VARCHAR(255),
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS survey_answer_response_id_idx ON survey_answer(response_id);
CREATE INDEX IF NOT EXISTS survey_answer_question_id_idx ON survey_answer(question_id);
