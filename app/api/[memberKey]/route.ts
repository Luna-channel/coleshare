import { type NextRequest, NextResponse } from "next/server"
import { getContents, ContentType } from "@/lib/db"
import { formatCharacterCards } from "@/lib/card-formatter"

// 获取角色卡列表（通过成员密钥访问）
export async function GET(
  req: NextRequest, 
  { params }: { params: Promise<{ memberKey?: string }> }
) {
  try {
    // 从路径参数中获取key (需要await params)
    const { memberKey: key = "" } = await params;
    
    // 获取环境变量中的成员密钥
    const memberKey = process.env.MEMBER_KEY
    
    // 验证密钥
    if (memberKey && key !== memberKey) {
      console.log(`密钥不匹配: 提供的是'${key}', 期望的是'${memberKey}'`);
      return NextResponse.json({ error: "无权限访问" }, { status: 403 })
    }
    
    // 获取所有角色卡
    const characterCards = await getContents(ContentType.CHARACTER_CARD)
    
    // 获取所有故事书
    let storyBooks = []
    try {
      storyBooks = await getContents(ContentType.STORY_BOOK)
    } catch (error) {
      console.warn("获取故事书失败，可能是数据库枚举未更新:", error)
      // 继续执行，不抛出错误
    }
    
    // 获取所有知识库
    let knowledgeBases = []
    try {
      knowledgeBases = await getContents(ContentType.KNOWLEDGE_BASE)
    } catch (error) {
      console.warn("获取知识库失败:", error)
      // 继续执行，不抛出错误
    }
    
    // 获取所有事件书
    let eventBooks = []
    try {
      eventBooks = await getContents(ContentType.EVENT_BOOK)
    } catch (error) {
      console.warn("获取事件书失败:", error)
      // 继续执行，不抛出错误
    }
    
    // 获取所有提示注入
    let promptInjections = []
    try {
      promptInjections = await getContents(ContentType.PROMPT_INJECTION)
    } catch (error) {
      console.warn("获取提示注入失败:", error)
      // 继续执行，不抛出错误
    }
    
    // 使用共享函数处理格式转换，包含所有关联内容
    const cards = formatCharacterCards(characterCards, storyBooks, knowledgeBases, eventBooks, promptInjections)
    
    // 返回符合规范的结果
    return NextResponse.json({ cards })
  } catch (error) {
    console.error("获取角色卡列表失败:", error)
    
    // 检查是否是数据库连接错误
    if (error instanceof Error && error.message.includes("数据库连接未初始化")) {
      return NextResponse.json({ error: "数据库连接未初始化，请检查环境变量配置" }, { status: 500 })
    }
    
    return NextResponse.json({ error: "获取角色卡列表失败" }, { status: 500 })
  }
} 