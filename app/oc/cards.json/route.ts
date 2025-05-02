import { type NextRequest, NextResponse } from "next/server"
import { getContents, ContentType } from "@/lib/db"
import path from "path"

// 获取角色卡列表
export async function GET(req: NextRequest) {
  try {
    // 获取环境变量中的成员密钥
    const memberKey = process.env.MEMBER_KEY
    
    // 如果设置了成员密钥，拒绝访问此端点，强制使用带有密钥的路径
    if (memberKey && memberKey.trim() !== "") {
      console.log("MEMBER_KEY已配置，拒绝访问无密钥的/oc/cards.json端点");
      return NextResponse.json({ 
        error: "此服务器已启用成员密钥保护，请使用带有密钥的链接访问", 
        code: "MEMBER_KEY_REQUIRED" 
      }, { status: 403 });
    }
    
    // 获取所有角色卡
    const characterCards = await getContents(ContentType.CHARACTER_CARD)
    
    // 尝试获取所有故事书，如果失败则使用空数组
    let storyBooks = []
    try {
      storyBooks = await getContents(ContentType.STORY_BOOK)
    } catch (error) {
      console.warn("获取故事书失败，可能是数据库枚举未更新:", error)
      console.warn("请访问 /api/db-update 以更新数据库枚举")
      // 继续执行，不抛出错误
    }
    
    // 转换为客户端期望的格式
    const cards = characterCards.map((card: any) => {
      // 从blob_url中提取文件名
      const fileName = path.basename(card.blob_url)
      const uploadTime = card.created_at ? new Date(card.created_at).toISOString() : new Date().toISOString()
      
      // 尝试从描述或元数据中提取额外信息
      let gender = "unknown"
      let intro = card.description || ""
      let personality = ""
      let selectedStoryBooks: string[] = []
      
      // 如果有元数据，尝试解析
      if (card.metadata) {
        try {
          const metadata = typeof card.metadata === 'string' 
            ? JSON.parse(card.metadata) 
            : card.metadata
            
          gender = metadata.gender || gender
          intro = metadata.intro || intro
          personality = metadata.personality || personality
          
          // 获取选中的故事书ID
          if (metadata.selectedStoryBooks && Array.isArray(metadata.selectedStoryBooks)) {
            selectedStoryBooks = metadata.selectedStoryBooks
          }
        } catch (e) {
          console.error("解析元数据失败:", e)
        }
      }
      
      // 查找与此角色卡相关的故事书
      const relatedStories = storyBooks.filter((story: any) => {
        // 1. 检查故事书是否在selectedStoryBooks中
        if (selectedStoryBooks.includes(String(story.id))) {
          return true
        }
        
        // 2. 检查标签是否包含角色卡名称或ID（向后兼容）
        const storyTags = story.tags || []
        return storyTags.includes(card.name) || storyTags.includes(String(card.id))
      }).map((story: any) => {
        return {
          path: story.blob_url,
          name: path.basename(story.blob_url),
          uploadTime: story.created_at ? new Date(story.created_at).toISOString() : new Date().toISOString()
        }
      })
      
      return {
        id: String(card.id),
        name: card.name,
        fileName: fileName,
        filePath: card.blob_url,
        coverPath: card.thumbnail_url || card.blob_url,
        fileType: fileName.includes('.') ? path.extname(fileName).replace(".", "") : "",
        uploadTime,
        gender,
        intro,
        description: intro, // 保持向后兼容
        personality,
        stories: relatedStories
      }
    })
    
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