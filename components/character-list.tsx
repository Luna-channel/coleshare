"use client"

import { useState, useEffect } from "react"
import { CharacterCard } from "@/components/character-card"
import { Button } from "@/components/ui/button"
import { PlusIcon } from "lucide-react"
import { CharacterEditor } from "@/components/character-editor"
import { extractCharacterData } from "@/lib/png-processor"
import { useLanguage } from "@/contexts/language-context"
import { getApiBaseUrl } from "@/utils/domain-utils"
import { fallbackCharacters } from "@/data/fallback-characters"

// Define the character interface
interface Character {
  id: string
  name: string
  fileName: string
  filePath: string
  coverPath: string
  fileType: string
  uploadTime: string
  gender: string
  intro: string
  description: string
  personality: string
  stories?: Array<{
    path: string
    name: string
    uploadTime: string
  }>
}

export function CharacterList() {
  const { t } = useLanguage()
  const [isEditorOpen, setIsEditorOpen] = useState(false)
  const [selectedCharacter, setSelectedCharacter] = useState<any>(null)
  const [characters, setCharacters] = useState<Character[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [useFallback, setUseFallback] = useState(false)

  // Fetch character data from API
  useEffect(() => {
    const fetchCharacters = async () => {
      setIsLoading(true)
      try {
        // Use domain-based API URL
        const apiBaseUrl = getApiBaseUrl()
        
        // 获取member_key
        let memberKey = localStorage.getItem("memberToken") || localStorage.getItem("adminToken") || ""
        
        // 如果没有保存过，尝试获取
        if (!memberKey) {
          try {
            const keyResponse = await fetch(`${apiBaseUrl}/api/member-key`)
            if (keyResponse.ok) {
              memberKey = await keyResponse.text()
              memberKey = memberKey.trim()
              localStorage.setItem("memberKey", memberKey)
            }
          } catch (err) {
            console.error("无法获取成员密钥:", err)
          }
        }

        // Add a timeout to the fetch request
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 5000) // 5 second timeout

        // 添加member_key到URL路径中
        const cardsUrl = memberKey 
          ? `${apiBaseUrl}/api/${memberKey}/cards.json` 
          : `${apiBaseUrl}/api/cards.json`

        const response = await fetch(cardsUrl, {
          signal: controller.signal,
          // Add cache control headers
          headers: {
            "Cache-Control": "no-cache",
            Pragma: "no-cache",
          },
        })

        clearTimeout(timeoutId)

        if (!response.ok) {
          throw new Error(`Server responded with status: ${response.status}`)
        }

        const data = await response.json()

        if (!data.cards || !Array.isArray(data.cards)) {
          throw new Error("Invalid data format: cards array not found")
        }

        setCharacters(data.cards)
        setUseFallback(false)
      } catch (err) {
        console.error("Error fetching characters:", err)

        // Provide more specific error messages
        let errorMessage = "Failed to load characters. "

        if (err instanceof TypeError && err.message.includes("fetch")) {
          errorMessage += "Network error - please check your connection."
          // Use fallback data
          setCharacters(fallbackCharacters)
          setUseFallback(true)
        } else if (err instanceof DOMException && err.name === "AbortError") {
          errorMessage += "Request timed out. Using local data instead."
          // Use fallback data
          setCharacters(fallbackCharacters)
          setUseFallback(true)
        } else {
          errorMessage += "Please try again later."
          // Use fallback data
          setCharacters(fallbackCharacters)
          setUseFallback(true)
        }

        setError(errorMessage)
      } finally {
        setIsLoading(false)
      }
    }

    fetchCharacters()
  }, [])

  const handleEditCharacter = async (character: Character) => {
    try {
      // If using fallback data, we don't need to fetch the PNG
      if (useFallback) {
        const characterForEdit = {
          id: character.id,
          name: character.name,
          image: character.coverPath, // Use the coverPath directly for fallback
          description: character.intro,
          fullDescription: character.description,
          gender: character.gender,
          personality: character.personality || "",
          scenario: "",
          exampleDialogue: "",
          creatorNotes: "",
          systemPrompt: "",
          postHistoryInstructions: "",
          alternateGreetings: [],
          tags: [],
          creator: "",
          characterVersion: "",
          firstMes: "",
          originalFilePath: character.filePath,
        }

        setSelectedCharacter(characterForEdit)
        setIsEditorOpen(true)
        return
      }

      // Use domain-based API URL
      const apiBaseUrl = getApiBaseUrl()

      // Construct the full PNG URL from the filePath
      const pngUrl = character.filePath.startsWith('http') ? character.filePath : `${apiBaseUrl}/oc/${character.filePath}`

      // Fetch the PNG file with timeout
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 5000) // 5 second timeout

      const response = await fetch(pngUrl, {
        signal: controller.signal,
        // Add cache control headers
        headers: {
          "Cache-Control": "no-cache",
          Pragma: "no-cache",
        },
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        throw new Error(`Failed to fetch character PNG: ${response.status}`)
      }

      // Convert to array buffer for processing
      const arrayBuffer = await response.arrayBuffer()

      // Extract character data from PNG
      const extractedData = await extractCharacterData(arrayBuffer)

      // Prepare character data for editor
      const characterForEdit = {
        id: character.id,
        name: character.name,
        image: character.coverPath.startsWith('http') ? character.coverPath : `${apiBaseUrl}/oc/${character.coverPath}`,
        description: character.intro,
        fullDescription: character.description,
        gender: character.gender,
        // Use extracted data if available, otherwise use data from the API
        personality: extractedData?.personality || character.personality || "",
        scenario: extractedData?.scenario || "",
        exampleDialogue: extractedData?.exampleDialogue || "",
        creatorNotes: extractedData?.creatorNotes || "",
        systemPrompt: extractedData?.systemPrompt || "",
        postHistoryInstructions: extractedData?.postHistoryInstructions || "",
        alternateGreetings: extractedData?.alternateGreetings || [],
        tags: extractedData?.tags || [],
        creator: extractedData?.creator || "",
        characterVersion: extractedData?.characterVersion || "",
        firstMes: extractedData?.firstMes || "",
        // Add original file path for reference
        originalFilePath: character.filePath,
      }

      setSelectedCharacter(characterForEdit)
      setIsEditorOpen(true)
    } catch (err) {
      console.error("Error processing character:", err)
      alert(`Error loading character: ${err instanceof Error ? err.message : "Unknown error"}`)
    }
  }

  const handleCreateCharacter = () => {
    setSelectedCharacter(null)
    setIsEditorOpen(true)
  }

  const handleCloseEditor = () => {
    setIsEditorOpen(false)
  }

  if (isEditorOpen) {
    return <CharacterEditor character={selectedCharacter} onClose={handleCloseEditor} />
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-violet-400 to-blue-400">
          {t("app.characterList.title")}
        </h2>
        <Button
          onClick={handleCreateCharacter}
          className="bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-700 hover:to-blue-700"
        >
          <PlusIcon className="mr-2 h-4 w-4" />
          {t("app.characterList.createButton")}
        </Button>
      </div>

      {isLoading && (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-violet-500"></div>
        </div>
      )}

      {error && (
        <div className="bg-red-500/20 border border-red-500 text-white p-4 rounded-lg mb-6">
          {error}
          {useFallback && <p className="mt-2 text-sm">Using local character data instead.</p>}
        </div>
      )}

      {!isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {characters.map((character) => (
            <CharacterCard
              key={character.id}
              character={{
                id: character.id,
                name: character.name,
                image: useFallback
                  ? character.coverPath // Use direct path for fallback
                  : character.coverPath.startsWith('http')
                    ? character.coverPath // Use direct path if it starts with 'http'
                    : `${getApiBaseUrl()}/oc/${character.coverPath}`,
                description: character.intro,
                tags: [],
              }}
              onEdit={() => handleEditCharacter(character)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
