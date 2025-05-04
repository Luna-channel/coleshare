import { type NextRequest, NextResponse } from "next/server"
import { withAdminAuth } from "@/lib/auth"
import { neon } from "@neondatabase/serverless"

// 数据库更新API - 仅管理员可访问
export const GET = withAdminAuth(async (req: NextRequest) => {
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
    
    // 更新site_settings表
    const updateResults = [];
    
    try {
      // 1. 检查site_settings表是否存在
      const tableExists = await sql`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public'
          AND table_name = 'site_settings'
        ) as exists
      `;
      
      // 如果表不存在，创建site_settings表
      if (!tableExists[0]?.exists) {
        updateResults.push("创建site_settings表");
        
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
        
        // 插入默认记录
        await sql`
          INSERT INTO site_settings (site_name, show_download_link, page_title, meta_description)
          VALUES ('OMateShare', true, 'OMateShare', '管理角色卡、知识库、事件书和提示注入')
        `;
      } else {
        updateResults.push("site_settings表已存在，无需创建");
      }
      
      // 2. 检查content_type是否包含'other'类型
      const otherTypeExists = await sql`
        SELECT EXISTS (
          SELECT 1 FROM pg_type t
          JOIN pg_enum e ON t.oid = e.enumtypid
          WHERE t.typname = 'content_type'
          AND e.enumlabel = 'other'
        ) as exists
      `;
      
      if (!otherTypeExists[0]?.exists) {
        updateResults.push("添加'other'类型到content_type枚举");
        
        await sql`
          ALTER TYPE content_type ADD VALUE IF NOT EXISTS 'other';
        `;
      } else {
        updateResults.push("content_type枚举已包含'other'类型");
      }
      
      // 3. 检查content_type是否包含'story_book'类型
      const storyBookTypeExists = await sql`
        SELECT EXISTS (
          SELECT 1 FROM pg_type t
          JOIN pg_enum e ON t.oid = e.enumtypid
          WHERE t.typname = 'content_type'
          AND e.enumlabel = 'story_book'
        ) as exists
      `;
      
      if (!storyBookTypeExists[0]?.exists) {
        updateResults.push("添加'story_book'类型到content_type枚举");
        
        await sql`
          ALTER TYPE content_type ADD VALUE IF NOT EXISTS 'story_book';
        `;
      } else {
        updateResults.push("content_type枚举已包含'story_book'类型");
      }
      
      return NextResponse.json({ 
        success: true, 
        message: '数据库更新完成',
        updates: updateResults
      });
    } catch (err) {
      console.error('执行数据库更新失败:', err);
      return NextResponse.json({ 
        success: false, 
        message: '执行数据库更新失败',
        error: err instanceof Error ? err.message : String(err)
      }, { status: 500 });
    }
    
  } catch (error) {
    console.error('数据库更新失败:', error);
    return NextResponse.json({ 
      success: false, 
      message: '数据库更新失败',
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}); 