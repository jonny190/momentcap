"use client"
import { useState } from "react"
import { Button } from "@/components/ui/Button"

interface Photo {
  id: string
  filename: string
  uploadedAt: Date
  qrCode: { label: string | null }
}

export function PhotoGrid({ photos }: { photos: Photo[] }) {
  const [selected, setSelected] = useState<string | null>(null)

  return (
    <div>
      <div className="grid grid-cols-3 gap-2">
        {photos.map((photo) => (
          <button
            key={photo.id}
            onClick={() => setSelected(photo.id)}
            className="aspect-square bg-gray-900 rounded-lg overflow-hidden hover:ring-2 ring-white transition-all"
          >
            <img
              src={`/api/admin/photos/${photo.id}/view`}
              alt=""
              className="w-full h-full object-cover"
            />
          </button>
        ))}
      </div>

      {selected && (
        <div
          className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4"
          onClick={() => setSelected(null)}
        >
          <div className="max-w-xl w-full" onClick={(e) => e.stopPropagation()}>
            <img
              src={`/api/admin/photos/${selected}/view`}
              alt=""
              className="w-full rounded-xl"
            />
            <div className="flex gap-3 mt-4 justify-center">
              <a href={`/api/admin/photos/${selected}/download`} download>
                <Button variant="secondary">Download</Button>
              </a>
              <Button variant="secondary" onClick={() => setSelected(null)}>Close</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
