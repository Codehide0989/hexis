import { useState, useEffect, useCallback, useRef } from 'react'
import ReactFlow, {
  Node, Edge, Controls, Background,
  useNodesState, useEdgesState, addEdge,
  Connection, NodeTypes, BackgroundVariant,
  Panel, MarkerType, getBezierPath,
  EdgeProps, Handle, Position,
  MiniMap, useReactFlow, ReactFlowProvider
} from 'reactflow'
import 'reactflow/dist/style.css'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { usePlan } from '../../context/PlanContext'
import { UpgradeGate } from '../../components/ui/UpgradeGate'
import html2canvas from 'html2canvas'
import toast from 'react-hot-toast'
import {
  Plus, Trash2, Download, Save, Edit2,
  X, Circle, Square, Diamond,
  ZoomIn, ZoomOut, Maximize2, 
  Link, Unlink, Map, ChevronRight, Upload, Lock
} from 'lucide-react'

// ── Custom Node Types ──────────────────────────────

const NODE_COLORS = [
  '#52b788', '#74c69d', '#95d5b2',  // greens
  '#e9c46a', '#f4a261', '#e76f51',  // ambers/oranges
  '#e63946', '#c77dff', '#457b9d',  // red/purple/blue
  '#4cc9f0', '#ffffff', '#1b4332',  // cyan/white/dark
]

