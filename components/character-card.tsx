"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Edit2, Trash2 } from "lucide-react"

interface CharacterCardProps {
  character: {
    id: string
    name: string
    image: string
    description: string
    tags?: string[]
  }
  onEdit: () => void
}

export function CharacterCard({ character, onEdit }: CharacterCardProps) {
  const [isHovered, setIsHovered] = useState(false)

  return (
    <Card
      className="overflow-hidden relative group border-0 rounded-lg bg-gradient-to-b from-gray-800 to-gray-900 shadow-lg transition-all duration-300 hover:shadow-violet-500/20 hover:scale-[1.02]"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="relative aspect-[3/4] overflow-hidden">
        <div
          className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent z-10"
          style={{ opacity: isHovered ? 0.9 : 0.7 }}
        />
        <img
          src={character.image || "/placeholder.svg"}
          alt={character.name}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
        />

        <div className="absolute bottom-0 left-0 right-0 p-4 z-20">
          <h3 className="text-xl font-bold text-white mb-1">{character.name}</h3>
          <p className="text-sm text-gray-200 line-clamp-2 mb-2">{character.description}</p>

          {character.tags && character.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {character.tags.map((tag, index) => (
                <Badge key={index} className="bg-violet-600/50 hover:bg-violet-600 text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </div>

      <div
        className={`absolute top-2 right-2 flex gap-2 z-20 transition-opacity duration-300 ${
          isHovered ? "opacity-100" : "opacity-0"
        }`}
      >
        <Button
          size="icon"
          variant="ghost"
          className="h-8 w-8 rounded-full bg-black/50 hover:bg-violet-600 text-white"
          onClick={onEdit}
        >
          <Edit2 className="h-4 w-4" />
          <span className="sr-only">Edit</span>
        </Button>
      </div>

      {/* Glowing border effect on hover */}
      <div className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
        <div className="absolute inset-0 rounded-lg border border-violet-500/50 shadow-[0_0_15px_rgba(139,92,246,0.3)]"></div>
      </div>
    </Card>
  )
}
