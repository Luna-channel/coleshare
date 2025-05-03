import path from "path"
import { ContentType } from "./db"

/**
 * 将数据库中的角色卡数据转换为客户端期望的格式
 */
export function formatCharacterCards(characterCards: any[], storyBooks: any[] = []) {
  return characterCards.map((card: any) => {
    // 从blob_url中提取文件名
    const fileName = path.basename(card.blob_url)
    const uploadTime = card.created_at ? new Date(card.created_at).toISOString() : new Date().toISOString()
    
    // 尝试从描述或元数据中提取额外信息
    let gender = "unknown"
    let intro = card.description || ""
    let personality = ""
    let selectedStoryBooks: string[] = []
    let tags: string[] = []
    
    // 优先使用数据库中的tags（如果是逗号分隔的字符串，则拆分为数组）
    if (card.tags) {
      if (typeof card.tags === 'string') {
        tags = card.tags.split(',').map((tag: string) => tag.trim()).filter(Boolean)
      } else if (Array.isArray(card.tags)) {
        tags = [...card.tags]
      }
    }
    
    // 如果有元数据，尝试解析
    if (card.metadata) {
      try {
        const metadata = typeof card.metadata === 'string' 
          ? JSON.parse(card.metadata) 
          : card.metadata
          
        intro = metadata.intro || intro
        personality = metadata.personality || personality
        
        // 获取选中的故事书ID
        if (metadata.selectedStoryBooks && Array.isArray(metadata.selectedStoryBooks)) {
          selectedStoryBooks = metadata.selectedStoryBooks
        }
        
        // 如果数据库中没有tags，则使用元数据中的tags
        if (tags.length === 0 && metadata.tags && Array.isArray(metadata.tags)) {
          tags = metadata.tags
        }
        
        // 优先使用元数据中的gender
        if (metadata.gender) {
          gender = metadata.gender
        }
      } catch (e) {
        console.error("解析元数据失败:", e)
      }
    }
    
    // 根据tags判断gender
    if (tags.some(tag => ['male', '男'].includes(tag.toLowerCase()))) {
      gender = 'male'
    } else if (tags.some(tag => ['female', '女'].includes(tag.toLowerCase()))) {
      gender = 'female'
    } else if (gender === 'unknown') {
      gender = 'other'
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
        path: story.blob_url, // 使用完整URL
        name: story.name, // 使用数据库中的名称
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
      tags,
      stories: relatedStories
    }
  })
} 