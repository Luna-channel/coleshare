// 更新数据库中的内容类型枚举
const { neon } = require('@neondatabase/serverless');
require('dotenv').config();

async function updateContentTypeEnum(dbUrl) {
  // 获取数据库URL
  const databaseUrl = dbUrl || process.env.DATABASE_URL;
  
  // 检查是否有数据库URL
  if (!databaseUrl) {
    console.error("错误: 未提供数据库连接字符串");
    console.error("请通过命令行参数提供数据库URL，或在.env文件中设置DATABASE_URL环境变量");
    console.error("用法: node scripts/update-db-enum.js \"postgres://user:password@host:port/database\"");
    process.exit(1);
  }

  // 初始化数据库连接
  const sql = neon(databaseUrl);
  
  try {
    console.log("开始更新内容类型枚举...");
    
    // 首先检查story_book类型是否已存在
    const typeCheck = await sql`
      SELECT EXISTS (
        SELECT 1 FROM pg_type
        JOIN pg_enum ON pg_enum.enumtypid = pg_type.oid
        WHERE pg_type.typname = 'content_type'
        AND pg_enum.enumlabel = 'story_book'
      ) as has_story_book;
    `;
    
    if (typeCheck[0]?.has_story_book) {
      console.log("story_book 类型已存在，无需更新");
      process.exit(0);
    }
    
    // 第一种方法：使用ALTER TYPE添加值（PostgreSQL 9.1+）
    try {
      console.log("尝试使用ALTER TYPE ADD VALUE添加story_book...");
      await sql`ALTER TYPE content_type ADD VALUE IF NOT EXISTS 'story_book';`;
      console.log("成功添加story_book枚举值!");
      process.exit(0);
    } catch (error) {
      console.warn("ALTER TYPE ADD VALUE方法失败，尝试第二种方法...", error);
    }
    
    // 第二种方法：创建新类型，替换旧类型
    console.log("尝试使用重建枚举类型的方法...");
    
    // 1. 创建新的枚举类型（包含story_book）
    await sql`
      CREATE TYPE content_type_new AS ENUM (
        'character_card', 'knowledge_base', 'event_book', 'prompt_injection', 'story_book'
      );
    `;
    console.log("创建新枚举类型成功");
    
    // 2. 更新表使用新的枚举类型
    await sql`
      ALTER TABLE contents 
      ALTER COLUMN content_type TYPE content_type_new 
      USING content_type::text::content_type_new;
    `;
    console.log("更新表列类型成功");
    
    // 3. 删除旧的枚举类型并重命名新的
    await sql`DROP TYPE content_type;`;
    console.log("删除旧枚举类型成功");
    
    await sql`ALTER TYPE content_type_new RENAME TO content_type;`;
    console.log("重命名新枚举类型成功");
    
    console.log("内容类型枚举更新完成！现在可以使用story_book类型了");
    process.exit(0);
    
  } catch (error) {
    console.error("更新内容类型枚举失败:", error);
    process.exit(1);
  }
}

// 获取命令行参数
const dbUrl = process.argv[2];

// 执行更新
updateContentTypeEnum(dbUrl).catch(error => {
  console.error("脚本执行失败:", error);
  process.exit(1);
}); 