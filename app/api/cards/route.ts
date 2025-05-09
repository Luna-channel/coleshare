import { type NextRequest, NextResponse } from "next/server"
import { getContents, ContentType } from "@/lib/db"
import { formatCharacterCards } from "@/lib/card-formatter"
import path from "path"

// 获取角色卡列表（向后兼容老接口）
export async function GET(req: NextRequest) {
  try {
    // 获取环境变量中的成员密钥
    const memberKey = process.env.MEMBER_KEY
    
    // 如果设置了成员密钥但请求中没有提供，根据配置决定是否限制访问
    if (memberKey && memberKey.trim() !== "") {
      // 检查请求头中是否有成员密钥
      const authHeader = req.headers.get("Authorization")
      const token = authHeader?.replace("Bearer ", "") || ""
      
      // 如果token与成员密钥不匹配，拒绝访问
      if (token !== memberKey) {
        return NextResponse.json({ 
          error: "无权限访问，请使用正确的成员密钥" 
        }, { status: 403 })
      }
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
    
    // 使用共享函数处理格式转换
    const cards = await formatCharacterCards(characterCards)
    
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