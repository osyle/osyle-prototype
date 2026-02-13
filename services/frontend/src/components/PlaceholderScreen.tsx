import React from 'react'
import { Loader2 } from 'lucide-react'

interface PlaceholderScreenProps {
  screenName: string
  description?: string
}

export function PlaceholderScreen({
  screenName,
  description,
}: PlaceholderScreenProps) {
  return (
    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-background to-muted/30">
      <div className="text-center space-y-4 px-8">
        <Loader2 className="w-12 h-12 mx-auto text-primary animate-spin" />
        <div>
          <h3 className="text-lg font-semibold text-foreground">
            Building {screenName}
          </h3>
          {description && (
            <p className="text-sm text-muted-foreground mt-2">{description}</p>
          )}
        </div>
        <div className="flex items-center justify-center gap-1">
          <div
            className="w-2 h-2 bg-primary rounded-full animate-pulse"
            style={{ animationDelay: '0ms' }}
          />
          <div
            className="w-2 h-2 bg-primary rounded-full animate-pulse"
            style={{ animationDelay: '150ms' }}
          />
          <div
            className="w-2 h-2 bg-primary rounded-full animate-pulse"
            style={{ animationDelay: '300ms' }}
          />
        </div>
      </div>
    </div>
  )
}
