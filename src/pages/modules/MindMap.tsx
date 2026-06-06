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
  Link, Unlink, Map, ChevronRight
} from 'lucide-react'

// ── Custom Node Types ──────────────────────────────

const NODE_COLORS = [
  '#52b788', '#74c69d', '#e9c46a',
  '#e63946', '#457b9d', '#95d5b2',
  '#1b4332', '#f4a261'
]

function HexisNode({ data, selected }: any) {
  const isCircle = data.shape === 'circle'
  const isDiamond = data.shape === 'diamond'

  return (
    <div
      style={{
        background: '#0d2818',
        border: `1.5px solid ${selected ? '#74c69d' : data.color || '#52b788'}`,
        borderRadius: isCircle ? '50%' : '0px',
        transform: isDiamond ? 'rotate(45deg)' : 'none',
        width: data.width || 160,
        height: data.height || 48,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'grab',
        boxShadow: selected
          ? `0 0 0 2px ${data.color || '#52b788'}40`
          : 'none',
        transition: 'box-shadow 0.15s',
        position: 'relative',
      }}
    >
      <Handle
        type="target"
        position={Position.Left}
        style={{
          background: data.color || '#52b788',
          border: 'none', width: 8, height: 8,
          transform: isDiamond ? 'rotate(-45deg)' : 'none'
        }}
      />
      <div style={{
        transform: isDiamond ? 'rotate(-45deg)' : 'none',
        padding: '4px 10px',
        fontFamily: "'Space Mono', monospace",
        fontSize: '11px',
        color: '#d8f3dc',
        fontWeight: 'bold',
        textAlign: 'center',
        maxWidth: '90%',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        letterSpacing: '0.05em',
        userSelect: 'none',
      }}>
        {data.label}
      </div>
      <Handle
        type="source"
        position={Position.Right}
        style={{
          background: data.color || '#52b788',
          border: 'none', width: 8, height: 8,
          transform: isDiamond ? 'rotate(-45deg)' : 'none'
        }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom"
        style={{
          background: data.color || '#52b788',
          border: 'none', width: 8, height: 8
        }}
      />
      <Handle
        type="target"
        position={Position.Top}
        id="top"
        style={{
          background: data.color || '#52b788',
          border: 'none', width: 8, height: 8
        }}
      />
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

function MindMapCanvas() {
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

  // Node editor
  const [selectedNode, setSelectedNode] = useState<Node | null>(null)
  const [showNodeEditor, setShowNodeEditor] = useState(false)
  const [editLabel, setEditLabel] = useState('')
  const [editContent, setEditContent] = useState('')
  const [editColor, setEditColor] = useState('#52b788')
  const [editShape, setEditShape] = useState('rect')

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
              width: editShape === 'circle' ? 80 : 160,
              height: editShape === 'circle' ? 80 : 48,
            },
            width: editShape === 'circle' ? 80 : 160,
            height: editShape === 'circle' ? 80 : 48,
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
            <button
              onClick={() => setShowNewMap(true)}
              className="hex-btn-primary flex items-center gap-2 text-xs px-4 py-2.5"
            >
              <Plus size={14} /> NEW MAP
            </button>
          </div>

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
      <div className="flex items-center justify-between px-4 py-2.5
        bg-[#0d2818] border-b border-[#1b4332] shrink-0 flex-wrap gap-2">

        {/* Left: back + title */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              saveAll()
              setShowMapList(true)
            }}
            className="flex items-center gap-1.5 font-mono text-xs
              text-[#95d5b2] hover:text-[#52b788] transition-colors"
          >
            ← MAPS
          </button>
          <span className="text-[#1b4332]">|</span>
          <span className="font-mono font-bold text-sm 
            text-[#d8f3dc] uppercase truncate max-w-[140px] md:max-w-xs">
            {activeMap.title}
          </span>
          {dirty && (
            <span className="font-mono text-[9px] text-[#e9c46a] 
              animate-pulse tracking-widest">
              UNSAVED
            </span>
          )}
          {saving && (
            <span className="font-mono text-[9px] text-[#52b788] 
              animate-pulse tracking-widest">
              SAVING...
            </span>
          )}
        </div>

        {/* Right: actions */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={addNode}
            className="flex items-center gap-1.5 hex-btn-primary 
              text-xs px-3 py-1.5"
          >
            <Plus size={13} /> NODE
          </button>
          <button
            onClick={saveAll}
            className="flex items-center gap-1.5 hex-btn-outline 
              text-xs px-3 py-1.5"
          >
            <Save size={13} /> SAVE
          </button>
          <button
            onClick={exportImage}
            className="flex items-center gap-1.5 hex-btn-outline 
              text-xs px-3 py-1.5"
          >
            <Download size={13} /> EXPORT
          </button>
          <button
            onClick={() => fitView({ padding: 0.2 })}
            className="p-1.5 border border-[#1b4332] text-[#95d5b2]
              hover:border-[#52b788] hover:text-[#52b788] transition-colors"
            title="Fit view"
          >
            <Maximize2 size={14} />
          </button>
        </div>
      </div>

      {/* Canvas + Side panels */}
      <div className="flex-1 flex overflow-hidden relative">

        {/* ReactFlow canvas */}
        <div className="flex-1" ref={flowRef}>
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
              }}
              nodeColor={(n) => n.data?.color || '#52b788'}
              maskColor="#0a1a0f99"
            />

            {/* Hint panel */}
            <Panel position="bottom-left">
              <div className="font-mono text-[9px] text-[#1b4332] 
                leading-relaxed bg-[#0d2818] border border-[#1b4332] 
                p-2 hidden md:block">
                <div>DRAG: move nodes</div>
                <div>DRAG handle→handle: connect</div>
                <div>CLICK node/edge: edit</div>
                <div>DELETE key: remove selected</div>
              </div>
            </Panel>
          </ReactFlow>
        </div>

        {/* Node Editor Panel */}
        {showNodeEditor && selectedNode && (
          <div className="w-full md:w-64 bg-[#0d2818] border-l 
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

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
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
                <div className="flex gap-2">
                  {[
                    { val: 'rect', icon: <Square size={14} /> },
                    { val: 'circle', icon: <Circle size={14} /> },
                    { val: 'diamond', icon: <Diamond size={14} /> },
                  ].map(s => (
                    <button
                      key={s.val}
                      onClick={() => setEditShape(s.val)}
                      className={`flex-1 flex items-center justify-center 
                        p-2 border transition-colors
                        ${editShape === s.val
                          ? 'border-[#52b788] text-[#52b788] bg-[#52b788]/10'
                          : 'border-[#1b4332] text-[#95d5b2] hover:border-[#52b788]'
                        }`}
                    >
                      {s.icon}
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
                      style={{ background: c }}
                      className={`h-7 transition-all
                        ${editColor === c
                          ? 'ring-2 ring-white ring-offset-1 ring-offset-[#0d2818] scale-110'
                          : 'opacity-70 hover:opacity-100'
                        }`}
                    />
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
  return (
    <UpgradeGate
      feature="Mind Map"
      requiredPlan="apex"
      enabled={canUse('mindmap' as any)}
    >
      <ReactFlowProvider>
        <MindMapCanvas />
      </ReactFlowProvider>
    </UpgradeGate>
  )
}
