// 更新内容类型枚举的数据库迁移脚本
const { neon } = require('@neondatabase/serverless');
require('dotenv').config();

async function updateContentTypeEnum() {
  if (!process.env.DATABASE_URL) {
    console.error('未找到DATABASE_URL环境变量，请设置数据库连接字符串');
    process.exit(1);
  }

  // 初始化数据库连接
  const sql = neon(process.env.DATABASE_URL);
  
  try {
    console.log('开始更新内容类型枚举...');
    
    // 1. 创建新的枚举类型（包含story_book）
    await sql`
      CREATE TYPE content_type_new AS ENUM (
        'character_card', 'knowledge_base', 'event_book', 'prompt_injection', 'story_book'
      );
    `;
    console.log('创建新枚举类型成功');
    
    // 2. 更新表使用新的枚举类型
    await sql`
      ALTER TABLE contents 
      ALTER COLUMN content_type TYPE content_type_new 
      USING content_type::text::content_type_new;
    `;
    console.log('更新表列类型成功');
    
    // 3. 删除旧的枚举类型并重命名新的
    await sql`
      DROP TYPE content_type;
    `;
    console.log('删除旧枚举类型成功');
    
    await sql`
      ALTER TYPE content_type_new RENAME TO content_type;
    `;
    console.log('重命名新枚举类型成功');
    
    console.log('内容类型枚举更新完成！现在可以使用story_book类型了');
    
  } catch (error) {
    console.error('更新内容类型枚举失败:', error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

// 运行迁移
updateContentTypeEnum(); 