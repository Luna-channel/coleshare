import path from "path"
import { ContentType, getContentsByIds } from "./db"

/**
 * 将数据库中的角色卡数据转换为客户端期望的格式
 */
export async function formatCharacterCards(characterCards: any[]) {
  if (!characterCards || characterCards.length === 0) {
    console.log("没有角色卡数据")
    return []
  }
  
  console.log(`处理 ${characterCards.length} 张角色卡`)
  
  // 1. 收集所有角色卡中的关联内容ID
  const allStoryBookIds: string[] = []
  const allKnowledgeBaseIds: string[] = [] 
  const allEventBookIds: string[] = []
  const allPromptInjectionIds: string[] = []
  
  // 从元数据中提取关联ID
  characterCards.forEach(card => {
    if (card.metadata) {
      try {
        const metadata = typeof card.metadata === 'string' 
          ? JSON.parse(card.metadata) 
          : card.metadata
        
        // 收集故事书ID
        if (metadata.selectedStoryBooks && Array.isArray(metadata.selectedStoryBooks)) {
          allStoryBookIds.push(...metadata.selectedStoryBooks)
        }
        
        // 收集知识库ID
        if (metadata.selectedKnowledgeBases && Array.isArray(metadata.selectedKnowledgeBases)) {
          allKnowledgeBaseIds.push(...metadata.selectedKnowledgeBases)
        }
        
        // 收集事件书ID
        if (metadata.selectedEventBooks && Array.isArray(metadata.selectedEventBooks)) {
          allEventBookIds.push(...metadata.selectedEventBooks)
        }
        
        // 收集提示注入ID
        if (metadata.selectedPromptInjections && Array.isArray(metadata.selectedPromptInjections)) {
          allPromptInjectionIds.push(...metadata.selectedPromptInjections)
        }
      } catch (e) {
        console.error("解析元数据失败:", e)
      }
    }
  })
  
  console.log(
    `收集到关联ID: 故事书(${allStoryBookIds.length}), ` +
    `知识库(${allKnowledgeBaseIds.length}), ` +
    `事件书(${allEventBookIds.length}), ` + 
    `提示注入(${allPromptInjectionIds.length})`
  )
  
  // 先处理所有角色卡的基本信息
  const formattedCards = characterCards.map(card => formatBasicCardInfo(card))
  
  // 2. 批量查询所有关联内容
  const allContentIds = [
    ...allStoryBookIds, 
    ...allKnowledgeBaseIds, 
    ...allEventBookIds, 
    ...allPromptInjectionIds
  ]
  
  // 如果没有关联内容，直接返回基本信息
  if (allContentIds.length === 0) {
    console.log("没有关联内容，直接返回基本卡片信息")
    return formattedCards
  }
  
  // 批量获取所有内容
  let allContents: any[] = []
  try {
    allContents = await getContentsByIds(allContentIds)
    console.log(`批量查询返回 ${allContents.length} 条内容`)
  } catch (error) {
    console.error("批量获取内容失败:", error)
    // 出错时仍返回基本卡片信息
    return formattedCards
  }
  
  // 3. 按类型分类内容
  const contentMap = new Map()
  allContents.forEach((content: any) => {
    contentMap.set(String(content.id), content)
  })
  
  // 4. 为每个角色卡关联相应内容
  const result = characterCards.map((card, index) => {
    // 处理基本信息（已经从formattedCards中获取）
    const formattedCard = formattedCards[index]
    
    // 准备关联内容
    const stories: any[] = []
    const knowledgeBases: any[] = []
    const eventBooks: any[] = []
    const promptInjections: any[] = []
    
    // 从元数据中获取关联ID
    if (card.metadata) {
      try {
        const metadata = typeof card.metadata === 'string' 
          ? JSON.parse(card.metadata) 
          : card.metadata
        
        // 处理故事书
        if (metadata.selectedStoryBooks && Array.isArray(metadata.selectedStoryBooks)) {
          metadata.selectedStoryBooks.forEach((id: string) => {
            const story = contentMap.get(id)
            if (story && story.content_type === ContentType.STORY_BOOK) {
              stories.push({
                path: story.blob_url,
                name: story.name,
                uploadTime: story.created_at ? new Date(story.created_at).toISOString() : new Date().toISOString(),
                type: "story_book"
              })
            }
          })
        }
        
        // 处理知识库
        if (metadata.selectedKnowledgeBases && Array.isArray(metadata.selectedKnowledgeBases)) {
          metadata.selectedKnowledgeBases.forEach((id: string) => {
            const kb = contentMap.get(id)
            if (kb && kb.content_type === ContentType.KNOWLEDGE_BASE) {
              knowledgeBases.push({
                path: kb.blob_url,
                name: kb.name,
                uploadTime: kb.created_at ? new Date(kb.created_at).toISOString() : new Date().toISOString(),
                type: "knowledge_base"
              })
            }
          })
        }
        
        // 处理事件书
        if (metadata.selectedEventBooks && Array.isArray(metadata.selectedEventBooks)) {
          metadata.selectedEventBooks.forEach((id: string) => {
            const event = contentMap.get(id)
            if (event && event.content_type === ContentType.EVENT_BOOK) {
              eventBooks.push({
                path: event.blob_url,
                name: event.name,
                uploadTime: event.created_at ? new Date(event.created_at).toISOString() : new Date().toISOString(),
                type: "event_book"
              })
            }
          })
        }
        
        // 处理提示注入
        if (metadata.selectedPromptInjections && Array.isArray(metadata.selectedPromptInjections)) {
          metadata.selectedPromptInjections.forEach((id: string) => {
            const prompt = contentMap.get(id)
            if (prompt && prompt.content_type === ContentType.PROMPT_INJECTION) {
              promptInjections.push({
                path: prompt.blob_url,
                name: prompt.name,
                uploadTime: prompt.created_at ? new Date(prompt.created_at).toISOString() : new Date().toISOString(),
                type: "prompt_injection"
              })
            }
          })
        }
      } catch (e) {
        console.error("处理关联内容失败:", e)
      }
    }
    
    // 添加关联内容到结果中
    return {
      ...formattedCard,
      stories,
      knowledgeBases,
      eventBooks,
      promptInjections
    }
  })
  
  console.log(`处理完成，返回 ${result.length} 张卡片`)
  return result
}

/**
 * 处理角色卡的基本信息
 */
function formatBasicCardInfo(card: any) {
  // 从blob_url中提取文件名
  const fileName = path.basename(card.blob_url)
  const uploadTime = card.created_at ? new Date(card.created_at).toISOString() : new Date().toISOString()
  
  // 基本信息
  let gender = "unknown"
  let intro = card.description || ""
  let personality = ""
  let tags: string[] = []
  
  // 处理标签
  if (card.tags) {
    if (typeof card.tags === 'string') {
      tags = card.tags.split(',').map((tag: string) => tag.trim()).filter(Boolean)
    } else if (Array.isArray(card.tags)) {
      tags = [...card.tags]
    }
  }
  
  // 如果有元数据，提取额外信息
  if (card.metadata) {
    try {
      const metadata = typeof card.metadata === 'string' 
        ? JSON.parse(card.metadata) 
        : card.metadata
        
      intro = metadata.intro || intro
      personality = metadata.personality || personality
      
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
  
  return {
    id: card.uuid || String(card.id),
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
    tags
  }
} 