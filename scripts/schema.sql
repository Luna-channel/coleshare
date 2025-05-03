-- 只有当content_type类型不存在时才创建
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'content_type') THEN
        -- 创建内容类型枚举
        CREATE TYPE content_type AS ENUM (
          'character_card',
          'knowledge_base',
          'event_book',
          'prompt_injection',
          'story_book'
        );
    END IF;
END$$;

-- 创建内容表（如果不存在）
CREATE TABLE IF NOT EXISTS contents (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  content_type content_type NOT NULL,
  blob_url TEXT NOT NULL,
  thumbnail_url TEXT,
  metadata JSONB,
  tags TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 创建访问日志表（如果不存在）
CREATE TABLE IF NOT EXISTS access_logs (
  id SERIAL PRIMARY KEY,
  content_id INTEGER REFERENCES contents(id),
  access_type VARCHAR(50) NOT NULL,
  ip_address VARCHAR(100),
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 创建索引（如果不存在）
CREATE INDEX IF NOT EXISTS idx_contents_content_type ON contents(content_type);
CREATE INDEX IF NOT EXISTS idx_access_logs_content_id ON access_logs(content_id);
CREATE INDEX IF NOT EXISTS idx_contents_created_at ON contents(created_at);
CREATE INDEX IF NOT EXISTS idx_contents_updated_at ON contents(updated_at); 