import type { FlowTreeProps, TreeNodeProps } from '../types/mobbin'

export default function FlowTree({
  nodes,
  selectedId,
  onSelect,
}: FlowTreeProps) {
  return (
    <ul className="flex flex-col">
      {nodes.map(node => (
        <TreeNode
          key={node.id}
          node={node}
          isSelected={node.id === selectedId}
          onSelect={() => onSelect(node.id)}
        />
      ))}
    </ul>
  )
}

function TreeNode({ node, isSelected, onSelect }: TreeNodeProps) {
  // Create branch lines based on depth
  const branches = Array.from({ length: node.depth }, (_, i) => {
    const isLast = i === node.depth - 1

    return (
      <div
        key={i}
        className="flex h-full w-3 items-center border-l border-gray-300"
      >
        {isLast && <div className="w-full border-b border-gray-300"></div>}
      </div>
    )
  })

  return (
    <li
      className={`
        flex h-9 items-center gap-2 px-3 cursor-pointer transition-colors
        hover:bg-gray-100
        ${isSelected ? 'bg-blue-50 text-blue-600 font-semibold' : 'text-gray-700'}
      `}
      onClick={onSelect}
      role="button"
      tabIndex={0}
      onKeyDown={e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onSelect()
        }
      }}
    >
      {/* Render branch lines for hierarchy */}
      <div className="flex items-stretch gap-0 self-stretch">{branches}</div>

      {/* Title */}
      <span className="flex-1 truncate text-sm">{node.title}</span>

      {/* Screen count badge */}
      <span
        className={`
        text-xs px-1.5 py-0.5 rounded
        ${isSelected ? 'text-blue-600' : 'text-gray-500'}
      `}
      >
        {node.screen_count}
      </span>
    </li>
  )
}
