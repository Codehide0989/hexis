import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import toast from 'react-hot-toast';
import { Plus, Search, Calendar, X, Trash2, Clock, CheckCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
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

type Priority = 'low' | 'medium' | 'high';
type Status = 'todo' | 'in_progress' | 'done';

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: Status;
  priority: Priority;
  due_date: string | null;
  created_at: string;
}

const PRIORITY_COLORS = {
  low: 'bg-[#95d5b2]',
  medium: 'bg-[#e9c46a]',
  high: 'bg-[#e63946]',
};

function SortableCard({ task, onClick, onDelete }: { task: Task, onClick: () => void, onDelete: (e: React.MouseEvent, id: string) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      {...attributes} 
      {...listeners}
      onClick={onClick}
      className="p-4 bg-[#0a1a0f] border border-[#1b4332] cursor-grab active:cursor-grabbing hover:border-[#52b788] transition-colors relative group min-h-[120px] flex flex-col"
    >
      <div className="flex justify-between items-start mb-2 gap-2">
        <div className={`font-sans text-sm font-medium leading-snug break-words ${task.status === 'done' ? 'text-[#2d6a4f] line-through' : 'text-[#d8f3dc]'}`}>
          {task.title}
        </div>
        <button 
          onClick={(e) => onDelete(e, task.id)}
          className="text-[#e63946] hover:bg-[#2d0a0a] p-1 transition-colors opacity-0 group-hover:opacity-100 border border-transparent hover:border-[#e63946] shrink-0"
        >
          <Trash2 size={12} />
        </button>
      </div>

      {task.description && (
        <div className="font-mono text-[10px] text-[#2d6a4f] line-clamp-2 mb-3">
          {task.description}
        </div>
      )}

      <div className="flex justify-between items-center mt-auto border-t border-[#1b4332] pt-3">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${PRIORITY_COLORS[task.priority]} ${task.status === 'in_progress' && task.priority === 'high' ? 'animate-pulse' : ''}`}></span>
          {task.due_date && (
            <span className="font-mono text-[9px] text-[#2d6a4f] flex items-center gap-1">
              <Calendar size={10} />
              {new Date(task.due_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
            </span>
          )}
        </div>
        <span className="font-mono text-[9px] text-[#2d6a4f]">ID-{task.id.substring(0,4)}</span>
      </div>
    </div>
  );
}

function DroppableColumn({ id, title, count, children }: any) {
  const { isOver, setNodeRef } = useDroppable({ id });
  return (
    <div className={`w-full md:w-[320px] shrink-0 flex flex-col bg-[#0d2818] border ${isOver ? 'border-[#52b788]' : 'border-[#1b4332]'} h-full max-h-full transition-colors`}>
      <div className="p-4 border-b border-[#1b4332] flex justify-between items-center bg-[#0a1a0f]">
        <h3 className="font-mono text-xs tracking-widest text-[#52b788] uppercase flex items-center gap-2">
          {title.replace('_', ' ')}
          <span className="text-[#2d6a4f] text-[10px]">{count}</span>
        </h3>
      </div>
      <div className="flex-1 overflow-y-auto p-3 custom-scrollbar flex flex-col gap-3 min-h-[150px]" ref={setNodeRef}>
        {children}
      </div>
    </div>
  );
}

export default function Tasks() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [newTask, setNewTask] = useState({ title: '', description: '', priority: 'medium' as Priority, due_date: '' });
  const [isSaving, setIsSaving] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);

  const columns: Status[] = ['todo', 'in_progress', 'done'];

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  useEffect(() => {
    if (!user?.id) return;
    
    fetchTasks();
    
    const channel = supabase
      .channel('module-tasks-' + user.id)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'tasks',
        filter: `user_id=eq.${user.id}`,
      }, () => {
        fetchTasks();
      })
      .subscribe();
      
    return () => {
      channel.unsubscribe();
    }
  }, [user?.id]);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTasks(data || []);
    } catch (error: any) {
      toast.error('Failed to load tasks: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveTask = async () => {
    if (!newTask.title.trim()) {
      toast.error('Title is required');
      return;
    }
    
    try {
      setIsSaving(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('tasks')
        .insert([{
          user_id: user.id,
          title: newTask.title,
          description: newTask.description,
          priority: newTask.priority,
          due_date: newTask.due_date ? new Date(newTask.due_date).toISOString() : null,
          status: 'todo'
        }])
        .select()
        .single();

      if (error) throw error;
      
      setTasks([data, ...tasks]);
      toast.success('Task created successfully');
      setIsPanelOpen(false);
      setNewTask({ title: '', description: '', priority: 'medium', due_date: '' });
    } catch (error: any) {
      toast.error('Failed to create task: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const updateTaskStatus = async (id: string, status: Status) => {
    setTasks(tasks.map(t => t.id === id ? { ...t, status } : t));
    try {
      const { error } = await supabase.from('tasks').update({ status }).eq('id', id);
      if (error) throw error;
    } catch (err) {
      toast.error('Failed to update status');
      fetchTasks();
    }
  };

  const deleteTask = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this task?')) return;
    
    try {
      setTasks(tasks.filter(t => t.id !== id));
      const { error } = await supabase.from('tasks').delete().eq('id', id);
      if (error) throw error;
      toast.success('Task deleted');
    } catch (error: any) {
      fetchTasks();
      toast.error('Failed to delete task');
    }
  };

  const handleDragStart = (event: any) => {
    setActiveId(event.active.id);
  };

  const handleDragEnd = async (event: any) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;

    const activeTask = tasks.find(t => t.id === active.id);
    const overId = over.id as string;
    
    if (columns.includes(overId as Status)) {
      if (activeTask && activeTask.status !== overId) {
        updateTaskStatus(active.id, overId as Status);
      }
      return;
    }

    const overTask = tasks.find(t => t.id === overId);
    if (activeTask && overTask && activeTask.status !== overTask.status) {
       updateTaskStatus(active.id, overTask.status);
    }
  };

  const filteredTasks = tasks.filter(task => {
    if (search && !task.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const activeDragTask = activeId ? tasks.find(t => t.id === activeId) : null;

  return (
    <div className="flex flex-col h-full relative">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div className="flex items-center gap-2">
          <div className="relative">
             <Search className="w-4 h-4 text-[#2d6a4f] absolute left-3 top-1/2 -translate-y-1/2" />
             <input 
               type="text" 
               placeholder="SEARCH TASKS..." 
               value={search}
               onChange={(e) => setSearch(e.target.value)}
               className="bg-[#0d2818] border border-[#1b4332] text-[#d8f3dc] font-mono text-xs py-2 pl-10 pr-4 focus:outline-none focus:border-[#52b788] transition-colors w-64 rounded-none" 
             />
          </div>
        </div>
        <button 
          onClick={() => setIsPanelOpen(true)}
          className="bg-[#52b788] hover:bg-[#74c69d] text-[#0a1a0f] px-4 py-2 font-mono text-xs font-bold uppercase tracking-widest flex items-center gap-2 transition-colors"
        >
          <Plus size={16} /> NEW TASK
        </button>
      </div>

      <div className="flex-1 overflow-x-auto custom-scrollbar pb-4 flex flex-col md:flex-row gap-4 md:p-6">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          {columns.map(col => {
            const colTasks = filteredTasks.filter(t => t.status === col);
            return (
              <DroppableColumn key={col} id={col} title={col} count={colTasks.length}>
                <SortableContext items={colTasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
                  {colTasks.map(task => (
                    <SortableCard 
                      key={task.id} 
                      task={task} 
                      onClick={() => {}} 
                      onDelete={deleteTask}
                    />
                  ))}
                </SortableContext>
              </DroppableColumn>
            );
          })}
          
          <DragOverlay>
            {activeDragTask ? (
              <div className="p-4 bg-[#0a1a0f] border border-[#52b788] shadow-[0_0_15px_rgba(82,183,136,0.2)] opacity-90 w-[320px] md:w-[294px]">
                <div className="font-sans text-sm text-[#d8f3dc] mb-3 break-words">{activeDragTask.title}</div>
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${PRIORITY_COLORS[activeDragTask.priority]}`}></span>
                </div>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>

      <AnimatePresence>
        {isPanelOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsPanelOpen(false)}
              className="fixed inset-0 bg-[#0a1a0f]/80 backdrop-blur-sm z-40"
            />
            <motion.div 
              initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 bottom-0 w-full md:w-[400px] bg-[#0d2818] border-l border-[#1b4332] z-50 flex flex-col"
            >
              <div className="flex justify-between items-center p-4 md:p-6 border-b border-[#1b4332]">
                <div className="font-mono text-sm text-[#52b788] uppercase tracking-widest flex items-center gap-2">
                  <Plus size={16} /> NEW_TASK_ENTRY
                </div>
                <button 
                  type="button" 
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsPanelOpen(false);
                  }} 
                  className="text-[#95d5b2] hover:text-[#52b788] p-2 hover:bg-[#1b4332] rounded-sm transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
              
              <div className="p-4 md:p-6 flex-1 overflow-y-auto space-y-5">
                <div>
                  <label className="block font-mono text-[10px] text-[#95d5b2] mb-1.5 uppercase tracking-widest">Task Title *</label>
                  <input 
                    type="text" 
                    value={newTask.title}
                    onChange={e => setNewTask({...newTask, title: e.target.value})}
                    className="w-full bg-[#0a1a0f] border border-[#1b4332] text-[#d8f3dc] font-sans text-sm p-3 focus:outline-none focus:border-[#52b788] rounded-none"
                    placeholder="Enter task title"
                  />
                </div>
                <div>
                  <label className="block font-mono text-[10px] text-[#95d5b2] mb-1.5 uppercase tracking-widest">Description</label>
                  <textarea 
                    value={newTask.description}
                    onChange={e => setNewTask({...newTask, description: e.target.value})}
                    className="w-full bg-[#0a1a0f] border border-[#1b4332] text-[#d8f3dc] font-sans text-sm p-3 focus:outline-none focus:border-[#52b788] rounded-none min-h-[100px] custom-scrollbar"
                    placeholder="Optional details"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-mono text-[10px] text-[#95d5b2] mb-1.5 uppercase tracking-widest">Priority</label>
                    <select 
                      value={newTask.priority}
                      onChange={e => setNewTask({...newTask, priority: e.target.value as Priority})}
                      className="w-full bg-[#0a1a0f] border border-[#1b4332] text-[#d8f3dc] font-sans text-sm p-3 focus:outline-none focus:border-[#52b788] rounded-none uppercase appearance-none"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-mono text-[10px] text-[#95d5b2] mb-1.5 uppercase tracking-widest">Due Date</label>
                    <input 
                      type="date" 
                      value={newTask.due_date}
                      onChange={e => setNewTask({...newTask, due_date: e.target.value})}
                      className="w-full bg-[#0a1a0f] border border-[#1b4332] text-[#95d5b2] font-mono text-xs p-3 focus:outline-none focus:border-[#52b788] rounded-none [color-scheme:dark]"
                    />
                  </div>
                </div>
              </div>
              
              <div className="p-4 md:p-6 border-t border-[#1b4332] bg-[#0a1a0f]">
                <button 
                  onClick={handleSaveTask}
                  disabled={isSaving}
                  className="w-full bg-[#52b788] hover:bg-[#74c69d] disabled:opacity-50 text-[#0a1a0f] py-3 font-mono text-xs font-bold uppercase tracking-widest transition-colors"
                >
                  {isSaving ? 'SAVING...' : 'SAVE TASK'}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
