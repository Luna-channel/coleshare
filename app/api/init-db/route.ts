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
    
    // 分割SQL语句
    const statements = schemaSQL.split(';').filter(stmt => stmt.trim());
    
    const results = [];
    
    // 执行每个SQL语句
    for (const statement of statements) {
      if (statement.trim()) {
        try {
          // 使用标签模板语法执行SQL
          await sql`${statement.trim()}`;
          results.push({ success: true, statement: statement.substring(0, 50) + '...' });
        } catch (err) {
          results.push({ 
            success: false, 
            statement: statement.substring(0, 50) + '...', 
            error: err instanceof Error ? err.message : String(err) 
          });
        }
      }
    }
    
    return NextResponse.json({ 
      success: true, 
      message: '数据库初始化完成',
      results
    });
    
  } catch (error) {
    console.error('数据库初始化失败:', error);
    return NextResponse.json({ 
      success: false, 
      message: '数据库初始化失败',
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 