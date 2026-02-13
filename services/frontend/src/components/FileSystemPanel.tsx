import { ChevronRight, ChevronDown, File, Folder } from 'lucide-react'
import { useState } from 'react'

interface FileNode {
  name: string
  path: string
  type: 'file' | 'folder'
  children?: FileNode[]
}

interface FileSystemPanelProps {
  files: Record<string, string>
  selectedFile: string | null
  onFileSelect: (path: string) => void
}

export function FileSystemPanel({
  files,
  selectedFile,
  onFileSelect,
}: FileSystemPanelProps) {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(
    new Set(['/']),
  )

  // Build file tree from flat file list
  const fileTree = buildFileTree(files)

  const toggleFolder = (path: string) => {
    const newExpanded = new Set(expandedFolders)
    if (newExpanded.has(path)) {
      newExpanded.delete(path)
    } else {
      newExpanded.add(path)
    }
    setExpandedFolders(newExpanded)
  }

  const renderNode = (node: FileNode, depth: number = 0) => {
    if (node.type === 'folder') {
      const isExpanded = expandedFolders.has(node.path)
      return (
        <div key={node.path}>
          <div
            className="flex items-center gap-1 px-2 py-1 hover:bg-muted cursor-pointer"
            style={{ paddingLeft: `${depth * 12 + 8}px` }}
            onClick={() => toggleFolder(node.path)}
          >
            {isExpanded ? (
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            )}
            <Folder className="w-4 h-4 text-blue-500" />
            <span className="text-sm">{node.name}</span>
          </div>
          {isExpanded &&
            node.children?.map(child => renderNode(child, depth + 1))}
        </div>
      )
    }

    return (
      <div
        key={node.path}
        className={`flex items-center gap-1 px-2 py-1 hover:bg-muted cursor-pointer ${
          selectedFile === node.path ? 'bg-primary/10' : ''
        }`}
        style={{ paddingLeft: `${depth * 12 + 24}px` }}
        onClick={() => onFileSelect(node.path)}
      >
        <File className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm">{node.name}</span>
      </div>
    )
  }

  return (
    <div className="h-full bg-background border-r overflow-auto">
      <div className="px-3 py-2 border-b">
        <h3 className="text-sm font-semibold">Files</h3>
      </div>
      <div className="py-1">
        {fileTree.children?.map(node => renderNode(node))}
      </div>
    </div>
  )
}

function buildFileTree(files: Record<string, string>): FileNode {
  const root: FileNode = {
    name: '/',
    path: '/',
    type: 'folder',
    children: [],
  }

  const paths = Object.keys(files).sort()

  for (const path of paths) {
    const parts = path.split('/').filter(Boolean)
    let current = root

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i]
      const isFile = i === parts.length - 1
      const currentPath = '/' + parts.slice(0, i + 1).join('/')

      let child = current.children?.find(c => c.name === part)

      if (!child) {
        child = {
          name: part,
          path: currentPath,
          type: isFile ? 'file' : 'folder',
          children: isFile ? undefined : [],
        }
        current.children = current.children || []
        current.children.push(child)
      }

      if (!isFile) {
        current = child
      }
    }
  }

  return root
}
