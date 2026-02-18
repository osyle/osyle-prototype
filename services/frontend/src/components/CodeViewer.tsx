import JSZip from 'jszip'
import {
  ChevronRight,
  ChevronDown,
  File,
  Folder,
  Copy,
  Download,
} from 'lucide-react'
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

  const getConfigFiles = (projectName: string) => {
    return {
      'package.json': JSON.stringify(
        {
          name: projectName.toLowerCase().replace(/\s+/g, '-'),
          private: true,
          version: '0.0.0',
          type: 'module',
          scripts: {
            dev: 'vite',
            build: 'tsc && vite build',
            preview: 'vite preview',
          },
          dependencies: {
            react: '^18.3.1',
            'react-dom': '^18.3.1',
            'lucide-react': '^0.468.0',
            clsx: '^2.1.1',
            'tailwind-merge': '^2.5.5',
            'class-variance-authority': '^0.7.1',
          },
          devDependencies: {
            '@types/react': '^18.3.12',
            '@types/react-dom': '^18.3.1',
            '@vitejs/plugin-react': '^4.3.4',
            typescript: '^5.6.3',
            vite: '^6.0.3',
            tailwindcss: '^3.4.16',
            autoprefixer: '^10.4.20',
            postcss: '^8.4.49',
          },
        },
        null,
        2,
      ),

      'vite.config.ts': `import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
})
`,

      'tsconfig.json': JSON.stringify(
        {
          compilerOptions: {
            target: 'ES2020',
            useDefineForClassFields: true,
            lib: ['ES2020', 'DOM', 'DOM.Iterable'],
            module: 'ESNext',
            skipLibCheck: true,
            moduleResolution: 'bundler',
            allowImportingTsExtensions: true,
            isolatedModules: true,
            moduleDetection: 'force',
            noEmit: true,
            jsx: 'react-jsx',
            strict: true,
            noUnusedLocals: true,
            noUnusedParameters: true,
            noFallthroughCasesInSwitch: true,
            noUncheckedSideEffectImports: true,
            baseUrl: '.',
            paths: {
              '@/*': ['./*'],
            },
          },
          include: ['**/*.ts', '**/*.tsx'],
        },
        null,
        2,
      ),

      'index.html': `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${projectName}</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/main.tsx"></script>
  </body>
</html>
`,

      'main.tsx': `import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
`,

      'index.css': `@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 0 0% 3.9%;
    --card: 0 0% 100%;
    --card-foreground: 0 0% 3.9%;
    --popover: 0 0% 100%;
    --popover-foreground: 0 0% 3.9%;
    --primary: 0 0% 9%;
    --primary-foreground: 0 0% 98%;
    --secondary: 0 0% 96.1%;
    --secondary-foreground: 0 0% 9%;
    --muted: 0 0% 96.1%;
    --muted-foreground: 0 0% 45.1%;
    --accent: 0 0% 96.1%;
    --accent-foreground: 0 0% 9%;
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 0 0% 98%;
    --border: 0 0% 89.8%;
    --input: 0 0% 89.8%;
    --ring: 0 0% 3.9%;
    --radius: 0.5rem;
  }

  .dark {
    --background: 0 0% 3.9%;
    --foreground: 0 0% 98%;
    --card: 0 0% 3.9%;
    --card-foreground: 0 0% 98%;
    --popover: 0 0% 3.9%;
    --popover-foreground: 0 0% 98%;
    --primary: 0 0% 98%;
    --primary-foreground: 0 0% 9%;
    --secondary: 0 0% 14.9%;
    --secondary-foreground: 0 0% 98%;
    --muted: 0 0% 14.9%;
    --muted-foreground: 0 0% 63.9%;
    --accent: 0 0% 14.9%;
    --accent-foreground: 0 0% 98%;
    --destructive: 0 62.8% 30.6%;
    --destructive-foreground: 0 0% 98%;
    --border: 0 0% 14.9%;
    --input: 0 0% 14.9%;
    --ring: 0 0% 83.1%;
  }
}

@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground;
  }
}
`,

      'tailwind.config.js': `/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: [
    "./index.html",
    "./**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)'
      },
      colors: {
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))'
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))'
        },
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))'
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))'
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))'
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))'
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))'
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
      }
    }
  },
  plugins: [],
}
`,

      'postcss.config.js': `export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
`,

      '.gitignore': `# Logs
logs
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*
pnpm-debug.log*
lerna-debug.log*

node_modules
dist
dist-ssr
*.local

# Editor directories and files
.vscode/*
!.vscode/extensions.json
.idea
.DS_Store
*.suo
*.ntvs*
*.njsproj
*.sln
*.sw?
`,

      'README.md': `# ${projectName}

This project was generated by Osyle and is ready to run locally.

## Getting Started

1. **Install dependencies:**
   \`\`\`bash
   npm install
   \`\`\`

2. **Run the development server:**
   \`\`\`bash
   npm run dev
   \`\`\`

3. **Open your browser:**
   The app will be running at \`http://localhost:5173\`

## Available Scripts

- \`npm run dev\` - Start development server
- \`npm run build\` - Build for production
- \`npm run preview\` - Preview production build

## Project Structure

\`\`\`
.
├── App.tsx              # Main router component
├── main.tsx             # React entry point
├── index.html           # HTML entry point
├── index.css            # Global styles with Tailwind
├── screens/             # Screen components
├── components/          # UI components (shadcn/ui)
├── lib/                 # Utility functions
├── vite.config.ts       # Vite configuration
├── tsconfig.json        # TypeScript configuration
├── tailwind.config.js   # Tailwind CSS configuration
└── package.json         # Dependencies and scripts
\`\`\`

## Technologies

- **React 18** - UI library
- **TypeScript** - Type safety
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **shadcn/ui** - UI components
- **Lucide React** - Icons
`,
    }
  }

  const downloadAsZip = async () => {
    if (!flow?.project?.files) return

    const zip = new JSZip()
    const projectName = flow.flow_name || 'osyle-project'

    // Add configuration files first
    const configFiles = getConfigFiles(projectName)
    Object.entries(configFiles).forEach(([filePath, content]) => {
      zip.file(filePath, content)
    })

    // Add all project files
    Object.entries(flow.project.files).forEach(([filePath, content]) => {
      // Remove leading slash if present
      const cleanPath = filePath.startsWith('/') ? filePath.slice(1) : filePath
      zip.file(cleanPath, content)
    })

    // Generate the zip file
    const blob = await zip.generateAsync({ type: 'blob' })

    // Create download link
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${projectName}.zip`

    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
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
        <div className="px-3 py-2 border-b border-[#1F1F28] flex items-center justify-between">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
            Files ({fileCount})
          </div>
          <button
            onClick={downloadAsZip}
            className="flex items-center gap-1 px-2 py-1 text-xs rounded bg-[#1A1A24] text-gray-400 hover:text-white hover:bg-[#232330] transition-colors"
            title="Download all files as ZIP"
          >
            <Download className="w-3 h-3" />
            ZIP
          </button>
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
