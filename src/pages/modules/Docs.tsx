import React, { useState, useEffect, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { 
  FileText, Folder, Plus, Search, Trash2, Edit2, 
  Bold, Italic, Heading1, Heading2, List, Code, 
  UserPlus, Users, MoreVertical, X, Share2, Eye
} from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../../lib/auth';
import { useAuth } from '../../hooks/useAuth';
import { usePlan } from '../../context/PlanContext';
import { UpgradeGate } from '../../components/ui/UpgradeGate';

export default function Docs() {
  const { user } = useAuth();
  const { canUse } = usePlan();
  const [folders, setFolders] = useState<any[]>([]);
  const [docs, setDocs] = useState<any[]>([]);
  const [sharedDocs, setSharedDocs] = useState<any[]>([]);
  const [activeDoc, setActiveDoc] = useState<any>(null);
  
  const [search, setSearch] = useState('');
  const [saveStatus, setSaveStatus] = useState<'SAVED' | 'SAVING...'>('SAVED');
  
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [folderMenuOpen, setFolderMenuOpen] = useState<string | null>(null);
  
  const [saveTimer, setSaveTimer] = useState<any>(null);
  
  const [viewers, setViewers] = useState(1);
  const channelRef = useRef<any>(null);
  
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareInput, setShareInput] = useState('');
  const [sharePerm, setSharePerm] = useState('editor');
  const [collaborators, setCollaborators] = useState<any[]>([]);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    
    loadData();
    
    const channelDocs = supabase
      .channel('module-docs-' + user.id)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'docs',
        filter: `user_id=eq.${user.id}`,
      }, () => {
        loadData();
      })
      .subscribe();
      
    return () => {
      channelDocs.unsubscribe();
    }
  }, [user?.id]);

  useEffect(() => {
    const handleGlobalClick = () => setFolderMenuOpen(null);
    window.addEventListener('click', handleGlobalClick);
    return () => window.removeEventListener('click', handleGlobalClick);
  }, []);

  const loadData = async () => {
    if (!user) return;
    
    const { data: fData } = await supabase
      .from('doc_folders')
      .select('*')
      .eq('user_id', user.id)
      .order('name');
    if (fData) setFolders(fData);

    const { data: dData } = await supabase
      .from('docs')
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false });
    if (dData) setDocs(dData);

    const { data: sData } = await supabase
      .from('doc_collaborators')
      .select('permission, docs(*)')
      .eq('user_id', user.id);
      
    if (sData) {
      const shared = sData.map((item: any) => ({
        ...item.docs,
        shared_permission: item.permission,
        is_shared: true
      })).filter((d: any) => d.id);
      setSharedDocs(shared);
    }
  };

  const createDoc = async (folderId: string | null = null) => {
    if (!user) return;
    const newDoc = {
      user_id: user.id,
      title: 'Untitled_' + Date.now(),
      content: '',
      folder: folderId || 'root'
    };
    const { data } = await supabase.from('docs').insert(newDoc).select().single();
    if (data) {
      setDocs(prev => [data, ...prev]);
      setActiveDoc(data);
    }
  };

  const createFolder = async () => {
    if (!user) return;
    const name = window.prompt("Enter folder name:");
    if (name && name.trim()) {
      const { data } = await supabase.from('doc_folders').insert({ user_id: user.id, name, parent_id: null }).select().single();
      if (data) {
        setFolders(prev => [...prev, data]);
      }
    }
  };

  const createSubfolder = async (parentId: string) => {
    if (!user) return;
    const name = window.prompt("Enter subfolder name:");
    if (name && name.trim()) {
      const { data } = await supabase.from('doc_folders').insert({ user_id: user.id, name, parent_id: parentId }).select().single();
      if (data) {
        setFolders(prev => [...prev, data]);
        setExpandedFolders(prev => ({ ...prev, [parentId]: true }));
      }
    }
  };

  const renameFolder = async (id: string, newName: string) => {
    if (newName.trim()) {
      await supabase.from('doc_folders').update({ name: newName.trim() }).eq('id', id);
      setFolders(prev => prev.map(f => f.id === id ? { ...f, name: newName.trim() } : f));
    }
    setEditingFolderId(null);
  };

  const confirmDeleteFolder = (folderId: string) => {
    const action = window.prompt("Type 'MOVE' to move docs to root, or 'DELETE' to delete all docs in this folder:");
    if (action === 'MOVE') {
      deleteFolder(folderId, 'move');
    } else if (action === 'DELETE') {
      deleteFolder(folderId, 'delete');
    }
  };

  const deleteFolder = async (folderId: string, action: 'move' | 'delete') => {
    if (action === 'move') {
      await supabase.from('docs').update({ folder: 'root' }).eq('folder', folderId);
    } else {
      await supabase.from('docs').delete().eq('folder', folderId);
    }
    
    setDocs(prev => prev.filter(d => action === 'move' ? true : d.folder !== folderId).map(d => (action === 'move' && d.folder === folderId) ? { ...d, folder: 'root' } : d));
    
    await supabase.from('doc_folders').delete().eq('id', folderId);
    setFolders(prev => prev.filter(f => f.id !== folderId));
    toast.success(`Folder ${action === 'move' ? 'removed & docs moved' : 'and docs deleted'}`);
  };

  const deleteDoc = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await supabase.from('docs').delete().eq('id', id);
    setDocs(prev => prev.filter(d => d.id !== id));
    if (activeDoc?.id === id) setActiveDoc(null);
  };

  const toggleFolder = (id: string) => {
    setExpandedFolders(prev => ({ ...prev, [id]: prev[id] === undefined ? false : !prev[id] }));
  };

  const hasEditPermission = activeDoc?.is_shared ? activeDoc.shared_permission === 'editor' : true;

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder: 'Start typing...' })
    ],
    content: activeDoc?.content || '',
    editable: hasEditPermission,
    onUpdate: ({ editor }) => {
      if (activeDoc && hasEditPermission) {
        const content = editor.getHTML();
        handleContentUpdate(content);
      }
    },
  });

  useEffect(() => {
    if (editor) {
      editor.setEditable(hasEditPermission);
    }
  }, [hasEditPermission, editor]);

  useEffect(() => {
    if (!activeDoc || !editor) {
      if (channelRef.current) {
        channelRef.current.unsubscribe();
        channelRef.current = null;
      }
      return;
    }

    if (editor.getHTML() !== activeDoc.content) {
      const { from, to } = editor.state.selection;
      editor.commands.setContent(activeDoc.content || '', { emitUpdate: false });
      try { editor.commands.setTextSelection({ from, to }); } catch (e) {}
    }

    const channel = supabase.channel(`doc-realtime-${activeDoc.id}`, {
      config: { presence: { key: user?.id } },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const count = Object.keys(state).length;
        setViewers(count > 0 ? count : 1);
      })
      .on('broadcast', { event: 'doc-update' }, (payload) => {
        if (payload.payload.user_id !== user?.id) {
          setActiveDoc((prev: any) => ({ ...prev, content: payload.payload.content }));
          
          const currentContent = editor.getHTML();
          if (currentContent !== payload.payload.content) {
            const { from, to } = editor.state.selection;
            editor.commands.setContent(payload.payload.content, { emitUpdate: false });
            try { editor.commands.setTextSelection({ from, to }); } catch (e) {}
          }
        }
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ user_id: user?.id, online_at: new Date().toISOString() });
        }
      });

    channelRef.current = channel;

    return () => {
      channel.unsubscribe();
    };
  }, [activeDoc?.id]); 

  const handleContentUpdate = (content: string) => {
    if (saveTimer) clearTimeout(saveTimer);
    setSaveStatus('SAVING...');
    setActiveDoc((prev: any) => ({ ...prev, content }));

    if (channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'doc-update',
        payload: { content, user_id: user?.id }
      });
    }

    const timer = setTimeout(async () => {
      if (activeDoc) {
        await supabase.from('docs')
          .update({ 
            content, 
            updated_at: new Date().toISOString(),
            word_count: content.split(' ').length
          })
          .eq('id', activeDoc.id);
        setSaveStatus('SAVED');
        
        setDocs(prev => prev.map(d => d.id === activeDoc.id ? { ...d, content, updated_at: new Date().toISOString() } : d));
        setSharedDocs(prev => prev.map(d => d.id === activeDoc.id ? { ...d, content, updated_at: new Date().toISOString() } : d));
      }
    }, 1500);
    setSaveTimer(timer);
  };

  const saveTitle = async (newTitle: string) => {
    if (!activeDoc || !hasEditPermission) return;
    setActiveDoc({ ...activeDoc, title: newTitle });
    await supabase.from('docs').update({ title: newTitle }).eq('id', activeDoc.id);
    setDocs(prev => prev.map(d => d.id === activeDoc.id ? { ...d, title: newTitle } : d));
    setSharedDocs(prev => prev.map(d => d.id === activeDoc.id ? { ...d, title: newTitle } : d));
  };

  const loadCollaborators = async () => {
    if (!activeDoc || activeDoc.is_shared) return;
    const { data } = await supabase
      .from('doc_collaborators')
      .select('*, profiles(username)')
      .eq('doc_id', activeDoc.id);
    if (data) setCollaborators(data);
  };

  useEffect(() => {
    if (activeDoc) loadCollaborators();
  }, [activeDoc?.id, showShareModal]);

  const searchUsers = async (term: string) => {
    setShareInput(term);
    if (term.length < 2) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    const { data } = await supabase
      .rpc('search_users_by_username', {
        search_term: term
      });
    setSearchResults(data || []);
    setSearching(false);
  };

  const inviteCollaborator = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shareInput.trim() || !activeDoc || !user) return;
    
    // Search user by username
    const { data: foundUsers, error: searchError } = 
      await supabase
        .rpc('search_users_by_username', {
          search_term: shareInput.trim()
        });
    
    if (searchError || !foundUsers?.length) {
      toast.error('USER NOT FOUND: ' + shareInput);
      return;
    }
    
    const targetUser = foundUsers[0];
    
    // Check not already collaborator
    const { data: existing } = await supabase
      .from('doc_collaborators')
      .select('id')
      .eq('doc_id', activeDoc.id)
      .eq('user_id', targetUser.id)
      .maybeSingle();
    
    if (existing) {
      toast.error('USER ALREADY HAS ACCESS');
      return;
    }
    
    // Add collaborator
    const { error: collabError } = await supabase
      .from('doc_collaborators')
      .insert({
        doc_id: activeDoc.id,
        owner_id: user.id,
        user_id: targetUser.id,
        permission: sharePerm
      });
    
    if (collabError) {
      toast.error('INVITE FAILED: ' + collabError.message);
      return;
    }
    
    // Get inviter username
    const { data: myProfile } = await supabase
      .from('profiles')
      .select('username')
      .eq('id', user.id)
      .single();
    
    // Create notification for invited user
    await supabase
      .from('notifications')
      .insert({
        user_id: targetUser.id,
        type: 'doc_invite',
        title: 'DOC INVITE',
        message: `${myProfile?.username || 'Someone'} invited you to collaborate on "${activeDoc.title}"`,
        data: {
          doc_id: activeDoc.id,
          doc_title: activeDoc.title,
          permission: sharePerm,
          inviter_id: user.id,
          inviter_username: myProfile?.username
        }
      });
    
    toast.success('INVITE SENT TO ' + targetUser.username);
    setShareInput('');
    setSearchResults([]);
    loadCollaborators();
  };

  const removeCollaborator = async (id: string) => {
    await supabase.from('doc_collaborators').delete().eq('id', id);
    loadCollaborators();
  };

  const filteredDocs = docs.filter(d => d.title.toLowerCase().includes(search.toLowerCase()));
  const filteredSharedDocs = sharedDocs.filter(d => d.title.toLowerCase().includes(search.toLowerCase()));

  const renderFolders = (parentId: string | null = null, depth = 0) => {
    if (depth > 2) return null;
    const children = folders.filter(f => (f.parent_id === parentId) || (!f.parent_id && parentId === null));
    
    return children.map(folder => {
      const isExpanded = expandedFolders[folder.id] ?? true;
      const folderDocs = filteredDocs.filter(d => d.folder === folder.id && !d.is_shared);
      const isRenaming = editingFolderId === folder.id;

      return (
        <div key={folder.id}>
          <div 
            className={`flex items-center justify-between py-1.5 hover:bg-[#0a1a0f] font-mono text-xs group cursor-pointer border-l-2 ${activeDoc?.folder === folder.id ? 'border-[#1b4332]' : 'border-transparent'} ${depth === 0 ? 'pl-3 pr-3' : depth === 1 ? 'pl-6 pr-3' : 'pl-10 pr-3'}`}
            onClick={() => !isRenaming && toggleFolder(folder.id)}
          >
            <div className="flex items-center gap-2 overflow-hidden flex-1 text-[#95d5b2] group-hover:text-[#52b788]">
              <Folder size={14} className="shrink-0" />
              {isRenaming ? (
                <input 
                  autoFocus
                  defaultValue={folder.name}
                  onBlur={(e) => renameFolder(folder.id, e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') renameFolder(folder.id, e.currentTarget.value);
                    if (e.key === 'Escape') setEditingFolderId(null);
                  }}
                  onClick={e => e.stopPropagation()}
                  className="bg-black border border-[#52b788] text-[#d8f3dc] outline-none px-1 py-0.5 w-full"
                />
              ) : (
                <span className="truncate">{folder.name}</span>
              )}
            </div>
            
            <div className="relative shrink-0 ml-2" onClick={e => e.stopPropagation()}>
              <button 
                onClick={() => setFolderMenuOpen(folderMenuOpen === folder.id ? null : folder.id)}
                className="opacity-0 group-hover:opacity-100 p-1 hover:text-[#52b788] hover:bg-[#1b4332] rounded transition-all"
              >
                <MoreVertical size={12} />
              </button>
              
              {folderMenuOpen === folder.id && (
                <div className="absolute right-0 top-6 w-36 bg-[#0d2818] border border-[#1b4332] shadow-xl z-50 py-1 flex flex-col">
                  <button onClick={() => { createDoc(folder.id); setFolderMenuOpen(null); }} className="text-left px-3 py-2 text-[10px] text-[#95d5b2] hover:bg-[#1b4332] hover:text-[#d8f3dc] flex items-center gap-2 font-bold"><Plus size={12}/> NEW DOC</button>
                  {depth < 2 && (
                    <button onClick={() => { createSubfolder(folder.id); setFolderMenuOpen(null); }} className="text-left px-3 py-2 text-[10px] text-[#95d5b2] hover:bg-[#1b4332] hover:text-[#d8f3dc] flex items-center gap-2 font-bold"><Folder size={12}/> SUBFOLDER</button>
                  )}
                  <button onClick={() => { setEditingFolderId(folder.id); setFolderMenuOpen(null); }} className="text-left px-3 py-2 text-[10px] text-[#e9c46a] hover:bg-[#1b4332] flex items-center gap-2 font-bold"><Edit2 size={12}/> RENAME</button>
                  <button onClick={() => { confirmDeleteFolder(folder.id); setFolderMenuOpen(null); }} className="text-left px-3 py-2 text-[10px] text-[#e63946] hover:bg-[#1b4332] flex items-center gap-2 font-bold"><Trash2 size={12}/> DELETE</button>
                </div>
              )}
            </div>
          </div>
          
          {isExpanded && (
            <div>
              {renderFolders(folder.id, depth + 1)}
              
              {folderDocs.map(doc => (
                <div 
                  key={doc.id}
                  onClick={() => setActiveDoc(doc)}
                  className={`cursor-pointer flex items-center gap-2 py-1.5 hover:bg-[#0a1a0f] font-mono text-xs text-[#95d5b2] hover:text-[#d8f3dc] group ${
                    activeDoc?.id === doc.id ? 'bg-[#0a1a0f] text-[#d8f3dc] border-l-2 border-[#52b788]' : 'border-l-2 border-transparent'
                  } ${depth === 0 ? 'pl-6 pr-3' : depth === 1 ? 'pl-10 pr-3' : 'pl-14 pr-3'}`}
                >
                  <FileText size={14} className="text-[#52b788] shrink-0" />
                  <span className="truncate flex-1">{doc.title}</span>
                  <button onClick={(e) => deleteDoc(doc.id, e)} className="opacity-0 group-hover:opacity-100 text-[#e63946] p-1 hover:bg-[#1b4332] rounded transition-all"><Trash2 size={12} /></button>
                </div>
              ))}
            </div>
          )}
        </div>
      );
    });
  };

  return (
    <UpgradeGate feature="Docs" requiredPlan="phantom" enabled={canUse('docs')}>
      <div className="flex h-full font-mono bg-[#0a1a0f] text-[#d8f3dc] overflow-hidden relative">
        <style dangerouslySetInnerHTML={{__html: `
          .ProseMirror { outline: none; min-height: 400px; padding-bottom: 2rem; }
          .ProseMirror p { margin-bottom: 1rem; color: #d8f3dc; }
          .ProseMirror h1 { font-family: 'Space Mono', monospace; color: #d8f3dc; font-size: 1.5rem; margin-bottom: 1rem; font-weight: bold; }
          .ProseMirror h2 { font-family: 'Space Mono', monospace; color: #d8f3dc; font-size: 1.25rem; font-weight: bold; }
          .ProseMirror code { background: #0d2818; color: #52b788; padding: 2px 6px; font-family: 'Space Mono', monospace; border: 1px solid #1b4332; }
          .ProseMirror blockquote { border-left: 2px solid #52b788; padding-left: 1rem; color: #95d5b2; font-style: italic; }
          .ProseMirror ul { list-style-type: square; padding-left: 1.5rem; margin-bottom: 1rem; }
          .ProseMirror ul li { color: #d8f3dc; margin-bottom: 0.25rem; }
          .ProseMirror p.is-editor-empty:first-child::before {
            content: attr(data-placeholder);
            float: left;
            color: #1b4332;
            pointer-events: none;
            height: 0;
          }
        `}} />

        {/* SHARE MODAL */}
        {showShareModal && (
          <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-50">
            <div className="bg-[#0d2818] border border-[#52b788] p-6 w-[400px] shadow-2xl relative">
              <button onClick={() => setShowShareModal(false)} className="absolute top-4 right-4 text-[#95d5b2] hover:text-white transition-colors">
                <X size={20} />
              </button>
              <h2 className="text-lg font-bold mb-6 flex items-center gap-2 text-[#52b788] uppercase tracking-widest">
                <Share2 size={20} /> SHARE_DOCUMENT
              </h2>
              
              <form onSubmit={inviteCollaborator} className="flex flex-col gap-4 mb-6">
                <div className="relative z-20">
                  <label className="block text-[10px] text-[#95d5b2] mb-1 font-bold tracking-widest">USERNAME_TARGET</label>
                  <div className="relative">
                    <input 
                      value={shareInput}
                      onChange={e => searchUsers(e.target.value)}
                      placeholder="Search username..." 
                      className="w-full bg-black border border-[#1b4332] p-2.5 text-sm text-[#d8f3dc] focus:outline-none focus:border-[#52b788] transition-colors"
                    />
                    {searchResults.length > 0 && (
                      <div className="absolute top-full left-0 right-0 bg-[#0d2818] border border-[#52b788] z-50 max-h-40 overflow-y-auto">
                        {searchResults.map(u => (
                          <div
                            key={u.id}
                            onClick={() => {
                              setShareInput(u.username);
                              setSearchResults([]);
                            }}
                            className="px-3 py-2 font-mono text-xs text-[#d8f3dc] hover:bg-[#0a1a0f] cursor-pointer">
                            {u.username}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                
                <div>
                  <label className="block text-[10px] text-[#95d5b2] mb-1 font-bold tracking-widest">ACCESS_LEVEL</label>
                  <select 
                    value={sharePerm} 
                    onChange={e => setSharePerm(e.target.value)}
                    className="w-full bg-black border border-[#1b4332] p-2.5 text-sm focus:outline-none focus:border-[#52b788] text-[#d8f3dc] transition-colors"
                  >
                    <option value="editor">EDITOR [WRITE]</option>
                    <option value="viewer">VIEWER [READ]</option>
                  </select>
                </div>
                
                <button type="submit" disabled={!shareInput.trim()} className="mt-2 py-3 bg-[#52b788] text-[#0a1a0f] font-bold hover:bg-[#74c69d] text-sm tracking-widest disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
                  <UserPlus size={16} /> TRANSMIT_INVITE
                </button>
              </form>
              
              <h3 className="text-[10px] font-bold text-[#52b788] mb-3 border-b border-[#1b4332] pb-2 tracking-widest">ACTIVE_COLLABORATORS</h3>
              <div className="flex flex-col gap-2 max-h-40 overflow-y-auto pr-1">
                {collaborators.length === 0 ? (
                  <div className="text-xs text-[#1b4332] italic">No active collaborators linked.</div>
                ) : (
                  collaborators.map(c => (
                    <div key={c.id} className="flex items-center justify-between bg-black p-2 border border-[#1b4332] group hover:border-[#52b788] transition-colors">
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-[#d8f3dc]">{c.profiles?.username}</span>
                        <span className={`text-[9px] uppercase tracking-widest font-bold ${c.permission === 'editor' ? 'text-[#e9c46a]' : 'text-[#95d5b2]'}`}>
                          [{c.permission}]
                        </span>
                      </div>
                      <button onClick={() => removeCollaborator(c.id)} className="text-[#e63946] p-1.5 opacity-50 group-hover:opacity-100 hover:bg-[#1b4332] rounded transition-all">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* LEFT PANEL */}
        <div className="w-[280px] bg-[#0d2818] border-r border-[#1b4332] flex flex-col shrink-0">
          <div className="p-4 border-b border-[#1b4332] bg-[#0d2818] z-10 shrink-0">
            <div className="relative mb-3">
              <input 
                type="text" 
                placeholder="Query documents..." 
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full bg-black border border-[#1b4332] py-2 pl-8 pr-2 text-xs text-[#52b788] focus:outline-none focus:border-[#52b788] transition-colors"
              />
              <Search size={14} className="absolute left-2.5 top-2.5 text-[#1b4332]" />
            </div>
            <div className="flex gap-2">
              <button onClick={() => createDoc()} className="flex-1 border border-[#52b788] text-[#52b788] py-1.5 text-[10px] font-bold hover:bg-[#52b788] hover:text-black transition-colors flex items-center justify-center gap-1">
                <Plus size={12} /> DOC
              </button>
              <button onClick={createFolder} className="flex-1 border border-[#1b4332] text-[#95d5b2] py-1.5 text-[10px] font-bold hover:border-[#52b788] hover:text-[#52b788] transition-colors flex items-center justify-center gap-1">
                <Plus size={12} /> FOLDER
              </button>
            </div>
          </div>

          <div className="flex-1 py-2 overflow-y-auto">
            {renderFolders(null, 0)}
            
            {folders.length > 0 && <div className="my-3 mx-4 border-t border-[#1b4332]/50"></div>}

            {/* Root Docs */}
            {filteredDocs.filter(d => d.folder === 'root' || !d.folder).map(doc => (
               <div 
                 key={doc.id}
                 onClick={() => setActiveDoc(doc)}
                 className={`cursor-pointer flex items-center gap-2 px-3 py-1.5 hover:bg-[#0a1a0f] font-mono text-xs text-[#95d5b2] hover:text-[#d8f3dc] group transition-colors ${activeDoc?.id === doc.id ? 'bg-[#0a1a0f] text-[#d8f3dc] border-l-2 border-[#52b788]' : 'border-l-2 border-transparent'}`}
               >
                 <FileText size={14} className="text-[#52b788] shrink-0" />
                 <span className="truncate flex-1">{doc.title}</span>
                 <button onClick={(e) => deleteDoc(doc.id, e)} className="opacity-0 group-hover:opacity-100 text-[#e63946] p-1 hover:bg-[#1b4332] rounded transition-all"><Trash2 size={12} /></button>
               </div>
            ))}

            {/* Shared Docs Section */}
            {filteredSharedDocs.length > 0 && (
              <div className="mt-6 mb-2">
                <div className="flex items-center gap-2 px-3 py-2 font-mono text-[10px] tracking-widest font-bold text-[#52b788] border-y border-[#1b4332] bg-black">
                  <Users size={12} /> SHARED_WITH_ME
                </div>
                <div className="py-2">
                  {filteredSharedDocs.map((doc: any) => (
                    <div 
                      key={doc.id}
                      onClick={() => setActiveDoc(doc)}
                      className={`cursor-pointer flex items-center gap-2 px-3 py-1.5 hover:bg-[#0a1a0f] font-mono text-xs text-[#95d5b2] hover:text-[#d8f3dc] group transition-colors ${activeDoc?.id === doc.id ? 'bg-[#0a1a0f] text-[#d8f3dc] border-l-2 border-[#52b788]' : 'border-l-2 border-transparent'}`}
                    >
                      <Users size={14} className="text-[#e9c46a] shrink-0" />
                      <span className="truncate flex-1">{doc.title}</span>
                      <span className="shrink-0 text-[9px] font-bold uppercase text-[#1b4332] group-hover:text-[#52b788] border border-transparent group-hover:border-[#52b788] px-1 rounded transition-colors">
                        {doc.shared_permission === 'viewer' ? 'READ' : 'EDIT'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT PANEL */}
        <div className="flex-1 flex flex-col bg-[#0a1a0f] overflow-hidden">
          {!activeDoc ? (
            <div className="flex-1 flex flex-col items-center justify-center relative">
              <div className="absolute inset-0 flex items-center justify-center opacity-5 pointer-events-none">
                <FileText size={400} className="text-[#52b788]" />
              </div>
              <FileText className="text-[#1b4332] mb-4 relative z-10" size={48} />
              <div className="font-mono text-sm font-bold tracking-widest text-[#1b4332] relative z-10">AWAITING_DOCUMENT_SELECTION</div>
            </div>
          ) : (
            <>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border-b border-[#1b4332] bg-[#0d2818] z-10 shrink-0 gap-4">
                <input 
                  className="bg-transparent font-mono font-bold text-xl text-[#d8f3dc] outline-none border-b border-transparent focus:border-[#52b788] px-1 w-full max-w-[60%] transition-colors"
                  value={activeDoc.title}
                  onChange={e => hasEditPermission && setActiveDoc({ ...activeDoc, title: e.target.value })}
                  onBlur={e => hasEditPermission && saveTitle(e.target.value)} 
                  readOnly={!hasEditPermission}
                  placeholder="Document Title"
                />
                <div className="flex items-center gap-4 shrink-0">
                  {activeDoc && !activeDoc.is_shared && (
                    <button onClick={() => setShowShareModal(true)} className="flex items-center gap-2 font-mono text-[10px] font-bold tracking-widest text-[#95d5b2] hover:text-[#0a1a0f] px-3 py-1.5 border border-[#1b4332] hover:border-[#52b788] hover:bg-[#52b788] transition-all">
                      <UserPlus size={14} /> SHARE
                    </button>
                  )}
                  
                  <div className="flex items-center gap-2 font-mono text-[10px] font-bold tracking-widest text-[#52b788] bg-black border border-[#1b4332] px-3 py-1.5">
                    <Eye size={14} className={viewers > 1 ? "text-[#e9c46a] animate-pulse" : ""} /> 
                    <span className={viewers > 1 ? "text-[#e9c46a]" : ""}>{viewers} VIEWING</span>
                  </div>
                  
                  <div className="flex flex-col items-end border-l border-[#1b4332] pl-4">
                    <span className={`font-mono text-[10px] font-bold tracking-widest ${saveStatus === 'SAVED' ? 'text-[#52b788]' : 'text-[#e9c46a] animate-pulse'}`}>{saveStatus}</span>
                    <span className="font-mono text-[10px] text-[#1b4332] tracking-widest">
                      {activeDoc.content ? activeDoc.content.replace(/<[^>]*>?/gm, '').split(/\s+/).filter((w: string) => w.length > 0).length : 0} WORDS
                    </span>
                  </div>
                </div>
              </div>

              {editor && hasEditPermission && (
                <div className="flex items-center gap-1 p-2 border-b border-[#1b4332] flex-wrap bg-black z-10 shrink-0 shadow-md">
                  <button onClick={() => editor.chain().focus().toggleBold().run()} className={`px-2 py-1.5 font-mono text-[10px] font-bold uppercase transition-colors ${editor.isActive('bold') ? 'bg-[#52b788] text-[#0a1a0f]' : 'text-[#95d5b2] hover:text-[#52b788] hover:bg-[#1b4332]'}`}><Bold size={14}/></button>
                  <button onClick={() => editor.chain().focus().toggleItalic().run()} className={`px-2 py-1.5 font-mono text-[10px] font-bold uppercase transition-colors ${editor.isActive('italic') ? 'bg-[#52b788] text-[#0a1a0f]' : 'text-[#95d5b2] hover:text-[#52b788] hover:bg-[#1b4332]'}`}><Italic size={14}/></button>
                  <div className="w-px h-4 bg-[#1b4332] mx-1"></div>
                  <button onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} className={`px-2 py-1.5 font-mono text-[10px] font-bold uppercase transition-colors ${editor.isActive('heading', { level: 1 }) ? 'bg-[#52b788] text-[#0a1a0f]' : 'text-[#95d5b2] hover:text-[#52b788] hover:bg-[#1b4332]'}`}><Heading1 size={14}/></button>
                  <button onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} className={`px-2 py-1.5 font-mono text-[10px] font-bold uppercase transition-colors ${editor.isActive('heading', { level: 2 }) ? 'bg-[#52b788] text-[#0a1a0f]' : 'text-[#95d5b2] hover:text-[#52b788] hover:bg-[#1b4332]'}`}><Heading2 size={14}/></button>
                  <div className="w-px h-4 bg-[#1b4332] mx-1"></div>
                  <button onClick={() => editor.chain().focus().toggleBulletList().run()} className={`px-2 py-1.5 font-mono text-[10px] font-bold uppercase transition-colors ${editor.isActive('bulletList') ? 'bg-[#52b788] text-[#0a1a0f]' : 'text-[#95d5b2] hover:text-[#52b788] hover:bg-[#1b4332]'}`}><List size={14}/></button>
                  <button onClick={() => editor.chain().focus().toggleCodeBlock().run()} className={`px-2 py-1.5 font-mono text-[10px] font-bold uppercase transition-colors ${editor.isActive('codeBlock') ? 'bg-[#52b788] text-[#0a1a0f]' : 'text-[#95d5b2] hover:text-[#52b788] hover:bg-[#1b4332]'}`}><Code size={14}/></button>
                  <button onClick={() => editor.chain().focus().toggleBlockquote().run()} className={`px-2 py-1.5 font-mono text-[10px] font-bold uppercase transition-colors ${editor.isActive('blockquote') ? 'bg-[#52b788] text-[#0a1a0f]' : 'text-[#95d5b2] hover:text-[#52b788] hover:bg-[#1b4332]'}`}>QUOTE</button>
                  <div className="w-px h-4 bg-[#1b4332] mx-1"></div>
                  <button onClick={() => editor.chain().focus().setHorizontalRule().run()} className={`px-2 py-1.5 font-mono text-[10px] font-bold uppercase text-[#95d5b2] hover:text-[#52b788] hover:bg-[#1b4332] transition-colors`}>DIVIDER</button>
                </div>
              )}
              
              {!hasEditPermission && (
                <div className="bg-[#1b4332]/30 border-b border-[#1b4332] px-4 py-2 font-mono text-[10px] text-[#e9c46a] tracking-widest flex items-center justify-center">
                  READ_ONLY_MODE_ENGAGED
                </div>
              )}

              <div className="flex-1 overflow-y-auto bg-[#0a1a0f]">
                <div className="max-w-4xl mx-auto">
                  <EditorContent editor={editor} className="p-8 md:p-12 font-sans text-[#d8f3dc] text-sm leading-relaxed outline-none prose prose-invert max-w-none min-h-full" />
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </UpgradeGate>
  );
}
