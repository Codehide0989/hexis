import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import toast from 'react-hot-toast';
import { Plus, X, Calendar, MoreVertical } from 'lucide-react';
import { 
  DndContext, 
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  useDroppable
} from '@dnd-kit/core';
import { 
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { motion, AnimatePresence } from 'framer-motion';

interface KanbanCard {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: 'low' | 'medium' | 'high';
  due_date: string | null;
}

const PRIORITY_COLORS = {
  low: 'bg-[#95d5b2]',
  medium: 'bg-[#e9c46a]',
  high: 'bg-[#e63946]',
};

function SortableCard({ card, onClick }: { card: KanbanCard, onClick: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: card.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      {...attributes} 
      {...listeners}
      onClick={onClick}
      className="p-4 bg-[#0a1a0f] border border-[#1b4332] cursor-grab active:cursor-grabbing hover:border-[#52b788] transition-colors relative group"
    >
      <div className="font-sans text-sm text-[#d8f3dc] mb-3 pr-4 break-words">
        {card.title}
      </div>
      <div className="flex justify-between items-center mt-auto">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${PRIORITY_COLORS[card.priority]} ${card.status === 'IN_PROGRESS' && card.priority === 'high' ? 'animate-pulse' : ''}`}></span>
          {card.due_date && (
            <span className="font-mono text-[9px] text-[#2d6a4f] flex items-center gap-1">
              <Calendar size={10} />
              {new Date(card.due_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
            </span>
          )}
        </div>
        <span className="font-mono text-[9px] text-[#2d6a4f]">ID-{card.id.substring(0,4)}</span>
      </div>
    </div>
  );
}

function DroppableColumn({ id, title, count, children, onAdd }: any) {
  const { isOver, setNodeRef } = useDroppable({ id });
  return (
    <div className={`w-[320px] shrink-0 flex flex-col bg-[#0d2818] border ${isOver ? 'border-[#52b788]' : 'border-[#1b4332]'} h-full max-h-full transition-colors`}>
      <div className="p-4 border-b border-[#1b4332] flex justify-between items-center">
        <h3 className="font-mono text-xs tracking-widest text-[#52b788] uppercase flex items-center gap-2">
          {title.replace('_', ' ')}
          <span className="text-[#2d6a4f] text-[10px]">{count}</span>
        </h3>
      </div>
      <div className="flex-1 overflow-y-auto p-3 custom-scrollbar flex flex-col gap-3 min-h-[100px]" ref={setNodeRef}>
        {children}
      </div>
      <div className="p-3 border-t border-[#1b4332]">
        <button onClick={onAdd} className="w-full py-2 border border-dashed border-[#1b4332] text-[#2d6a4f] hover:text-[#52b788] hover:border-[#52b788] transition-colors font-mono text-xs flex justify-center items-center gap-2">
          <Plus size={14} /> ADD CARD
        </button>
      </div>
    </div>
  );
}

export default function Kanban() {
  const { user } = useAuth();
  const [cards, setCards] = useState<KanbanCard[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Persist columns to local storage to allow custom columns
  const [columns, setColumns] = useState<string[]>(() => {
    const saved = localStorage.getItem('kanban_columns');
    return saved ? JSON.parse(saved) : ['BACKLOG', 'IN_PROGRESS', 'DONE'];
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<KanbanCard | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);

  const [isAddingColumn, setIsAddingColumn] = useState(false);
  const [newColumnName, setNewColumnName] = useState('');

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const [boardId, setBoardId] = useState<string | null>(null)

  const ensureBoard = async (userId: string) => {
    // Check if user has a board
    const { data: boards } = await supabase
      .from('kanban_boards')
      .select('id, title')
      .eq('user_id', userId)
      .limit(1)
    
    if (boards && boards.length > 0) {
      return boards[0].id
    }
    
    // Create default board
    const { data: newBoard, error } = await supabase
      .from('kanban_boards')
      .insert({
        user_id: userId,
        title: 'MY BOARD'
      })
      .select()
      .single()
    
    if (error) throw error
    
    // Create default columns for the board
    const defaultColumns = [
      { title: 'BACKLOG', position: 0 },
      { title: 'IN_PROGRESS', position: 1 },
      { title: 'DONE', position: 2 },
    ]
    
    await supabase.from('kanban_columns').insert(
      defaultColumns.map(col => ({
        ...col,
        board_id: newBoard.id,
      }))
    )
    
    return newBoard.id
  }

  useEffect(() => {
    if (!user?.id) return
    
    const init = async () => {
      try {
        const boardId = await ensureBoard(user.id)
        setBoardId(boardId)
        await fetchColumns(boardId)
        await fetchCards(boardId)
      } catch (err: any) {
        toast.error('KANBAN INIT FAILED: ' + err.message)
      }
    }
    
    init()
    
    const channel = supabase
      .channel('module-kanban_cards-' + user.id)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'kanban_cards'
      }, () => {
        if (boardId) fetchCards(boardId);
      })
      .subscribe();
      
    return () => {
      channel.unsubscribe();
    }
  }, [user?.id, boardId]);

  useEffect(() => {
    localStorage.setItem('kanban_columns', JSON.stringify(columns));
  }, [columns]);

  const fetchCards = async (bId: string) => {
    const { data, error } = await supabase
      .from('kanban_cards')
      .select('*')
      .eq('user_id', user!.id)
      .order('position')
    
    if (error) throw error
    setCards(data || [])
    setLoading(false)
  }

  const fetchColumns = async (bId: string) => {
    const { data, error } = await supabase
      .from('kanban_columns')
      .select('*')
      .eq('board_id', bId)
      .order('position')
    
    if (error) throw error
    // Use DB columns as dynamic column list
    if (data && data.length > 0) {
      setColumns(data.map(c => c.title))
    }
  }

  const handleDragStart = (event: any) => {
    setActiveId(event.active.id);
  };

  const handleDragEnd = async (event: any) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;

    const activeCard = cards.find(c => c.id === active.id);
    const overId = over.id as string;
    
    if (columns.includes(overId)) {
      if (activeCard && activeCard.status !== overId) {
        updateCardStatus(active.id, overId);
      }
      return;
    }

    const overCard = cards.find(c => c.id === overId);
    if (activeCard && overCard && activeCard.status !== overCard.status) {
       updateCardStatus(active.id, overCard.status);
    }
  };

  const updateCardStatus = async (id: string, status: string) => {
    setCards(cards.map(c => c.id === id ? { ...c, status } : c));
    try {
      const { error } = await supabase.from('kanban_cards').update({ status }).eq('id', id);
      if (error) throw error;
    } catch (err) {
      toast.error('Failed to update status');
      if (boardId) fetchCards(boardId);
    }
  };

  const saveCard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCard?.title) return toast.error('Title is required');
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      if (editingCard.id === 'new') {
        const { data, error } = await supabase
          .from('kanban_cards')
          .insert([{
            user_id: user.id,
            title: editingCard.title,
            description: editingCard.description,
            priority: editingCard.priority,
            due_date: editingCard.due_date ? new Date(editingCard.due_date).toISOString() : null,
            status: editingCard.status
          }])
          .select().single();
        if (error) throw error;
        setCards([...cards, data]);
        toast.success('Card added');
      } else {
        const { error } = await supabase
          .from('kanban_cards')
          .update({
            title: editingCard.title,
            description: editingCard.description,
            priority: editingCard.priority,
            due_date: editingCard.due_date ? new Date(editingCard.due_date).toISOString() : null,
          })
          .eq('id', editingCard.id);
        if (error) throw error;
        setCards(cards.map(c => c.id === editingCard.id ? editingCard : c));
        toast.success('Card updated');
      }
      setIsModalOpen(false);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const deleteCard = async () => {
    if (!editingCard || editingCard.id === 'new') return;
    if (!window.confirm('Delete this card?')) return;
    try {
      setCards(cards.filter(c => c.id !== editingCard.id));
      const { error } = await supabase.from('kanban_cards').delete().eq('id', editingCard.id);
      if (error) throw error;
      setIsModalOpen(false);
      toast.success('Card deleted');
    } catch (err: any) {
      toast.error('Delete failed');
      if (boardId) fetchCards(boardId);
    }
  };

  const openNewCard = (status: string) => {
    setEditingCard({ id: 'new', title: '', description: '', status, priority: 'medium', due_date: '' });
    setIsModalOpen(true);
  };

  const saveNewColumn = () => {
    if (newColumnName.trim()) {
      const formatted = newColumnName.trim().toUpperCase().replace(/\s+/g, '_');
      if (!columns.includes(formatted)) {
        setColumns([...columns, formatted]);
        setIsAddingColumn(false);
        setNewColumnName('');
      } else {
        toast.error("Column already exists");
      }
    }
  };

  const activeDragCard = activeId ? cards.find(c => c.id === activeId) : null;

  return (
    <div className="h-full flex flex-col">
      <div className="mb-6 flex justify-between items-center">
        <div className="font-mono text-sm text-[#52b788] uppercase tracking-widest flex items-center gap-2">
          PROJECT_BOARD
        </div>
      </div>

      <div className="flex-1 overflow-x-auto custom-scrollbar pb-4 flex gap-4 md:p-6">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          {columns.map(col => {
            const colCards = cards.filter(c => c.status === col);
            return (
              <DroppableColumn key={col} id={col} title={col} count={colCards.length} onAdd={() => openNewCard(col)}>
                <SortableContext items={colCards.map(c => c.id)} strategy={verticalListSortingStrategy}>
                  {colCards.map(card => (
                    <SortableCard key={card.id} card={card} onClick={() => { setEditingCard(card); setIsModalOpen(true); }} />
                  ))}
                </SortableContext>
              </DroppableColumn>
            );
          })}
          
          {isAddingColumn ? (
            <div className="w-[320px] shrink-0 bg-[#0d2818] border border-[#52b788] h-[132px] p-4 flex flex-col gap-3 shadow-[0_0_15px_rgba(82,183,136,0.1)] transition-all">
              <input 
                autoFocus
                type="text" 
                placeholder="COLUMN NAME"
                value={newColumnName}
                onChange={e => setNewColumnName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && saveNewColumn()}
                className="bg-[#0a1a0f] border border-[#1b4332] text-[#d8f3dc] font-mono text-xs p-2 focus:outline-none focus:border-[#52b788] w-full"
              />
              <div className="flex gap-2 mt-auto">
                <button onClick={saveNewColumn} className="flex-1 bg-[#52b788] text-[#0a1a0f] font-mono text-[10px] py-1.5 uppercase font-bold tracking-widest hover:bg-[#74c69d] transition-colors">SAVE</button>
                <button onClick={() => {setIsAddingColumn(false); setNewColumnName('');}} className="px-3 border border-[#1b4332] text-[#e63946] hover:bg-[#1a0000] transition-colors"><X size={12}/></button>
              </div>
            </div>
          ) : (
            <button onClick={() => setIsAddingColumn(true)} className="w-[320px] shrink-0 border border-dashed border-[#1b4332] flex items-center justify-center gap-2 text-[#2d6a4f] hover:text-[#52b788] hover:border-[#52b788] transition-colors h-[100px] font-mono text-xs uppercase tracking-widest bg-[#0a1a0f]/50 mt-1">
              <Plus size={16} /> ADD COLUMN
            </button>
          )}

          <DragOverlay>
            {activeDragCard ? (
              <div className="p-4 bg-[#0a1a0f] border border-[#52b788] shadow-[0_0_15px_rgba(82,183,136,0.2)] opacity-90 w-[294px]">
                <div className="font-sans text-sm text-[#d8f3dc] mb-3">{activeDragCard.title}</div>
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${PRIORITY_COLORS[activeDragCard.priority]}`}></span>
                </div>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>

      <AnimatePresence>
        {isModalOpen && editingCard && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsModalOpen(false)} className="absolute inset-0 bg-[#0a1a0f]/80 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-[#0d2818] border border-[#1b4332] w-full max-w-md relative z-10 flex flex-col max-h-[90vh]">
              <div className="p-4 border-b border-[#1b4332] flex justify-between items-center bg-[#0a1a0f]">
                <div className="font-mono text-sm text-[#52b788] uppercase tracking-widest">
                  {editingCard.id === 'new' ? 'CREATE_CARD' : 'EDIT_CARD'}
                </div>
                <button onClick={() => setIsModalOpen(false)} className="text-[#95d5b2] hover:text-[#52b788]"><X size={18} /></button>
              </div>
              <form onSubmit={saveCard} className="p-4 md:p-6 overflow-y-auto custom-scrollbar space-y-4">
                <div>
                  <label className="block font-mono text-[10px] text-[#95d5b2] mb-1 uppercase tracking-widest">Title</label>
                  <input type="text" value={editingCard.title} onChange={e => setEditingCard({...editingCard, title: e.target.value})} className="w-full bg-[#0a1a0f] border border-[#1b4332] text-[#d8f3dc] font-sans text-sm p-2 focus:outline-none focus:border-[#52b788] rounded-none" required />
                </div>
                <div>
                  <label className="block font-mono text-[10px] text-[#95d5b2] mb-1 uppercase tracking-widest">Description</label>
                  <textarea value={editingCard.description || ''} onChange={e => setEditingCard({...editingCard, description: e.target.value})} className="w-full bg-[#0a1a0f] border border-[#1b4332] text-[#d8f3dc] font-sans text-sm p-2 focus:outline-none focus:border-[#52b788] rounded-none min-h-[80px]" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-mono text-[10px] text-[#95d5b2] mb-1 uppercase tracking-widest">Priority</label>
                    <select value={editingCard.priority} onChange={e => setEditingCard({...editingCard, priority: e.target.value as any})} className="w-full bg-[#0a1a0f] border border-[#1b4332] text-[#d8f3dc] font-sans text-sm p-2 focus:outline-none focus:border-[#52b788] rounded-none uppercase appearance-none">
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-mono text-[10px] text-[#95d5b2] mb-1 uppercase tracking-widest">Due Date</label>
                    <input type="date" value={editingCard.due_date ? editingCard.due_date.split('T')[0] : ''} onChange={e => setEditingCard({...editingCard, due_date: e.target.value})} className="w-full bg-[#0a1a0f] border border-[#1b4332] text-[#95d5b2] font-mono text-xs p-2 focus:outline-none focus:border-[#52b788] rounded-none [color-scheme:dark]" />
                  </div>
                </div>
                <div className="flex gap-3 pt-4 border-t border-[#1b4332] mt-6">
                  <button type="submit" className="flex-1 bg-[#52b788] hover:bg-[#74c69d] text-[#0a1a0f] py-2 font-mono text-xs font-bold uppercase tracking-widest transition-colors">
                    SAVE
                  </button>
                  {editingCard.id !== 'new' && (
                    <button type="button" onClick={deleteCard} className="bg-[#1a0000] border border-[#e63946] text-[#e63946] hover:bg-[#e63946] hover:text-[#1a0000] px-4 py-2 font-mono text-xs font-bold uppercase tracking-widest transition-colors">
                      DELETE
                    </button>
                  )}
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