function HexisNode({ data, selected }: any) {
  const isCircle = data.shape === 'circle'
  const isDiamond = data.shape === 'diamond'
  
  const w = data.width || 160
  const h = data.height || 48
  
  // Diamond dimensions (make it bigger so text fits)
  const dw = isDiamond ? Math.max(w, 140) : w
  const dh = isDiamond ? Math.max(h + 40, 90) : h

  return (
    <div
      style={{
        width: dw,
        height: dh,
        position: 'relative',
        cursor: 'grab',
      }}
    >
      {/* SVG shape background */}
      <svg
        style={{
          position: 'absolute',
          top: 0, left: 0,
          width: '100%',
          height: '100%',
          overflow: 'visible',
        }}
      >
        {isCircle ? (
          <ellipse
            cx={dw / 2}
            cy={dh / 2}
            rx={dw / 2 - 1}
            ry={dh / 2 - 1}
            fill="#0d2818"
            stroke={selected ? '#74c69d' : data.color || '#52b788'}
            strokeWidth={selected ? 2 : 1.5}
          />
        ) : isDiamond ? (
          <polygon
            points={`
              ${dw / 2},2
              ${dw - 2},${dh / 2}
              ${dw / 2},${dh - 2}
              2,${dh / 2}
            `}
            fill="#0d2818"
            stroke={selected ? '#74c69d' : data.color || '#52b788'}
            strokeWidth={selected ? 2 : 1.5}
          />
        ) : (
          <rect
            x={1}
            y={1}
            width={dw - 2}
            height={dh - 2}
            fill="#0d2818"
            stroke={selected ? '#74c69d' : data.color || '#52b788'}
            strokeWidth={selected ? 2 : 1.5}
          />
        )}
      </svg>

      {/* Handles — always straight, not rotated */}
      <Handle
        type="target"
        position={Position.Left}
        style={{
          background: data.color || '#52b788',
          border: 'none',
          width: 8, height: 8,
          left: isDiamond ? 0 : -4,
          top: '50%',
          transform: 'translateY(-50%)',
        }}
      />
      <Handle
        type="source"
        position={Position.Right}
        style={{
          background: data.color || '#52b788',
          border: 'none',
          width: 8, height: 8,
          right: isDiamond ? 0 : -4,
          top: '50%',
          transform: 'translateY(-50%)',
        }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom"
        style={{
          background: data.color || '#52b788',
          border: 'none',
          width: 8, height: 8,
          bottom: isDiamond ? 0 : -4,
          left: '50%',
          transform: 'translateX(-50%)',
        }}
      />
      <Handle
        type="target"
        position={Position.Top}
        id="top"
        style={{
          background: data.color || '#52b788',
          border: 'none',
          width: 8, height: 8,
          top: isDiamond ? 0 : -4,
          left: '50%',
          transform: 'translateX(-50%)',
        }}
      />

      {/* Label — always centered, never rotated */}
      <div
        style={{
          position: 'absolute',
          top: 0, left: 0,
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: "'Space Mono', monospace",
          fontSize: '11px',
          fontWeight: 'bold',
          color: '#d8f3dc',
          letterSpacing: '0.05em',
          userSelect: 'none',
          pointerEvents: 'none',
          padding: isDiamond ? '0 20px' : '0 10px',
          textAlign: 'center',
          lineHeight: '1.3',
          overflow: 'hidden',
        }}
      >
        {data.label}
      </div>
    </div>
  )
}

const nodeTypes: NodeTypes = { hexis: HexisNode }

// ── Custom Edge ────────────────────────────────────

function HexisEdge({
  id, sourceX, sourceY, targetX, targetY,
  sourcePosition, targetPosition, data, selected,
  markerEnd
}: EdgeProps) {
  const [edgePath] = getBezierPath({
    sourceX, sourceY, sourcePosition,
    targetX, targetY, targetPosition
  })
  return (
    <g>
      <path
        id={id}
        d={edgePath}
        fill="none"
        stroke={selected ? '#74c69d' : '#1b4332'}
        strokeWidth={selected ? 2 : 1.5}
        strokeDasharray={data?.style === 'dashed' ? '6 3' : 
                         data?.style === 'dotted' ? '2 3' : 'none'}
        markerEnd={markerEnd}
      />
      {data?.label && (
        <text>
          <textPath
            href={`#${id}`}
            startOffset="50%"
            textAnchor="middle"
            style={{
              fontFamily: "'Space Mono', monospace",
              fontSize: '10px',
              fill: '#52b788',
              letterSpacing: '0.05em'
            }}
          >
            {data.label}
          </textPath>
        </text>
      )}
    </g>
  )
}

const edgeTypes = { hexis: HexisEdge }

// ── Main Component ─────────────────────────────────

function MindMapCanvas({ isApex }: { isApex: boolean }) {
  const { user } = useAuth()
  const { fitView, zoomIn, zoomOut } = useReactFlow()

  // Map list state
  const [maps, setMaps] = useState<any[]>([])
  const [activeMap, setActiveMap] = useState<any>(null)
  const [showMapList, setShowMapList] = useState(true)
  const [loadingMaps, setLoadingMaps] = useState(true)

  // Canvas state
  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [importing, setImporting] = useState(false)

  // Node editor
  const [selectedNode, setSelectedNode] = useState<Node | null>(null)
  const [showNodeEditor, setShowNodeEditor] = useState(false)
  const [editLabel, setEditLabel] = useState('')
  const [editContent, setEditContent] = useState('')
  const [editColor, setEditColor] = useState('#52b788')
  const [editShape, setEditShape] = useState('rect')
  const [editWidth, setEditWidth] = useState(160)
  const [editHeight, setEditHeight] = useState(48)

  // Edge editor
  const [selectedEdge, setSelectedEdge] = useState<Edge | null>(null)
  const [showEdgeEditor, setShowEdgeEditor] = useState(false)
  const [editEdgeLabel, setEditEdgeLabel] = useState('')
  const [editEdgeStyle, setEditEdgeStyle] = useState('solid')

  // New map
  const [showNewMap, setShowNewMap] = useState(false)
  const [newMapTitle, setNewMapTitle] = useState('')

  const saveTimer = useRef<any>(null)
  const flowRef = useRef<any>(null)

  // ── Load maps list ────────────────────────────────
  useEffect(() => {
    if (!user?.id) return
    loadMaps()
  }, [user?.id])

  const loadMaps = async () => {
    setLoadingMaps(true)
    const { data } = await supabase
      .from('mindmaps')
      .select('*')
      .eq('user_id', user!.id)
      .order('updated_at', { ascending: false })
    if (data) setMaps(data)
    setLoadingMaps(false)
  }

  // ── Load map nodes + edges ─────────────────────────
  const loadMap = async (map: any) => {
    setActiveMap(map)
    setShowMapList(false)
    setDirty(false)

    const [{ data: nData }, { data: eData }] = await Promise.all([
      supabase.from('mindmap_nodes').select('*')
        .eq('map_id', map.id)
        .order('created_at'),
      supabase.from('mindmap_edges').select('*')
        .eq('map_id', map.id)
    ])

    const rfNodes: Node[] = (nData || []).map(n => ({
      id: n.id,
      type: 'hexis',
      position: { x: n.x, y: n.y },
      data: {
        label: n.label,
        content: n.content,
        color: n.color,
        shape: n.shape,
        width: n.width,
        height: n.height,
        nodeId: n.id,
      },
      width: n.width,
      height: n.height,
    }))

    const rfEdges: Edge[] = (eData || []).map(e => ({
      id: e.id,
      source: e.source_id,
      target: e.target_id,
      type: 'hexis',
      data: { label: e.label, style: e.style },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: '#1b4332',
        width: 16,
        height: 16
      },
      animated: false,
    }))

    setNodes(rfNodes)
    setEdges(rfEdges)

    setTimeout(() => fitView({ padding: 0.2 }), 100)
  }

  // ── Auto-save on change ───────────────────────────
  const triggerSave = useCallback(() => {
    setDirty(true)
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      saveAll()
    }, 2000)
  }, [nodes, edges, activeMap])

  // ── Save all nodes + edges ────────────────────────
  const saveAll = useCallback(async () => {
    if (!activeMap || !user?.id) return
    setSaving(true)
    try {
      // Upsert all nodes
      const nodeRows = nodes.map(n => ({
        id: n.id,
        map_id: activeMap.id,
        user_id: user.id,
        label: n.data.label,
        content: n.data.content || '',
        x: n.position.x,
        y: n.position.y,
        color: n.data.color || '#52b788',
        shape: n.data.shape || 'rect',
        width: n.width || 160,
        height: n.height || 48,
      }))

      if (nodeRows.length > 0) {
        await supabase.from('mindmap_nodes')
          .upsert(nodeRows, { onConflict: 'id' })
      }

      // Delete removed nodes
      const { data: existingNodes } = await supabase
        .from('mindmap_nodes')
        .select('id')
        .eq('map_id', activeMap.id)

      const currentIds = new Set(nodes.map(n => n.id))
      const toDelete = (existingNodes || [])
        .filter(n => !currentIds.has(n.id))
        .map(n => n.id)

      if (toDelete.length > 0) {
        await supabase.from('mindmap_nodes')
          .delete().in('id', toDelete)
      }

      // Upsert edges
      const edgeRows = edges.map(e => ({
        id: e.id,
        map_id: activeMap.id,
        user_id: user.id,
        source_id: e.source,
        target_id: e.target,
        label: e.data?.label || null,
        style: e.data?.style || 'solid',
      }))

      if (edgeRows.length > 0) {
        await supabase.from('mindmap_edges')
          .upsert(edgeRows, { onConflict: 'id' })
      }

      // Delete removed edges
      const { data: existingEdges } = await supabase
        .from('mindmap_edges')
        .select('id')
        .eq('map_id', activeMap.id)

      const currentEdgeIds = new Set(edges.map(e => e.id))
      const edgesToDelete = (existingEdges || [])
        .filter(e => !currentEdgeIds.has(e.id))
        .map(e => e.id)

      if (edgesToDelete.length > 0) {
        await supabase.from('mindmap_edges')
          .delete().in('id', edgesToDelete)
      }

      setDirty(false)
    } catch (err: any) {
      toast.error('SAVE FAILED: ' + err.message)
    } finally {
      setSaving(false)
    }
  }, [nodes, edges, activeMap, user])

  // ── Create new map ────────────────────────────────
  const createMap = async () => {
    if (!newMapTitle.trim() || !user?.id) return
    const { data, error } = await supabase
      .from('mindmaps')
      .insert({
        user_id: user.id,
        title: newMapTitle.trim(),
      })
      .select()
      .single()

    if (error) {
      toast.error('CREATE FAILED: ' + error.message)
      return
    }

    setMaps(prev => [data, ...prev])
    setNewMapTitle('')
    setShowNewMap(false)
    loadMap(data)
    toast.success('MAP INITIALIZED')
  }

  // ── Delete map ────────────────────────────────────
  const deleteMap = async (mapId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm('Delete this map and all its nodes?')) return
    await supabase.from('mindmaps').delete().eq('id', mapId)
    setMaps(prev => prev.filter(m => m.id !== mapId))
    if (activeMap?.id === mapId) {
      setActiveMap(null)
      setShowMapList(true)
      setNodes([])
      setEdges([])
    }
    toast.success('MAP DELETED')
  }

  // ── Add node ──────────────────────────────────────
  const addNode = () => {
    const id = crypto.randomUUID()
    const newNode: Node = {
      id,
      type: 'hexis',
      position: {
        x: Math.random() * 400 + 100,
        y: Math.random() * 300 + 100
      },
      data: {
        label: 'NEW_NODE',
        content: '',
        color: '#52b788',
        shape: 'rect',
        width: 160,
        height: 48,
        nodeId: id,
      },
      width: 160,
      height: 48,
    }
    setNodes(prev => [...prev, newNode])
    triggerSave()
  }

  // ── Connect nodes ─────────────────────────────────
  const onConnect = useCallback((params: Connection) => {
    const newEdge: Edge = {
      ...params,
      id: crypto.randomUUID(),
      type: 'hexis',
      data: { label: '', style: 'solid' },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: '#1b4332',
        width: 16,
        height: 16
      },
    } as Edge
    setEdges(prev => addEdge(newEdge, prev))
    triggerSave()
  }, [])

  // ── Node click → open editor ──────────────────────
  const onNodeClick = useCallback((_: any, node: Node) => {
    setSelectedNode(node)
    setSelectedEdge(null)
    setEditLabel(node.data.label)
    setEditContent(node.data.content || '')
    setEditColor(node.data.color || '#52b788')
    setEditShape(node.data.shape || 'rect')
    setEditWidth(node.width as number || 160)
    setEditHeight(node.height as number || 48)
    setShowNodeEditor(true)
    setShowEdgeEditor(false)
  }, [])

  // ── Edge click → open editor ──────────────────────
  const onEdgeClick = useCallback((_: any, edge: Edge) => {
    setSelectedEdge(edge)
    setSelectedNode(null)
    setEditEdgeLabel(edge.data?.label || '')
    setEditEdgeStyle(edge.data?.style || 'solid')
    setShowEdgeEditor(true)
    setShowNodeEditor(false)
  }, [])

  // ── Save node edits ───────────────────────────────
  const saveNodeEdit = () => {
    if (!selectedNode) return
    setNodes(prev => prev.map(n =>
      n.id === selectedNode.id
        ? {
            ...n,
            data: {
              ...n.data,
              label: editLabel,
              content: editContent,
              color: editColor,
              shape: editShape,
              width: editShape === 'circle' 
                ? 80 
                : editShape === 'diamond' 
                  ? Math.max(editWidth, 140) 
                  : editWidth,
              height: editShape === 'circle' 
                ? 80 
                : editShape === 'diamond' 
                  ? Math.max(editHeight + 40, 90) 
                  : editHeight,
            },
            width: editShape === 'circle' 
              ? 80 
              : editShape === 'diamond' 
                ? Math.max(editWidth, 140) 
                : editWidth,
            height: editShape === 'circle' 
              ? 80 
              : editShape === 'diamond' 
                ? Math.max(editHeight + 40, 90) 
                : editHeight,
          }
        : n
    ))
    setShowNodeEditor(false)
    setSelectedNode(null)
    triggerSave()
    toast.success('NODE UPDATED')
  }

  // ── Save edge edits ───────────────────────────────
  const saveEdgeEdit = () => {
    if (!selectedEdge) return
    setEdges(prev => prev.map(e =>
      e.id === selectedEdge.id
        ? { ...e, data: { label: editEdgeLabel, style: editEdgeStyle } }
        : e
    ))
    setShowEdgeEditor(false)
    setSelectedEdge(null)
    triggerSave()
  }

  // ── Delete selected node ──────────────────────────
  const deleteSelectedNode = () => {
    if (!selectedNode) return
    setNodes(prev => prev.filter(n => n.id !== selectedNode.id))
    setEdges(prev => prev.filter(
      e => e.source !== selectedNode.id && 
           e.target !== selectedNode.id
    ))
    setShowNodeEditor(false)
    setSelectedNode(null)
    triggerSave()
  }

  // ── Delete selected edge ──────────────────────────
  const deleteSelectedEdge = () => {
    if (!selectedEdge) return
    setEdges(prev => prev.filter(e => e.id !== selectedEdge.id))
    setShowEdgeEditor(false)
    setSelectedEdge(null)
    triggerSave()
  }

  // ── Export as PNG ─────────────────────────────────
  const exportImage = async () => {
    const el = document.querySelector('.react-flow') as HTMLElement
    if (!el) return
    try {
      toast.loading('RENDERING MAP...')
      const canvas = await html2canvas(el, {
        backgroundColor: '#0a1a0f',
        scale: 2,
        useCORS: true,
      })
      toast.dismiss()
      const url = canvas.toDataURL('image/png')
      const a = document.createElement('a')
      a.href = url
      a.download = `hexis-map-${activeMap?.title || 'export'}-${Date.now()}.png`
      a.click()
      toast.success('MAP EXPORTED')
    } catch (err: any) {
      toast.dismiss()
      toast.error('EXPORT FAILED')
    }
  }

  // ── Node drag → mark dirty ────────────────────────
  const onNodeDragStop = useCallback(() => {
    triggerSave()
  }, [triggerSave])

  const onNodesChangeWrapper = useCallback((changes: any) => {
    onNodesChange(changes)
  }, [onNodesChange])

  const handleFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0]
    if (!file || !activeMap || !user?.id) return
    
    setImporting(true)
    toast.loading('PARSING FILE...')
    
    try {
      // Read file as text
      const text = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as string)
        reader.onerror = reject
        reader.readAsText(file)
      })

      // Parse file into lines/items
      const lines = text
        .split(/\n|\r\n/)
        .map(l => l.trim())
        .filter(l => l.length > 0)
        .slice(0, 30) // max 30 nodes

      if (lines.length === 0) {
        toast.dismiss()
        toast.error('FILE IS EMPTY')
        setImporting(false)
        return
      }

      // Detect CSV or plain text
      const isCSV = file.name.endsWith('.csv') || 
        lines[0].includes(',')

      let items: string[] = []

      if (isCSV) {
        // Use first column of each CSV row as node label
        items = lines.map(l => {
          const cols = l.split(',')
          return cols[0].replace(/"/g, '').trim()
        }).filter(Boolean)
      } else {
        // For txt/md: use headings and bullet points
        items = lines.map(l => {
          // Strip markdown heading symbols
          return l.replace(/^#+\s*/, '')
            .replace(/^[-*•]\s*/, '')
            .replace(/\*\*/g, '')
            .substring(0, 40)
            .trim()
        }).filter(Boolean)
      }

      // Remove duplicate items
      const unique = [...new Set(items)]

      // Generate positions in a radial layout
      const centerX = 400
      const centerY = 300
      const radius = Math.min(200, unique.length * 30)

      const rootLabel = file.name
        .replace(/\.[^/.]+$/, '')
        .toUpperCase()
        .substring(0, 20)

      const rootId = crypto.randomUUID()
      const colors = NODE_COLORS

      // Root node in center
      const newNodes: Node[] = [{
        id: rootId,
        type: 'hexis',
        position: { x: centerX, y: centerY },
        data: {
          label: rootLabel,
          content: `Imported from ${file.name}`,
          color: '#52b788',
          shape: 'rect',
          width: 180,
          height: 52,
          nodeId: rootId,
        },
        width: 180,
        height: 52,
      }]

      // Child nodes arranged in circle around root
      const newEdges: Edge[] = []

      unique.forEach((item, i) => {
        if (!item) return
        const angle = (2 * Math.PI * i) / unique.length
        const r = unique.length > 6 ? radius + 80 : radius + 60
        const x = centerX + r * Math.cos(angle) - 70
        const y = centerY + r * Math.sin(angle) - 20
        const nodeId = crypto.randomUUID()
        const color = colors[i % colors.length]

        newNodes.push({
          id: nodeId,
          type: 'hexis',
          position: { x, y },
          data: {
            label: item.substring(0, 25),
            content: item,
            color,
            shape: 'rect',
            width: 150,
            height: 44,
            nodeId,
          },
          width: 150,
          height: 44,
        })

        newEdges.push({
          id: crypto.randomUUID(),
          source: rootId,
          target: nodeId,
          type: 'hexis',
          data: { label: '', style: 'solid' },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: '#1b4332',
            width: 14,
            height: 14,
          },
        })
      })

      // Add to existing nodes/edges (don't replace)
      setNodes(prev => [...prev, ...newNodes])
      setEdges(prev => [...prev, ...newEdges])
      
      toast.dismiss()
      toast.success(
        `MAP GENERATED: ${newNodes.length} nodes from ${file.name}`
      )
      
      setTimeout(() => fitView({ padding: 0.15 }), 150)
      triggerSave()
    } catch (err: any) {
      toast.dismiss()
      toast.error('IMPORT FAILED: ' + err.message)
    } finally {
      setImporting(false)
      // Reset file input so same file can be uploaded again
      e.target.value = ''
    }
  }

  // ═══════════════════════════════════════════════
  // RENDER — Map List
  // ═══════════════════════════════════════════════
  if (showMapList || !activeMap) {
    return (
      <div className="h-full bg-[#0a1a0f] p-4 md:p-8 overflow-y-auto">
        <div className="max-w-3xl mx-auto">

          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="font-mono text-xs text-[#52b788]">&gt;</span>
                <h1 className="font-mono font-bold text-xl md:text-2xl
                  text-[#d8f3dc] uppercase tracking-wider">
                  MIND_MAP
                </h1>
              </div>
              <p className="font-mono text-xs text-[#52b788]">
                KNOWLEDGE_GRAPH_SYSTEM · APEX
              </p>
            </div>
            {isApex && (
              <button
                onClick={() => setShowNewMap(true)}
                className="hex-btn-primary flex items-center gap-2 text-xs px-4 py-2.5"
              >
                <Plus size={14} /> NEW MAP
              </button>
            )}
          </div>

          {!isApex && (
            <div className="bg-[#0d2818] border border-[#e9c46a]/40 
              p-4 mb-6 flex flex-col sm:flex-row 
              sm:items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <Lock size={15} className="text-[#e9c46a] shrink-0 mt-0.5" />
                <div>
                  <p className="font-mono text-xs font-bold 
                    text-[#e9c46a] uppercase tracking-wider mb-0.5">
                    APEX PLAN REQUIRED
                  </p>
                  <p className="font-sans text-xs text-[#95d5b2]">
                    Upgrade to create and edit mind maps.
                    Preview available below.
                  </p>
                </div>
              </div>
              <a href="/dashboard/plan"
                className="hex-btn-primary text-xs px-4 py-2 
                  shrink-0 whitespace-nowrap inline-flex 
                  items-center gap-1.5">
                UPGRADE →
              </a>
            </div>
          )}

          {/* New map form */}
          {showNewMap && (
            <div className="bg-[#0d2818] border border-[#52b788] p-5 mb-6">
              <p className="font-mono text-xs text-[#52b788] 
                uppercase tracking-widest mb-3">
                INITIALIZE NEW MAP
              </p>
              <div className="flex gap-2">
                <input
                  autoFocus
                  value={newMapTitle}
                  onChange={e => setNewMapTitle(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && createMap()}
                  placeholder="MAP TITLE"
                  className="hex-input flex-1 text-sm"
                />
                <button onClick={createMap}
                  className="hex-btn-primary px-4 text-xs">
                  CREATE →
                </button>
                <button onClick={() => setShowNewMap(false)}
                  className="hex-btn-outline px-3 text-xs">
                  <X size={14} />
                </button>
              </div>
            </div>
          )}

          {/* Maps grid */}
          {loadingMaps ? (
            <div className="animate-pulse space-y-3">
              {[1,2,3].map(i => (
                <div key={i} className="h-20 bg-[#0d2818] 
                  border border-[#1b4332]" />
              ))}
            </div>
          ) : maps.length === 0 ? (
            <>
              {!isApex && (
                <div className="bg-[#0d2818] border border-[#1b4332] 
                  p-6 opacity-50 pointer-events-none select-none mb-6">
                  <div className="flex items-center gap-2 mb-3">
                    <Map size={14} className="text-[#52b788]" />
                    <p className="font-mono text-sm text-[#d8f3dc] uppercase">
                      EXAMPLE MAP
                    </p>
                  </div>
                  <p className="font-mono text-[10px] text-[#1b4332]">
                    UPGRADE TO APEX TO UNLOCK
                  </p>
                </div>
              )}
              <div className="text-center py-20">
                <Map size={40} className="text-[#1b4332] mx-auto mb-4" />
                <p className="font-mono text-sm text-[#1b4332] 
                  tracking-widest mb-2">
                  NO_MAPS_FOUND
                </p>
                <p className="font-mono text-xs text-[#1b4332]">
                  Create your first knowledge map
                </p>
              </div>
            </>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {maps.map(map => (
                <div
                  key={map.id}
                  onClick={() => loadMap(map)}
                  className="bg-[#0d2818] border border-[#1b4332] p-5
                    hover:border-[#52b788] transition-colors cursor-pointer group"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Map size={14} className="text-[#52b788] shrink-0" />
                        <p className="font-mono font-bold text-sm 
                          text-[#d8f3dc] truncate uppercase">
                          {map.title}
                        </p>
                      </div>
                      <p className="font-mono text-[10px] text-[#1b4332]">
                        UPDATED: {new Date(map.updated_at)
                          .toLocaleDateString('en-IN')}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-3">
                      <button
                        onClick={(e) => deleteMap(map.id, e)}
                        className="opacity-0 group-hover:opacity-100
                          p-1.5 text-[#e63946] hover:bg-[#e63946]/10
                          transition-all"
                      >
                        <Trash2 size={13} />
                      </button>
                      <ChevronRight size={14} 
                        className="text-[#1b4332] group-hover:text-[#52b788] 
                          transition-colors" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  // ═══════════════════════════════════════════════
  // RENDER — Canvas
  // ═══════════════════════════════════════════════
  return (
    <div className="h-full flex flex-col bg-[#0a1a0f]">

      {/* Top toolbar */}
      <div className="flex items-center justify-between px-3 py-2
        bg-[#0d2818] border-b border-[#1b4332] shrink-0 gap-2">

        {/* Left */}
        <div className="flex items-center gap-2 min-w-0">
          <button
            onClick={() => { saveAll(); setShowMapList(true) }}
            className="font-mono text-xs text-[#95d5b2] 
              hover:text-[#52b788] transition-colors 
              flex items-center gap-1 shrink-0"
          >
            ← MAPS
          </button>
          <span className="text-[#1b4332] shrink-0">|</span>
          <span className="font-mono font-bold text-xs
            text-[#d8f3dc] uppercase truncate max-w-[100px] sm:max-w-[200px]">
            {activeMap.title}
          </span>
          {dirty && (
            <span className="font-mono text-[9px] text-[#e9c46a]
              animate-pulse tracking-widest shrink-0 hidden sm:block">
              ● UNSAVED
            </span>
          )}
          {saving && (
            <span className="font-mono text-[9px] text-[#52b788]
              animate-pulse tracking-widest shrink-0 hidden sm:block">
              SAVING...
            </span>
          )}
        </div>

        {/* Right */}
        <div className="flex items-center gap-1.5 shrink-0">
          {isApex && (
            <>
              <button
                onClick={addNode}
                className="flex items-center gap-1 bg-[#52b788] 
                  text-[#0a1a0f] font-mono font-bold text-[10px] 
                  uppercase tracking-wider px-3 py-1.5
                  hover:bg-[#74c69d] transition-colors"
              >
                <Plus size={12} /> NODE
              </button>
              
              {/* File upload button */}
              <div className="flex flex-col items-center gap-0.5">
                <label className="flex items-center gap-1 border 
                  border-[#1b4332] text-[#95d5b2] font-mono text-[10px] 
                  uppercase tracking-wider px-3 py-1.5 cursor-pointer
                  hover:border-[#52b788] hover:text-[#52b788] 
                  transition-colors">
                  <Upload size={12} /> IMPORT
                  <input
                    type="file"
                    accept=".txt,.csv,.md,.doc,.docx"
                    className="hidden"
                    onChange={handleFileUpload}
                  />
                </label>
                <span className="font-mono text-[9px] text-[#1b4332]
                  hidden lg:block -mt-0.5">
                  txt csv md
                </span>
              </div>

              <button
                onClick={saveAll}
                className="flex items-center gap-1 border 
                  border-[#1b4332] text-[#95d5b2] font-mono text-[10px] 
                  uppercase tracking-wider px-3 py-1.5
                  hover:border-[#52b788] hover:text-[#52b788] 
                  transition-colors"
              >
                <Save size={12} /> SAVE
              </button>
              <button
                onClick={exportImage}
                className="flex items-center gap-1 border 
                  border-[#1b4332] text-[#95d5b2] font-mono text-[10px] 
                  uppercase tracking-wider px-3 py-1.5
                  hover:border-[#52b788] hover:text-[#52b788] 
                  transition-colors hidden sm:flex"
              >
                <Download size={12} /> EXPORT
              </button>
            </>
          )}
          <button
            onClick={() => fitView({ padding: 0.2 })}
            className="p-1.5 border border-[#1b4332] text-[#95d5b2]
              hover:border-[#52b788] hover:text-[#52b788] transition-colors"
          >
            <Maximize2 size={13} />
          </button>
        </div>
      </div>

      {/* Canvas + Side panels */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Non-APEX lock overlay */}
        {!isApex && (
          <div className="absolute inset-0 z-20 
            bg-[#0a1a0f]/85 backdrop-blur-[2px]
            flex items-center justify-center">
            <div className="text-center px-6 max-w-sm">
              <div className="w-16 h-16 border border-[#52b788] 
                flex items-center justify-center mx-auto mb-5">
                <Lock size={28} className="text-[#52b788]" />
              </div>
              <p className="font-mono font-bold text-sm 
                text-[#d8f3dc] uppercase tracking-widest mb-2">
                APEX PLAN REQUIRED
              </p>
              <p className="font-mono text-xs text-[#95d5b2] 
                mb-6 leading-relaxed">
                Mind Map is an APEX-only feature.
                Upgrade to create unlimited knowledge graphs,
                import files, and export as images.
              </p>
              <a 
                href="/dashboard/plan"
                className="hex-btn-primary text-xs px-6 py-2.5 
                  inline-flex items-center gap-2"
              >
                UPGRADE TO APEX →
              </a>
            </div>
          </div>
        )}

        {/* ReactFlow canvas */}
        <div 
          className="flex-1" 
          ref={flowRef}
          style={{ pointerEvents: isApex ? 'all' : 'none' }}
        >
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChangeWrapper}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            onEdgeClick={onEdgeClick}
            onNodeDragStop={onNodeDragStop}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            fitView
            deleteKeyCode="Delete"
            onPaneClick={() => {
              setShowNodeEditor(false)
              setShowEdgeEditor(false)
              setSelectedNode(null)
              setSelectedEdge(null)
            }}
            style={{ background: '#0a1a0f' }}
            defaultEdgeOptions={{
              type: 'hexis',
              markerEnd: {
                type: MarkerType.ArrowClosed,
                color: '#1b4332',
              },
            }}
          >
            <Background
              variant={BackgroundVariant.Dots}
              gap={20}
              size={1}
              color="#1b4332"
            />
            <Controls
              style={{
                background: '#0d2818',
                border: '1px solid #1b4332',
                borderRadius: 0,
              }}
              showInteractive={false}
            />
            <MiniMap
              style={{
                background: '#0d2818',
                border: '1px solid #1b4332',
                width: 120,
                height: 80,
              }}
              nodeColor={(n) => n.data?.color || '#52b788'}
              nodeStrokeWidth={0}
              maskColor="#0a1a0fcc"
              pannable
              zoomable
            />

            {/* Hint panel */}
            <Panel position="bottom-left">
              <div className="font-mono text-[9px] text-[#1b4332] 
                leading-relaxed bg-[#0d2818] border border-[#1b4332] 
                p-2 hidden md:block space-y-0.5">
                <div>DRAG node → move</div>
                <div>DRAG handle → connect</div>
                <div>CLICK → edit</div>
                <div>DEL key → delete</div>
              </div>
            </Panel>
          </ReactFlow>
        </div>

        {/* Node Editor Panel */}
        {showNodeEditor && selectedNode && (
          <div className="w-full md:w-72 bg-[#0d2818] border-l 
            border-[#1b4332] flex flex-col shrink-0
            absolute md:relative right-0 top-0 h-full z-10
            shadow-2xl">
            <div className="flex items-center justify-between 
              px-4 py-3 border-b border-[#1b4332]">
              <span className="font-mono text-xs text-[#52b788] 
                uppercase tracking-widest">
                EDIT_NODE
              </span>
              <button onClick={() => setShowNodeEditor(false)}
                className="text-[#95d5b2] hover:text-[#52b788]">
                <X size={14} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {/* Label */}
              <div>
                <label className="block font-mono text-[10px] 
                  text-[#95d5b2] uppercase tracking-widest mb-1.5">
                  LABEL
                </label>
                <input
                  value={editLabel}
                  onChange={e => setEditLabel(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && saveNodeEdit()}
                  className="hex-input text-xs w-full"
                  placeholder="NODE LABEL"
                />
              </div>

              {/* Content/notes */}
              <div>
                <label className="block font-mono text-[10px] 
                  text-[#95d5b2] uppercase tracking-widest mb-1.5">
                  NOTES
                </label>
                <textarea
                  value={editContent}
                  onChange={e => setEditContent(e.target.value)}
                  rows={3}
                  className="hex-input text-xs w-full resize-none"
                  placeholder="Optional notes..."
                />
              </div>

              {/* Shape */}
              <div>
                <label className="block font-mono text-[10px] 
                  text-[#95d5b2] uppercase tracking-widest mb-1.5">
                  SHAPE
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { val: 'rect',     icon: <Square size={13} />,   label: 'RECT'    },
                    { val: 'circle',   icon: <Circle size={13} />,   label: 'CIRCLE'  },
                    { val: 'diamond',  icon: <Diamond size={13} />,  label: 'DIAMOND' },
                  ].map(s => (
                    <button
                      key={s.val}
                      onClick={() => setEditShape(s.val)}
                      className={`flex flex-col items-center justify-center 
                        gap-1 p-2 border transition-colors
                        ${editShape === s.val
                          ? 'border-[#52b788] text-[#52b788] bg-[#52b788]/10'
                          : 'border-[#1b4332] text-[#95d5b2] hover:border-[#52b788] hover:text-[#52b788]'
                        }`}
                    >
                      {s.icon}
                      <span className="font-mono text-[8px] tracking-wider">
                        {s.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Color */}
              <div>
                <label className="block font-mono text-[10px] 
                  text-[#95d5b2] uppercase tracking-widest mb-1.5">
                  COLOR
                </label>
                <div className="grid grid-cols-4 gap-1.5">
                  {NODE_COLORS.map(c => (
                    <button
                      key={c}
                      onClick={() => setEditColor(c)}
                      title={c}
                      style={{ background: c }}
                      className={`h-8 transition-all relative
                        ${editColor === c
                          ? 'ring-2 ring-white ring-offset-1 ring-offset-[#0d2818]'
                          : 'opacity-60 hover:opacity-100'
                        }`}
                    >
                      {editColor === c && (
                        <span className="absolute inset-0 flex items-center 
                          justify-center text-white font-bold text-xs">
                          ✓
                        </span>
                      )}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <div 
                    className="w-7 h-7 shrink-0 border border-[#1b4332]"
                    style={{ background: editColor }}
                  />
                  <input
                    type="text"
                    value={editColor}
                    onChange={e => {
                      const v = e.target.value
                      if (/^#[0-9A-Fa-f]{0,6}$/.test(v)) setEditColor(v)
                    }}
                    placeholder="#52b788"
                    maxLength={7}
                    className="flex-1 bg-[#0a1a0f] border border-[#1b4332] 
                      px-2 py-1.5 font-mono text-xs text-[#d8f3dc] 
                      outline-none focus:border-[#52b788] tracking-widest"
                  />
                  <input
                    type="color"
                    value={editColor}
                    onChange={e => setEditColor(e.target.value)}
                    className="w-7 h-7 cursor-pointer border border-[#1b4332] 
                      bg-[#0a1a0f] p-0 outline-none"
                    title="Pick custom color"
                  />
                </div>
              </div>

              {/* Size */}
              <div>
                <label className="block font-mono text-[10px] 
                  text-[#95d5b2] uppercase tracking-widest mb-1.5">
                  SIZE
                </label>
                <div className="flex gap-1.5">
                  {[
                    { label: 'S', w: 120, h: 40 },
                    { label: 'M', w: 160, h: 48 },
                    { label: 'L', w: 220, h: 56 },
                    { label: 'XL', w: 280, h: 64 },
                  ].map(s => (
                    <button
                      key={s.label}
                      onClick={() => {
                        setEditWidth(s.w)
                        setEditHeight(s.h)
                      }}
                      className={`flex-1 py-1.5 font-mono text-[10px] 
                        border transition-colors
                        ${(editWidth || 160) === s.w
                          ? 'border-[#52b788] text-[#52b788] bg-[#52b788]/10'
                          : 'border-[#1b4332] text-[#95d5b2] hover:border-[#52b788]'
                        }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="p-4 border-t border-[#1b4332] space-y-2">
              <button
                onClick={saveNodeEdit}
                className="hex-btn-primary w-full text-xs py-2"
              >
                APPLY CHANGES
              </button>
              <button
                onClick={deleteSelectedNode}
                className="hex-btn-danger w-full text-xs py-2 
                  flex items-center justify-center gap-2"
              >
                <Trash2 size={13} /> DELETE NODE
              </button>
            </div>
          </div>
        )}

        {/* Edge Editor Panel */}
        {showEdgeEditor && selectedEdge && (
          <div className="w-full md:w-64 bg-[#0d2818] border-l 
            border-[#1b4332] flex flex-col shrink-0
            absolute md:relative right-0 top-0 h-full z-10 shadow-2xl">
            <div className="flex items-center justify-between 
              px-4 py-3 border-b border-[#1b4332]">
              <span className="font-mono text-xs text-[#52b788] 
                uppercase tracking-widest">
                EDIT_CONNECTION
              </span>
              <button onClick={() => setShowEdgeEditor(false)}
                className="text-[#95d5b2] hover:text-[#52b788]">
                <X size={14} />
              </button>
            </div>

            <div className="flex-1 p-4 space-y-4">
              <div>
                <label className="block font-mono text-[10px] 
                  text-[#95d5b2] uppercase tracking-widest mb-1.5">
                  LABEL
                </label>
                <input
                  value={editEdgeLabel}
                  onChange={e => setEditEdgeLabel(e.target.value)}
                  className="hex-input text-xs w-full"
                  placeholder="Connection label"
                />
              </div>

              <div>
                <label className="block font-mono text-[10px] 
                  text-[#95d5b2] uppercase tracking-widest mb-1.5">
                  LINE STYLE
                </label>
                <div className="space-y-1.5">
                  {['solid', 'dashed', 'dotted'].map(s => (
                    <button
                      key={s}
                      onClick={() => setEditEdgeStyle(s)}
                      className={`w-full text-left px-3 py-2 
                        font-mono text-xs uppercase tracking-wider
                        border transition-colors
                        ${editEdgeStyle === s
                          ? 'border-[#52b788] text-[#52b788] bg-[#52b788]/10'
                          : 'border-[#1b4332] text-[#95d5b2] hover:border-[#52b788]'
                        }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-[#1b4332] space-y-2">
              <button
                onClick={saveEdgeEdit}
                className="hex-btn-primary w-full text-xs py-2"
              >
                APPLY CHANGES
              </button>
              <button
                onClick={deleteSelectedEdge}
                className="hex-btn-danger w-full text-xs py-2
                  flex items-center justify-center gap-2"
              >
                <Unlink size={13} /> DELETE CONNECTION
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// Wrap with ReactFlowProvider (required)
export default function MindMap() {
  const { canUse } = usePlan()
  const isApex = canUse('mindmap' as any)
  return (
    <ReactFlowProvider>
      <MindMapCanvas isApex={isApex} />
    </ReactFlowProvider>
  )
}
