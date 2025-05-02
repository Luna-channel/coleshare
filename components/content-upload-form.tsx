"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { ContentType } from "@/lib/db"
import { Upload, X, Save } from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"

interface ContentUploadFormProps {
  onSuccess: () => void
  onCancel: () => void
  initialData?: any
}

export function ContentUploadForm({ onSuccess, onCancel, initialData }: ContentUploadFormProps) {
  const [name, setName] = useState(initialData?.name || "")
  const [description, setDescription] = useState(initialData?.description || "")
  const [contentType, setContentType] = useState<ContentType>(initialData?.content_type || ContentType.CHARACTER_CARD)
  const [file, setFile] = useState<File | null>(null)
  const [tagInput, setTagInput] = useState(initialData?.tags ? initialData.tags.join(",") : "")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string>(initialData?.thumbnail_url || "")
  const [intro, setIntro] = useState(initialData?.intro || (initialData?.description || ""))
  const [storyBooks, setStoryBooks] = useState<any[]>([])
  const [selectedStoryBooks, setSelectedStoryBooks] = useState<string[]>([])
  
  const isEditing = !!initialData

  // 内容类型选项
  const contentTypeOptions = [
    { value: ContentType.CHARACTER_CARD, label: "角色卡", accept: ".png" },
    { value: ContentType.KNOWLEDGE_BASE, label: "知识库", accept: ".json" },
    { value: ContentType.EVENT_BOOK, label: "事件书", accept: ".json" },
    { value: ContentType.PROMPT_INJECTION, label: "提示注入", accept: ".json" },
    { value: ContentType.STORY_BOOK, label: "故事书", accept: ".json" },
  ]
  
  // 获取可用的故事书列表
  useEffect(() => {
    if (contentType === ContentType.CHARACTER_CARD) {
      const fetchStoryBooks = async () => {
        try {
          console.log("开始获取故事书列表...");
          // 使用管理员令牌获取故事书列表
          const token = localStorage.getItem("adminToken");
          if (!token) {
            console.error("缺少管理员令牌，无法获取故事书列表");
            return;
          }

          const response = await fetch("/api/contents?type=story_book", {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          })
          
          if (!response.ok) {
            throw new Error(`获取故事书失败: ${response.status}`)
          }
          
          const data = await response.json()
          console.log("获取到的故事书数据:", data);
          
          // API可能返回一个对象(旧版)或直接返回数组(新版)，需要处理两种情况
          if (Array.isArray(data)) {
            console.log("故事书数据是数组格式");
            setStoryBooks(data);
          } else if (data.contents && Array.isArray(data.contents)) {
            console.log("故事书数据是对象格式，包含contents数组");
            setStoryBooks(data.contents);
          } else {
            console.error("故事书数据格式异常:", data);
            // 尝试以兼容方式处理可能的数据格式
            const possibleStoryBooks = Array.isArray(data) ? data : 
                                      Array.isArray(data.contents) ? data.contents : 
                                      typeof data === 'object' ? [data] : [];
            console.log("尝试兼容处理后的故事书数据:", possibleStoryBooks);
            setStoryBooks(possibleStoryBooks);
          }
          
          // 如果是编辑模式，设置已经选择的故事书
          if (isEditing && initialData?.metadata) {
            try {
              const metadata = typeof initialData.metadata === 'string'
                ? JSON.parse(initialData.metadata)
                : initialData.metadata
              
              console.log("初始元数据:", metadata);
                
              if (metadata.selectedStoryBooks && Array.isArray(metadata.selectedStoryBooks)) {
                console.log("设置已选择的故事书:", metadata.selectedStoryBooks);
                setSelectedStoryBooks(metadata.selectedStoryBooks)
              }
            } catch (e) {
              console.error("解析故事书元数据失败:", e)
            }
          }
        } catch (err) {
          console.error("获取故事书列表失败:", err)
          setStoryBooks([])
        }
      }
      
      fetchStoryBooks()
    }
  }, [contentType, isEditing, initialData])

  // 处理文件选择
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return

    setFile(selectedFile)

    // 如果是图片，创建预览
    if (selectedFile.type.startsWith("image/")) {
      const objectUrl = URL.createObjectURL(selectedFile)
      setPreviewUrl(objectUrl)

      // 清理预览URL
      return () => URL.revokeObjectURL(objectUrl)
    }
  }

  // 处理标签输入
  const handleTagsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTagInput(e.target.value)
  }

  // 从标签输入字符串获取标签数组
  const getTagsArray = (): string[] => {
    if (!tagInput) return []
    return tagInput
      .split(",")
      .map((tag: string) => tag.trim())
      .filter(Boolean)
  }
  
  // 处理故事书选择
  const handleStoryBookChange = (storyBookId: string) => {
    console.log("故事书选择变更:", storyBookId);
    console.log("当前已选择的故事书:", selectedStoryBooks);
    
    // 确保ID是字符串类型，以便正确比较
    const storyIdStr = String(storyBookId);
    
    // 先检查当前的选择情况
    const isCurrentlySelected = selectedStoryBooks.includes(storyIdStr);
    console.log(`故事书 ${storyIdStr} 当前${isCurrentlySelected ? '已选中' : '未选中'}`);
    
    // 更新选择状态
    setSelectedStoryBooks(prev => {
      const newSelection = isCurrentlySelected
        ? prev.filter(id => id !== storyIdStr) // 如果已选中，则移除
        : [...prev, storyIdStr];               // 如果未选中，则添加
      
      console.log("更新后的故事书选择:", newSelection);
      return newSelection;
    });
  }

  // 处理表单提交
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    try {
      // 验证表单
      if (!name) {
        throw new Error("请输入名称")
      }

      if (!isEditing && !file) {
        throw new Error("请选择文件")
      }

      // 获取标签数组
      const tags = getTagsArray()

      console.log("提交表单数据:", {
        name,
        contentType,
        tags,
        isEditing,
        fileSelected: !!file,
        intro,
        selectedStoryBooks,
      })
      
      // 准备元数据
      let metadata;
      if (contentType === ContentType.CHARACTER_CARD) {
        // 确保所有ID都是字符串格式
        const storyBookIds = selectedStoryBooks.map(id => String(id));
        
        metadata = {
          intro: intro || "",
          selectedStoryBooks: storyBookIds
        };
        
        // 如果编辑模式下有现有元数据，保留其他字段
        if (isEditing && initialData?.metadata) {
          try {
            const existingMetadata = typeof initialData.metadata === 'string'
              ? JSON.parse(initialData.metadata)
              : initialData.metadata;
              
            metadata = {
              ...existingMetadata,
              intro,
              selectedStoryBooks: storyBookIds,
            };
          } catch (err) {
            console.error("解析现有元数据失败:", err);
            // 使用默认元数据
          }
        }
      }
      
      console.log("准备提交的元数据:", metadata);

      // 如果是编辑模式且没有新文件，直接更新内容信息
      if (isEditing && !file) {
        const response = await fetch(`/api/contents/${initialData.id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("adminToken")}`,
          },
          body: JSON.stringify({
            name,
            description: intro, // 使用intro作为description
            tags,
            metadata,
          }),
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || "更新内容失败")
        }

        console.log("内容更新成功:", data)
        onSuccess()
        return
      }

      // 上传文件
      const formData = new FormData()
      formData.append("file", file!)
      formData.append("contentType", contentType)
      formData.append("filename", file!.name)

      console.log("上传文件:", {
        fileName: file!.name,
        contentType,
        fileSize: file!.size,
      })

      const uploadResponse = await fetch("/api/upload", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("adminToken")}`,
        },
        body: formData,
      })

      const uploadData = await uploadResponse.json()

      if (!uploadResponse.ok) {
        throw new Error(uploadData.error || "文件上传失败")
      }

      console.log("文件上传成功:", uploadData)
      const { url, thumbnailUrl } = uploadData

      // 创建或更新内容
      const contentData = {
        name,
        description: intro, // 使用intro作为description
        content_type: contentType,
        blob_url: url,
        thumbnail_url: thumbnailUrl || url,
        tags,
        metadata,
      }

      console.log("提交内容数据:", contentData)

      const contentResponse = await fetch(isEditing ? `/api/contents/${initialData.id}` : "/api/contents", {
        method: isEditing ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("adminToken")}`,
        },
        body: JSON.stringify(contentData),
      })

      const contentResult = await contentResponse.json()

      if (!contentResponse.ok) {
        throw new Error(contentResult.error || `${isEditing ? "更新" : "创建"}内容失败`)
      }

      console.log("内容创建/更新成功:", contentResult)
      onSuccess()
    } catch (err) {
      console.error("表单提交失败:", err)
      setError(err instanceof Error ? err.message : "操作失败")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>{isEditing ? "编辑内容" : "上传新内容"}</CardTitle>
        <CardDescription>{isEditing ? "修改内容信息" : "上传新的内容文件"}</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="name" className="text-sm font-medium">
                名称
              </label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="内容名称" required />
            </div>

            <div className="space-y-2">
              <label htmlFor="contentType" className="text-sm font-medium">
                内容类型
              </label>
              <div className="flex flex-wrap gap-2">
                {contentTypeOptions.map((option) => (
                  <Button
                    key={option.value}
                    type="button"
                    variant={contentType === option.value ? "default" : "outline"}
                    onClick={() => setContentType(option.value as ContentType)}
                    disabled={isEditing} // 编辑模式下不允许修改内容类型
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
            </div>
          </div>
          
          {contentType === ContentType.CHARACTER_CARD && (
            <div className="space-y-2">
              <label htmlFor="intro" className="text-sm font-medium">
                介绍
              </label>
              <Textarea
                id="intro"
                value={intro}
                onChange={(e) => setIntro(e.target.value)}
                placeholder="角色介绍"
                rows={3}
              />
            </div>
          )}

          <div className="space-y-2">
            <label htmlFor="tags" className="text-sm font-medium">
              标签（用逗号分隔）
            </label>
            <Input id="tags" value={tagInput} onChange={handleTagsChange} placeholder="标签1,标签2,标签3" />
          </div>
          
          {contentType === ContentType.CHARACTER_CARD && (
            <div className="space-y-2">
              <label className="text-sm font-medium">
                关联故事书 {selectedStoryBooks.length > 0 ? `(已选择 ${selectedStoryBooks.length} 本)` : ''}
              </label>
              {storyBooks.length > 0 ? (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 mt-2 max-h-60 overflow-y-auto p-2 border rounded-md bg-white/5">
                    {storyBooks.map((book) => {
                      // 确保ID是字符串类型
                      const bookId = String(book.id);
                      const isSelected = selectedStoryBooks.includes(bookId);
                      
                      return (
                        <div 
                          key={bookId}
                          className={`flex items-center space-x-2 p-1 rounded hover:bg-white/10 ${isSelected ? 'bg-white/20' : ''}`}
                        >
                          <Checkbox 
                            id={`story-${bookId}`} 
                            checked={isSelected}
                            onCheckedChange={() => handleStoryBookChange(bookId)}
                          />
                          <Label 
                            htmlFor={`story-${bookId}`} 
                            className="truncate cursor-pointer text-sm"
                          >
                            {book.name}
                          </Label>
                        </div>
                      );
                    })}
                  </div>
                  {selectedStoryBooks.length > 0 && (
                    <div className="text-xs text-gray-400 mt-1">
                      已选择ID: {selectedStoryBooks.join(', ')}
                    </div>
                  )}
                </>
              ) : (
                <div className="text-sm text-gray-500 mt-2 p-4 border rounded-md bg-white/5 text-center">
                  暂无可用的故事书，请先上传故事书
                </div>
              )}
            </div>
          )}

          <div className="space-y-2">
            <label htmlFor="file" className="text-sm font-medium">
              {isEditing ? "更新文件（可选）" : "上传文件"}
            </label>
            <div className="flex items-center gap-4">
              <Input
                id="file"
                type="file"
                onChange={handleFileChange}
                accept={contentTypeOptions.find((opt) => opt.value === contentType)?.accept}
                className="max-w-sm"
                required={!isEditing}
              />
              {contentType === ContentType.CHARACTER_CARD && (
                <div className="w-24 h-24 border rounded-md overflow-hidden">
                  {previewUrl ? (
                    <img src={previewUrl || "/placeholder.svg"} alt="预览" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-400">
                      无预览
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {error && <div className="text-sm font-medium text-red-500">{error}</div>}
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
            <X className="mr-2 h-4 w-4" />
            取消
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? (
              <div className="flex items-center">
                <div className="animate-spin mr-2 h-4 w-4 border-2 border-b-transparent rounded-full"></div>
                <span>{isEditing ? "更新中..." : "上传中..."}</span>
              </div>
            ) : (
              <div className="flex items-center">
                {isEditing ? <Save className="mr-2 h-4 w-4" /> : <Upload className="mr-2 h-4 w-4" />}
                <span>{isEditing ? "保存" : "上传"}</span>
              </div>
            )}
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}
