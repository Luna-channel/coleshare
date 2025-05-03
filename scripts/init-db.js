// 数据库初始化脚本
const { neon } = require('@neondatabase/serverless');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function initDatabase() {
  // 获取数据库连接URL
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    console.error('错误: 未提供数据库连接字符串');
    console.error('请在.env文件中设置DATABASE_URL环境变量');
    process.exit(1);
  }

  // 初始化数据库连接
  const sql = neon(databaseUrl);
  
  try {
    console.log('开始初始化数据库...');
    
    // 读取schema.sql文件
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schemaSQL = fs.readFileSync(schemaPath, 'utf8');
    
    // 分割SQL语句（简单分割，实际情况可能需要更复杂的处理）
    const statements = schemaSQL.split(';').filter(stmt => stmt.trim());
    
    // 执行每个SQL语句
    for (const statement of statements) {
      if (statement.trim()) {
        try {
          await sql.raw(statement.trim());
          console.log('执行SQL语句成功');
        } catch (err) {
          // 如果表已存在等错误，输出但继续执行
          console.warn('SQL执行警告:', err.message);
        }
      }
    }
    
    console.log('数据库初始化完成！');
  } catch (error) {
    console.error('数据库初始化失败:', error);
    process.exit(1);
  }
}

// 执行初始化
initDatabase().catch(err => {
  console.error('初始化过程中发生错误:', err);
  process.exit(1);
}); 