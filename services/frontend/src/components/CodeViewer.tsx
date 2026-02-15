import { ChevronRight, ChevronDown, File, Folder, Copy } from 'lucide-react'
import React, { useState, useMemo } from 'react'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { CodeAnnotator, useAgentatorGlobal } from '../lib/Agentator'
import type { FlowGraph } from '../types/home.types'

interface CodeViewerProps {
  flow: FlowGraph | null
}

interface FileNode {
  name: string
  path: string
  type: 'file' | 'folder'
  children?: FileNode[]
}

export default function CodeViewer({ flow }: CodeViewerProps) {
  const [selectedFile, setSelectedFile] = useState<string | null>(null)
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(
    new Set(['/components', '/lib', '/screens', '/']),
  )

  // Get Agentator state for annotation mode
  const { isActive } = useAgentatorGlobal()

  // Extract screen name from file path for annotation purposes
  // e.g., "/screens/LoginScreen.tsx" -> "LoginScreen"
  const getScreenNameFromPath = (filePath: string): string => {
    if (!filePath.startsWith('/screens/')) {
      // For non-screen files, use the file path itself as the "screen name"
      return filePath
    }
    const fileName = filePath.split('/').pop() || filePath
    return fileName.replace(/\.(tsx|jsx|ts|js)$/, '')
  }

  // Build file tree from unified project files
  const fileTree = useMemo(() => {
    if (!flow?.project?.files) return []

    const files = Object.keys(flow.project.files).sort()
    const root: FileNode[] = []
    const folderMap = new Map<string, FileNode>()

    files.forEach(filePath => {
      const parts = filePath.split('/').filter(Boolean)

      if (parts.length === 1) {
        // Root file
        root.push({
          name: parts[0],
          path: filePath,
          type: 'file',
        })
      } else {
        // Create folder structure
        let currentPath = ''
        for (let i = 0; i < parts.length - 1; i++) {
          const part = parts[i]
          const parentPath = currentPath
          currentPath = currentPath + '/' + part

          if (!folderMap.has(currentPath)) {
            const folderNode: FileNode = {
              name: part,
              path: currentPath,
              type: 'folder',
              children: [],
            }
            folderMap.set(currentPath, folderNode)

            if (parentPath === '') {
              root.push(folderNode)
            } else {
              const parentFolder = folderMap.get(parentPath)
              if (parentFolder?.children) {
                parentFolder.children.push(folderNode)
              }
            }
          }
        }

        // Add file to folder
        const fileName = parts[parts.length - 1]
        const folder = folderMap.get(currentPath)
        if (folder?.children) {
          folder.children.push({
            name: fileName,
            path: filePath,
            type: 'file',
          })
        }
      }
    })

    // Sort: folders first, then alphabetically
    const sortNodes = (nodes: FileNode[]) => {
      nodes.sort((a, b) => {
        if (a.type === 'folder' && b.type === 'file') return -1
        if (a.type === 'file' && b.type === 'folder') return 1
        return a.name.localeCompare(b.name)
      })
      nodes.forEach(node => {
        if (node.children) sortNodes(node.children)
      })
    }
    sortNodes(root)

    return root
  }, [flow])

  const toggleFolder = (path: string) => {
    setExpandedFolders(prev => {
      const next = new Set(prev)
      if (next.has(path)) {
        next.delete(path)
      } else {
        next.add(path)
      }
      return next
    })
  }

  const renderNode = (node: FileNode, depth: number = 0): React.JSX.Element => {
    if (node.type === 'folder') {
      const isExpanded = expandedFolders.has(node.path)
      return (
        <div key={node.path}>
          <div
            className="flex items-center gap-1 px-2 py-1 hover:bg-[#1A1A24] cursor-pointer text-sm"
            style={{ paddingLeft: `${depth * 12 + 8}px` }}
            onClick={() => toggleFolder(node.path)}
          >
            {isExpanded ? (
              <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
            ) : (
              <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
            )}
            <Folder className="w-4 h-4 text-blue-400 flex-shrink-0" />
            <span className="text-gray-200 truncate">{node.name}</span>
          </div>
          {isExpanded && node.children && (
            <div>
              {node.children.map(child => renderNode(child, depth + 1))}
            </div>
          )}
        </div>
      )
    }

    // File node
    const isSelected = selectedFile === node.path
    return (
      <div
        key={node.path}
        className={`flex items-center gap-1 px-2 py-1 cursor-pointer text-sm transition-colors ${
          isSelected
            ? 'bg-[#6C63FF]/20 text-white border-l-2 border-[#6C63FF]'
            : 'hover:bg-[#1A1A24] text-gray-300'
        }`}
        style={{ paddingLeft: `${depth * 12 + 28}px` }}
        onClick={() => setSelectedFile(node.path)}
      >
        <File className="w-4 h-4 text-gray-400 flex-shrink-0" />
        <span className="truncate">{node.name}</span>
      </div>
    )
  }

  const selectedFileContent =
    selectedFile && flow?.project?.files?.[selectedFile]

  const getLanguage = (filePath: string) => {
    if (filePath.endsWith('.tsx') || filePath.endsWith('.ts'))
      return 'typescript'
    if (filePath.endsWith('.jsx') || filePath.endsWith('.js'))
      return 'javascript'
    if (filePath.endsWith('.css')) return 'css'
    if (filePath.endsWith('.json')) return 'json'
    if (filePath.endsWith('.md')) return 'markdown'
    return 'javascript'
  }

  const copyCode = () => {
    if (selectedFileContent) {
      navigator.clipboard.writeText(selectedFileContent)
    }
  }

  if (!flow?.project?.files) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-[#0A0A0F]">
        <div className="text-center">
          <div className="text-gray-500 text-sm mb-2">No code to display</div>
          <div className="text-gray-600 text-xs">
            Generate a flow to see the code
          </div>
        </div>
      </div>
    )
  }

  const fileCount = Object.keys(flow.project.files).length

  return (
    <div className="w-full h-full flex bg-[#0A0A0F]">
      {/* File Tree Sidebar */}
      <div className="w-64 border-r border-[#1F1F28] flex flex-col bg-[#0D0D12]">
        <div className="px-3 py-2 border-b border-[#1F1F28] text-xs font-semibold text-gray-400 uppercase tracking-wider">
          Files ({fileCount})
        </div>
        <div className="flex-1 overflow-y-auto py-1">
          {fileTree.map(node => renderNode(node))}
        </div>
      </div>

      {/* Code Display */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {selectedFileContent ? (
          <>
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-2 bg-[#13131A] border-b border-[#1F1F28]">
              <div className="flex items-center gap-3 text-xs">
                <span className="text-gray-400 font-mono">{selectedFile}</span>
                <span className="text-gray-600">•</span>
                <span className="text-gray-500">
                  {selectedFileContent.split('\n').length} lines
                </span>
                <span className="text-gray-600">•</span>
                <span className="text-gray-500">
                  {Math.round(selectedFileContent.length / 1024)}KB
                </span>
              </div>

              <div className="flex items-center gap-2">
                <div className="px-2 py-1 text-[10px] rounded bg-gray-800/50 text-gray-500 font-medium">
                  READ-ONLY
                </div>
                <button
                  onClick={copyCode}
                  className="flex items-center gap-1 px-3 py-1 text-xs rounded bg-[#1A1A24] text-gray-400 hover:text-white hover:bg-[#232330] transition-colors"
                >
                  <Copy className="w-3 h-3" />
                  Copy
                </button>
              </div>
            </div>

            {/* Code with syntax highlighting */}
            <div className="flex-1 overflow-auto">
              {isActive && selectedFile ? (
                // Annotation mode active - wrap with CodeAnnotator
                <CodeAnnotator
                  screenName={getScreenNameFromPath(selectedFile)}
                  code={selectedFileContent}
                  lineHeight={20.8} // Based on lineHeight 1.6 * fontSize 13px
                  isActive={isActive}
                >
                  <SyntaxHighlighter
                    language={getLanguage(selectedFile)}
                    style={vscDarkPlus}
                    showLineNumbers
                    customStyle={{
                      margin: 0,
                      padding: '20px',
                      fontSize: '13px',
                      lineHeight: '1.6',
                      background: '#0A0A0F',
                      height: '100%',
                    }}
                    lineNumberStyle={{
                      minWidth: '3em',
                      paddingRight: '1em',
                      color: '#4A4A5A',
                      userSelect: 'none',
                    }}
                    codeTagProps={{
                      style: {
                        fontFamily:
                          'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                      },
                    }}
                  >
                    {selectedFileContent}
                  </SyntaxHighlighter>
                </CodeAnnotator>
              ) : (
                // Normal mode - just SyntaxHighlighter
                <SyntaxHighlighter
                  language={getLanguage(selectedFile)}
                  style={vscDarkPlus}
                  showLineNumbers
                  customStyle={{
                    margin: 0,
                    padding: '20px',
                    fontSize: '13px',
                    lineHeight: '1.6',
                    background: '#0A0A0F',
                    height: '100%',
                  }}
                  lineNumberStyle={{
                    minWidth: '3em',
                    paddingRight: '1em',
                    color: '#4A4A5A',
                    userSelect: 'none',
                  }}
                  codeTagProps={{
                    style: {
                      fontFamily:
                        'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                    },
                  }}
                >
                  {selectedFileContent}
                </SyntaxHighlighter>
              )}
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <File className="w-12 h-12 text-gray-600 mx-auto mb-3" />
              <div className="text-gray-400 text-sm">Select a file to view</div>
              <div className="text-gray-600 text-xs mt-1">
                {fileCount} files in project
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
