import React from 'react'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism'

interface FileViewerProps {
  path: string | null
  content: string | null
}

export function FileViewer({ path, content }: FileViewerProps) {
  if (!path || !content) {
    return (
      <div className="h-full flex items-center justify-center bg-muted/30">
        <p className="text-muted-foreground text-sm">Select a file to view</p>
      </div>
    )
  }

  const language = getLanguageFromPath(path)

  return (
    <div className="h-full flex flex-col bg-background">
      <div className="px-4 py-2 border-b bg-muted/30">
        <h3 className="text-sm font-medium truncate">{path}</h3>
      </div>
      <div className="flex-1 overflow-auto">
        <SyntaxHighlighter
          language={language}
          style={vscDarkPlus}
          customStyle={{
            margin: 0,
            height: '100%',
            fontSize: '14px',
          }}
          showLineNumbers
        >
          {content}
        </SyntaxHighlighter>
      </div>
    </div>
  )
}

function getLanguageFromPath(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase()

  switch (ext) {
    case 'tsx':
    case 'ts':
      return 'typescript'
    case 'jsx':
    case 'js':
      return 'javascript'
    case 'css':
      return 'css'
    case 'json':
      return 'json'
    case 'md':
      return 'markdown'
    default:
      return 'text'
  }
}
