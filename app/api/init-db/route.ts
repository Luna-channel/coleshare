import { NextResponse } from 'next/server';
import { neon } from "@neondatabase/serverless";
import fs from 'fs';
import path from 'path';

// GET请求处理函数
export async function GET() {
  try {
    // 检查数据库连接
    if (!process.env.DATABASE_URL) {
      return NextResponse.json({ 
        success: false, 
        message: 'DATABASE_URL 环境变量未设置' 
      }, { status: 500 });
    }

    // 初始化数据库连接
    const sql = neon(process.env.DATABASE_URL);
    
    // 检查contents表是否存在
    const tableExists = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public'
        AND table_name = 'contents'
      ) as exists
    `;
    
    if (tableExists[0]?.exists) {
      return NextResponse.json({ 
        success: true, 
        message: '数据库结构已存在，无需初始化' 
      });
    }
    
    // 读取schema.sql文件
    const schemaPath = path.join(process.cwd(), 'scripts', 'schema.sql');
    
    // 检查文件是否存在
    if (!fs.existsSync(schemaPath)) {
      return NextResponse.json({ 
        success: false, 
        message: '未找到schema.sql文件，无法初始化数据库' 
      }, { status: 500 });
    }

    const schemaSQL = fs.readFileSync(schemaPath, 'utf8');
    
    try {
      // 手动执行特定的表创建SQL语句
      // 1. 创建content_type枚举类型
      await sql`
        DO $$
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'content_type') THEN
                CREATE TYPE content_type AS ENUM (
                  'character_card',
                  'knowledge_base',
                  'event_book',
                  'prompt_injection',
                  'story_book'
                );
            END IF;
        END$$;
      `;
      
      // 2. 创建contents表
      await sql`
        CREATE TABLE IF NOT EXISTS contents (
          id SERIAL PRIMARY KEY,
          uuid VARCHAR(36) UNIQUE,
          name VARCHAR(255) NOT NULL,
          description TEXT,
          content_type content_type NOT NULL,
          blob_url TEXT NOT NULL,
          thumbnail_url TEXT,
          metadata JSONB,
          tags TEXT[],
          sort_order INTEGER,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `;
      
      // 3. 创建access_logs表
      await sql`
        CREATE TABLE IF NOT EXISTS access_logs (
          id SERIAL PRIMARY KEY,
          content_id INTEGER REFERENCES contents(id),
          access_type VARCHAR(50) NOT NULL,
          ip_address VARCHAR(100),
          user_agent TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `;
      
      // 4. 创建site_settings表
      await sql`
        CREATE TABLE IF NOT EXISTS site_settings (
          id SERIAL PRIMARY KEY,
          site_name VARCHAR(255) DEFAULT 'OMateShare',
          show_download_link BOOLEAN DEFAULT true,
          page_title VARCHAR(255) DEFAULT 'OMateShare',
          meta_description TEXT DEFAULT '管理角色卡、知识库、事件书和提示注入',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `;
      
      // 5. 检查site_settings表是否有记录，没有则插入默认记录
      const settingsExist = await sql`
        SELECT COUNT(*) FROM site_settings
      `;
      
      if (parseInt(settingsExist[0].count) === 0) {
        await sql`
          INSERT INTO site_settings (site_name, show_download_link, page_title, meta_description)
          VALUES ('OMateShare', true, 'OMateShare', '管理角色卡、知识库、事件书和提示注入')
        `;
      }
      
      // 6. 创建索引
      await sql`CREATE INDEX IF NOT EXISTS idx_contents_content_type ON contents(content_type);`;
      await sql`CREATE INDEX IF NOT EXISTS idx_access_logs_content_id ON access_logs(content_id);`;
      await sql`CREATE INDEX IF NOT EXISTS idx_contents_created_at ON contents(created_at);`;
      await sql`CREATE INDEX IF NOT EXISTS idx_contents_updated_at ON contents(updated_at);`;
      await sql`CREATE INDEX IF NOT EXISTS idx_contents_sort_order ON contents(sort_order);`;
      
      return NextResponse.json({ 
        success: true, 
        message: '数据库初始化完成'
      });
    } catch (err) {
      console.error('执行SQL脚本失败:', err);
      return NextResponse.json({ 
        success: false, 
        message: '执行SQL脚本失败',
        error: err instanceof Error ? err.message : String(err)
      }, { status: 500 });
    }
    
  } catch (error) {
    console.error('数据库初始化失败:', error);
    return NextResponse.json({ 
      success: false, 
      message: '数据库初始化失败',
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 