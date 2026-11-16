-- Run once in a dedicated Cloudflare D1 database bound as CANDIDATE_EVAL_DB.
CREATE TABLE IF NOT EXISTS candidate_evaluations (
 id TEXT PRIMARY KEY,
 candidate TEXT NOT NULL,
 interview_date TEXT NOT NULL,
 interviewer TEXT NOT NULL,
 total_score INTEGER NOT NULL CHECK(total_score BETWEEN 20 AND 100),
 recommendation TEXT NOT NULL,
 evaluation_json TEXT NOT NULL,
 pdf_base64 TEXT NOT NULL,
 email_state TEXT NOT NULL DEFAULT 'pending',
 email_gateway_id TEXT,
 created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_candidate_eval_created ON candidate_evaluations(created_at DESC);
