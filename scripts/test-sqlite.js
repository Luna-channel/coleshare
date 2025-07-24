// 测试SQLite数据库连接和基本操作
const { DatabaseFactory } = require('../lib/db-factory.ts')
const { ContentType } = require('../lib/db.ts')

async function testSQLite() {
  console.log('开始测试SQLite数据库...')
  
  try {
    // 创建SQLite适配器
    const adapter = DatabaseFactory.createAdapter('sqlite://./test-database.db')
    
    // 连接数据库
    await adapter.connect()
    console.log('✓ 数据库连接成功')
    
    // 初始化数据库结构
    await adapter.checkAndInitDatabase()
    console.log('✓ 数据库初始化成功')
    
    // 测试创建内容
    const testContent = {
      name: '测试角色卡',
      description: '这是一个测试角色卡',
      content_type: ContentType.CHARACTER_CARD,
      blob_url: 'https://example.com/test.png',
      thumbnail_url: 'https://example.com/thumb.png',
      metadata: { test: true },
      tags: ['测试', '角色卡']
    }
    
    const createdContent = await adapter.createContent(testContent)
    console.log('✓ 创建内容成功:', createdContent.id)
    
    // 测试获取内容
    const retrievedContent = await adapter.getContent(createdContent.id)
    console.log('✓ 获取内容成功:', retrievedContent.name)
    
    // 测试更新内容
    const updatedContent = await adapter.updateContent(createdContent.id, {
      name: '更新后的测试角色卡'
    })
    console.log('✓ 更新内容成功:', updatedContent.name)
    
    // 测试获取所有内容
    const allContents = await adapter.getContents()
    console.log('✓ 获取所有内容成功，数量:', allContents.length)
    
    // 测试站点设置
    const siteSettings = await adapter.getSiteSettings()
    console.log('✓ 获取站点设置成功:', siteSettings.site_name)
    
    // 测试更新站点设置
    const updatedSettings = await adapter.updateSiteSettings({
      site_name: '测试站点'
    })
    console.log('✓ 更新站点设置成功:', updatedSettings.site_name)
    
    // 测试删除内容
    const deletedContent = await adapter.deleteContent(createdContent.id)
    console.log('✓ 删除内容成功:', deletedContent.id)
    
    // 断开连接
    await adapter.disconnect()
    console.log('✓ 数据库连接断开成功')
    
    console.log('\n🎉 所有SQLite测试通过！')
    
  } catch (error) {
    console.error('❌ 测试失败:', error)
    process.exit(1)
  }
}

// 运行测试
if (require.main === module) {
  testSQLite()
}

module.exports = { testSQLite }