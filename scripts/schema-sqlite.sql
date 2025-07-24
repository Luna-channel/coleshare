-- SQLite数据库初始化脚本

-- 创建内容表
CREATE TABLE IF NOT EXISTS contents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  uuid TEXT UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  content_type TEXT NOT NULL CHECK (content_type IN (
    'character_card',
    'knowledge_base', 
    'event_book',
    'prompt_injection',
    'story_book',
    'other'
  )),
  blob_url TEXT NOT NULL,
  thumbnail_url TEXT,
  metadata TEXT,
  tags TEXT,
  sort_order INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 创建访问日志表
CREATE TABLE IF NOT EXISTS access_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  content_id INTEGER REFERENCES contents(id),
  access_type TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 创建站点设置表
CREATE TABLE IF NOT EXISTS site_settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  site_name TEXT DEFAULT 'OMateShare',
  show_download_link INTEGER DEFAULT 1,
  page_title TEXT DEFAULT 'OMateShare',
  meta_description TEXT DEFAULT '管理角色卡、知识库、事件书和提示注入',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 插入默认站点设置（如果不存在）
INSERT OR IGNORE INTO site_settings (id, site_name, show_download_link, page_title, meta_description)
VALUES (1, 'OMateShare', 1, 'OMateShare', '管理角色卡、知识库、事件书和提示注入');

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_contents_content_type ON contents(content_type);
CREATE INDEX IF NOT EXISTS idx_access_logs_content_id ON access_logs(content_id);
CREATE INDEX IF NOT EXISTS idx_contents_created_at ON contents(created_at);
CREATE INDEX IF NOT EXISTS idx_contents_updated_at ON contents(updated_at);