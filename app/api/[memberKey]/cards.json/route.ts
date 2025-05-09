import { type NextRequest, NextResponse } from "next/server"
import { getContents, ContentType } from "@/lib/db"
import { formatCharacterCards } from "@/lib/card-formatter"

// 获取角色卡列表 - 带有密钥验证的版本（支持memberKey和adminKey）
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ memberKey?: string }> }
) {
  try {
    // 从路径参数中获取key (需要await params)
    const { memberKey: key = "" } = await params;
    
    // 获取环境变量中的密钥
    const memberKey = process.env.MEMBER_KEY
    const adminKey = process.env.ADMIN_KEY
    
    // 验证密钥 - 支持memberKey和adminKey两种
    let isAuthorized = false
    
    // 1. 检查是否匹配adminKey
    if (adminKey && key === adminKey) {
      console.log(`管理员密钥验证通过: '${key}'`);
      isAuthorized = true
    }
    
    // 2. 检查是否匹配memberKey
    else if (memberKey && key === memberKey) {
      console.log(`成员密钥验证通过: '${key}'`);
      isAuthorized = true
    }
    
    // 如果验证失败且需要验证
    if (!isAuthorized && (memberKey || adminKey)) {
      console.log(`密钥不匹配: 提供的是'${key}'`);
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
    
    // 使用共享函数处理格式转换
    const cards = await formatCharacterCards(characterCards)
    
    // 确保cards是数组
    const cardsArray = Array.isArray(cards) ? cards : []
    
    // 返回符合规范的结果
    return NextResponse.json({ cards: cardsArray })
    
  } catch (error) {
    console.error("获取角色卡列表失败:", error)
    
    // 检查是否是数据库连接错误
    if (error instanceof Error && error.message.includes("数据库连接未初始化")) {
      return NextResponse.json({ error: "数据库连接未初始化，请检查环境变量配置" }, { status: 500 })
    }
    
    return NextResponse.json({ error: "获取角色卡列表失败" }, { status: 500 })
  }
} 