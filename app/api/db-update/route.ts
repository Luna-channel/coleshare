import { type NextRequest, NextResponse } from "next/server"
import { withAdminAuth } from "@/lib/auth"
import { neon } from "@neondatabase/serverless"

// 添加新的内容类型到数据库
export const GET = withAdminAuth(async (req: NextRequest) => {
  try {
    // 检查环境变量是否存在
    if (!process.env.DATABASE_URL) {
      return NextResponse.json(
        { error: "DATABASE_URL 环境变量未设置" },
        { status: 500 }
      )
    }

    // 初始化数据库连接
    const sql = neon(process.env.DATABASE_URL)

    let result = {}
    let error = null

    // 尝试更新枚举
    try {
      console.log("开始更新内容类型枚举...")

      // 检查content_type是否已经包含story_book
      const typeCheck = await sql`
        SELECT EXISTS (
          SELECT 1 FROM pg_type
          JOIN pg_enum ON pg_enum.enumtypid = pg_type.oid
          WHERE pg_type.typname = 'content_type'
          AND pg_enum.enumlabel = 'story_book'
        ) as has_story_book;
      `
      
      const hasStoryBook = typeCheck[0]?.has_story_book
      
      if (hasStoryBook) {
        return NextResponse.json(
          { message: "story_book 类型已存在，无需更新" },
          { status: 200 }
        )
      }

      // 1. 创建新的枚举类型
      await sql`
        CREATE TYPE content_type_new AS ENUM (
          'character_card', 'knowledge_base', 'event_book', 'prompt_injection', 'story_book'
        );
      `
      console.log("创建新枚举类型成功")

      // 2. 更新表使用新的枚举类型
      await sql`
        ALTER TABLE contents 
        ALTER COLUMN content_type TYPE content_type_new 
        USING content_type::text::content_type_new;
      `
      console.log("更新表列类型成功")

      // 3. 删除旧的枚举类型并重命名新的
      await sql`
        DROP TYPE content_type;
      `
      console.log("删除旧枚举类型成功")

      await sql`
        ALTER TYPE content_type_new RENAME TO content_type;
      `
      console.log("重命名新枚举类型成功")

      result = { success: true, message: "内容类型枚举更新成功！现在可以使用story_book类型了" }
    } catch (err) {
      console.error("更新内容类型枚举失败:", err)
      error = err
      
      // 尝试另一种更新方法（如果第一种失败）
      try {
        console.log("尝试使用ALTER TYPE添加值...")
        await sql`
          ALTER TYPE content_type ADD VALUE IF NOT EXISTS 'story_book';
        `
        result = { 
          success: true, 
          message: "使用ALTER TYPE成功添加了story_book类型",
          fallback: true
        }
        error = null
      } catch (altErr) {
        console.error("第二种方法也失败:", altErr)
        error = error || altErr
      }
    }

    if (error) {
      return NextResponse.json(
        { 
          error: "更新内容类型枚举失败", 
          details: error instanceof Error ? error.message : String(error) 
        },
        { status: 500 }
      )
    }

    return NextResponse.json(result, { status: 200 })
  } catch (err) {
    console.error("处理请求失败:", err)
    return NextResponse.json(
      { error: "处理请求失败", details: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    )
  }
}) 