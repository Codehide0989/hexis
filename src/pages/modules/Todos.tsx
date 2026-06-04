import React, { useState, useEffect } from 'react';
import { List, Plus, Check, X, Tag } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';

interface Todo {
  id: string;
  title: string;
  completed: boolean;
  priority: 'low' | 'medium' | 'high';
  created_at: string;
}

export default function TodosModule() {
  const { user } = useAuth();
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [inputValue, setInputValue] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');

  useEffect(() => {
    if (!user?.id) return;
    
    const fetchTodos = async () => {
      try {
        const { data, error } = await supabase
          .from('todos')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });
          
        if (error) throw error;
        setTodos(data || []);
      } catch (err) {
        console.error('Error fetching todos:', err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchTodos();
    
    const channel = supabase
      .channel(`todos-channel-${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'todos', filter: `user_id=eq.${user.id}` },
        () => fetchTodos()
      )
      .subscribe();
      
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  const handleAddTodo = async () => {
    if (!inputValue.trim() || !user?.id) return;
    
    const newTodo = {
      title: inputValue.trim(),
      completed: false,
      priority,
      user_id: user.id
    };
    
    try {
      const { error } = await supabase.from('todos').insert([newTodo]);
      if (error) throw error;
      setInputValue('');
    } catch (err: any) {
      toast.error('FAILED TO ADD TODO');
    }
  };

  const toggleTodo = async (id: string, currentStatus: boolean) => {
    try {
      setTodos(todos.map(t => t.id === id ? { ...t, completed: !currentStatus } : t));
      const { error } = await supabase.from('todos').update({ completed: !currentStatus }).eq('id', id);
      if (error) throw error;
    } catch (err) {
      toast.error('FAILED TO UPDATE TODO');
    }
  };

  const deleteTodo = async (id: string) => {
    try {
      setTodos(todos.filter(t => t.id !== id));
      const { error } = await supabase.from('todos').delete().eq('id', id);
      if (error) throw error;
    } catch (err) {
      toast.error('FAILED TO DELETE TODO');
    }
  };

  const clearCompleted = async () => {
    try {
      const completedIds = todos.filter(t => t.completed).map(t => t.id);
      if (completedIds.length === 0) return;
      
      setTodos(todos.filter(t => !t.completed));
      const { error } = await supabase.from('todos').delete().in('id', completedIds);
      if (error) throw error;
    } catch (err) {
      toast.error('FAILED TO CLEAR COMPLETED');
    }
  };

  const filteredTodos = todos.filter(t => {
    if (filter === 'active') return !t.completed;
    if (filter === 'completed') return t.completed;
    return true;
  });

  const remainingCount = todos.filter(t => !t.completed).length;

  const priorityColors = {
    low: 'bg-[#52b788]/20 text-[#52b788] border border-[#52b788]',
    medium: 'bg-[#e9c46a]/20 text-[#e9c46a] border border-[#e9c46a]',
    high: 'bg-[#e63946]/20 text-[#e63946] border border-[#e63946]',
  };

  return (
    <div className="h-full flex flex-col bg-[#0a1a0f] p-4 md:p-6 text-[#d8f3dc] font-mono">
      <div className="flex items-center justify-between mb-6 border-b border-[#1b4332] pb-4 shrink-0">
        <div className="flex items-center gap-3">
          <List className="w-6 h-6 text-[#52b788]" />
          <h1 className="text-xl tracking-widest font-bold text-[#52b788]">TODOS</h1>
        </div>
        <div className="text-xs text-[#95d5b2] tracking-widest border border-[#1b4332] px-3 py-1 bg-[#123620]">
          {remainingCount} ITEMS REMAINING
        </div>
      </div>

      <div className="flex gap-2 mb-6">
        <input 
          className="hex-input flex-1"
          placeholder="ADD NEW PROTOCOL..."
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAddTodo()}
        />
        
        <select 
          className="hex-input w-24 text-xs"
          value={priority}
          onChange={(e) => setPriority(e.target.value as any)}
        >
          <option value="low">LOW</option>
          <option value="medium">MED</option>
          <option value="high">HIGH</option>
        </select>
        
        <button 
          className="hex-btn-primary px-4"
          onClick={handleAddTodo}
        >
          <Plus size={16} />
        </button>
      </div>

      <div className="flex gap-4 mb-4 border-b border-[#1b4332] pb-4 shrink-0">
        {['all', 'active', 'completed'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f as any)}
            className={`text-xs tracking-widest uppercase transition-colors pb-1 ${
              filter === f 
                ? 'text-[#52b788] border-b-2 border-[#52b788]' 
                : 'text-[#2d6a4f] hover:text-[#95d5b2]'
            }`}
          >
            {f}
          </button>
        ))}
        <div className="flex-1" />
        {todos.some(t => t.completed) && (
          <button
            onClick={clearCompleted}
            className="text-xs text-[#e63946] hover:text-[#ff4d4d] uppercase tracking-widest"
          >
            CLEAR COMPLETED
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-2">
        {loading ? (
          <div className="text-center text-[#52b788] mt-10 text-sm tracking-widest uppercase animate-pulse">
            LOADING PROTOCOLS...
          </div>
        ) : filteredTodos.length === 0 ? (
          <div className="text-center text-[#2d6a4f] mt-10 text-sm tracking-widest uppercase border border-dashed border-[#1b4332] p-4 md:p-8">
            NO PROTOCOLS FOUND
          </div>
        ) : (
          filteredTodos.map(todo => (
            <div 
              key={todo.id} 
              className={`flex items-center gap-3 p-3 border border-[#1b4332] mb-2 hover:border-[#52b788] transition-colors ${
                todo.completed ? 'opacity-60' : 'opacity-100'
              }`}
            >
              <div
                onClick={() => toggleTodo(todo.id, todo.completed)}
                className={`w-5 h-5 border flex-shrink-0 flex items-center justify-center cursor-pointer transition-colors ${
                  todo.completed ? 'bg-[#52b788] border-[#52b788]' : 'bg-transparent border-[#52b788]'
                }`}
              >
                {todo.completed && <Check size={12} className="text-[#0a1a0f]" />}
              </div>
              
              <span className={`flex-1 font-mono text-sm ${
                todo.completed ? 'line-through text-[#95d5b2]' : 'text-[#d8f3dc]'
              }`}>
                {todo.title}
              </span>
              
              <span className={`font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 flex-shrink-0 ${priorityColors[todo.priority]}`}>
                {todo.priority}
              </span>
              
              <button
                onClick={() => deleteTodo(todo.id)}
                className="text-[#1b4332] hover:text-[#e63946] transition-colors flex-shrink-0 ml-2"
              >
                <X size={14} />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
