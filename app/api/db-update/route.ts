import { type NextRequest, NextResponse } from "next/server"
import { withAdminAuth } from "@/lib/auth"
import { neon } from "@neondatabase/serverless"
import { nanoid } from "nanoid"

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
      
      // 4. 检查contents表是否存在uuid字段
      const uuidColumnExists = await sql`
        SELECT EXISTS (
          SELECT FROM information_schema.columns
          WHERE table_schema = 'public'
          AND table_name = 'contents'
          AND column_name = 'uuid'
        ) as exists
      `;
      
      if (!uuidColumnExists[0]?.exists) {
        updateResults.push("向contents表添加uuid字段");
        
        // 添加uuid字段
        await sql`
          ALTER TABLE contents ADD COLUMN uuid VARCHAR(36) UNIQUE;
        `;
        
        // 为已有数据生成uuid
        const existingContents = await sql`SELECT id FROM contents`;
        
        for (const content of existingContents) {
          const uuid = nanoid(21); // 生成21位的nanoid
          await sql`
            UPDATE contents 
            SET uuid = ${uuid}
            WHERE id = ${content.id}
          `;
        }
      } else {
        updateResults.push("contents表已包含uuid字段");
        
        // 检查是否有内容没有uuid，为其添加
        const contentsWithoutUuid = await sql`
          SELECT id FROM contents 
          WHERE uuid IS NULL
        `;
        
        if (contentsWithoutUuid.length > 0) {
          updateResults.push(`为${contentsWithoutUuid.length}条内容添加uuid`);
          
          for (const content of contentsWithoutUuid) {
            const uuid = nanoid(21);
            await sql`
              UPDATE contents 
              SET uuid = ${uuid}
              WHERE id = ${content.id}
            `;
          }
        }
      }
      
      // 5. 检查contents表是否存在sort_order字段
      const sortOrderColumnExists = await sql`
        SELECT EXISTS (
          SELECT FROM information_schema.columns
          WHERE table_schema = 'public'
          AND table_name = 'contents'
          AND column_name = 'sort_order'
        ) as exists
      `;
      
      if (!sortOrderColumnExists[0]?.exists) {
        updateResults.push("向contents表添加sort_order字段");
        
        // 添加sort_order字段
        await sql`
          ALTER TABLE contents ADD COLUMN sort_order INTEGER;
        `;
        
        // 为角色卡初始化排序值（按更新时间倒序）
        // 获取所有角色卡，按更新时间倒序排列
        const characterCards = await sql`
          SELECT id FROM contents
          WHERE content_type = 'character_card'
          ORDER BY updated_at DESC
        `;
        
        // 初始化排序值（从1开始）
        let sortOrder = 1;
        for (const card of characterCards) {
          await sql`
            UPDATE contents
            SET sort_order = ${sortOrder}
            WHERE id = ${card.id}
          `;
          sortOrder++;
        }
        
        // 添加索引以优化排序查询
        await sql`
          CREATE INDEX IF NOT EXISTS idx_contents_sort_order ON contents(sort_order);
        `;
      } else {
        updateResults.push("contents表已包含sort_order字段");
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