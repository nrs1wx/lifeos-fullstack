import React, { useEffect, useRef, useState } from 'react';
import { Search, Bold, Italic, Underline, List, ListOrdered, FileText, Plus, Trash2 } from 'lucide-react';
import { TopBar } from '../components/TopBar';
import { useStore } from '../store';
import { EmptyState } from '../components/EmptyState';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';

export function Notes() {
  const { notes, addEntity, updateEntity, deleteEntity, addActivity, addToast } = useStore();
  const [activeNoteId, setActiveNoteId] = useState<string | null>(notes[0]?.id || null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [draftTitle, setDraftTitle] = useState('');
  const [draftContent, setDraftContent] = useState('');
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const saveTimerRef = useRef<number | null>(null);

  const filteredNotes = notes.filter((n: any) => 
    n.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    n.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
    n.tags.some((t: string) => t.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const activeNote = notes.find((n: any) => n.id === activeNoteId);

  useEffect(() => {
    if (!activeNote) return;
    setDraftTitle(activeNote.title || '');
    setDraftContent(activeNote.content || '');
    setSaveState('saved');
  }, [activeNote?.id]);

  useEffect(() => {
    if (!activeNote || saveState === 'idle') return;
    if (draftTitle === activeNote.title && draftContent === activeNote.content) return;
    setSaveState('saving');
    if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    saveTimerRef.current = window.setTimeout(async () => {
      await updateEntity('notes', activeNote.id, {
        title: draftTitle.trim() || 'Untitled Note',
        content: draftContent || '<p></p>',
        timestamp: activeNote.timestamp || new Date().toISOString(),
      }, { silent: true });
      setSaveState('saved');
    }, 700);
    return () => {
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    };
  }, [activeNote, draftContent, draftTitle, saveState, updateEntity]);

  const createNote = () => {
    const newNote = {
      id: Math.random().toString(36).substring(2, 9),
      title: 'New Note',
      content: '<p>Start typing...</p>',
      tags: [],
      timestamp: new Date().toISOString()
    };
    addEntity('notes', newNote);
    setActiveNoteId(newNote.id);
    addActivity('Created new note', 'Notes');
  };

  const handleDeleteNote = () => {
    if (activeNoteId) {
      deleteEntity('notes', activeNoteId);
      addActivity(`Deleted note: ${activeNote?.title}`, 'Notes');
      addToast('Note deleted');
      setActiveNoteId(notes.length > 1 ? notes.find(n => n.id !== activeNoteId)?.id || null : null);
      setIsDeleteDialogOpen(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-background overflow-hidden relative pb-20 lg:pb-0">
      <TopBar showMobileTitle={false} />
      
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-0 overflow-hidden h-full">
        
        {/* Left Col: List */}
        <div className="hidden lg:flex lg:col-span-4 xl:col-span-3 border-r border-outline-variant bg-surface flex-col h-full z-10">
          <div className="p-4 border-b border-outline-variant flex flex-col gap-4 bg-surface/50 backdrop-blur-md sticky top-0">
            <div className="flex items-center justify-between">
              <h2 className="text-[24px] font-heading font-bold text-on-surface">Notes</h2>
              <button aria-label="Add" onClick={createNote} className="p-2 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors">
<Plus className="w-4 h-4" />
</button>
            </div>
            <div className="flex items-center bg-surface-container-low border border-outline-variant rounded-xl px-3 py-2 focus-within:border-primary transition-colors">
              <Search className="w-4 h-4 text-on-surface-variant mr-2" />
              <input 
                type="text" 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search notes..." 
                className="bg-transparent border-none outline-none text-[13px] text-on-surface w-full" 
              />
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
            {notes.length === 0 ? (
               <div className="p-4 text-center text-on-surface-variant text-[13px]">
                 No notes yet. Create one to get started.
               </div>
            ) : filteredNotes.length === 0 ? (
                <div className="p-4 text-center text-on-surface-variant text-[13px]">
                 No notes match your search.
               </div>
            ) : (
              filteredNotes.map((note: any) => (
                <div 
                  key={note.id}
                  onClick={() => setActiveNoteId(note.id)}
                  className={`${activeNoteId === note.id ? 'bg-primary-container/10 border-primary/20' : 'bg-surface hover:bg-surface-container-low border-transparent hover:border-outline-variant'} border p-3 rounded-xl cursor-pointer transition-colors`}
                >
                  <h4 className="text-[14px] font-medium text-on-surface mb-1">{note.title}</h4>
                  <p className="text-[12px] text-on-surface-variant line-clamp-2 leading-relaxed" dangerouslySetInnerHTML={{ __html: note.content.substring(0, 100) }} />
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Col: Editor */}
        <div className="lg:col-span-8 xl:col-span-9 bg-background flex flex-col h-full relative">
          {notes.length === 0 ? (
            <div className="flex-1 flex items-center justify-center">
              <EmptyState 
                icon={FileText}
                title="No notes yet"
                description="Create a note for ideas, meeting notes, or personal writing. You can summarize and tag it later."
                actionLabel="Create note"
                onAction={createNote}
              />
            </div>
          ) : activeNote ? (
            <>
              <div className="h-14 border-b border-outline-variant bg-surface flex items-center justify-between px-4 sm:px-6 shrink-0 overflow-x-auto hide-scrollbar">
                <div className="flex items-center gap-1 text-on-surface-variant shrink-0">
                  <button aria-label="Format Bold" className="p-1.5 rounded hover:bg-surface-variant transition-colors">
<Bold className="w-4 h-4" />
</button>
                  <button aria-label="Format Italic" className="p-1.5 rounded hover:bg-surface-variant transition-colors">
<Italic className="w-4 h-4" />
</button>
                  <button aria-label="Format Underline" className="p-1.5 rounded hover:bg-surface-variant transition-colors">
<Underline className="w-4 h-4" />
</button>
                  <div className="w-px h-4 bg-outline-variant mx-2"></div>
                  <button aria-label="Format List" className="p-1.5 rounded hover:bg-surface-variant transition-colors">
<List className="w-4 h-4" />
</button>
                  <button aria-label="Format List" className="p-1.5 rounded hover:bg-surface-variant transition-colors">
<ListOrdered className="w-4 h-4" />
</button>
                </div>
                <div className="flex items-center gap-4">
                  <span className="font-mono text-[11px] text-on-surface-variant shrink-0">Saved just now</span>
                  <button onClick={() => setIsDeleteDialogOpen(true)} className="p-1.5 text-on-surface-variant hover:text-error hover:bg-error/10 rounded transition-colors"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6 lg:p-12 custom-scrollbar">
                <div className="max-w-3xl mx-auto">
                  <input 
                    type="text" 
                    value={draftTitle}
                    onChange={(event) => setDraftTitle(event.target.value)}
                    className="w-full text-[28px] sm:text-[36px] font-heading font-bold text-on-surface bg-transparent border-none outline-none mb-4"
                  />
                  <div className="flex flex-wrap items-center gap-2 mb-8">
                    <span className="font-mono text-[12px] text-on-surface-variant mr-2">
                      {new Date(activeNote.timestamp).toLocaleDateString()}
                    </span>
                    {activeNote.tags.map((tag: string, i: number) => (
                      <span key={i} className="px-2 py-0.5 bg-surface-variant text-on-surface-variant text-[11px] rounded transition-colors uppercase tracking-wider font-mono">
                        #{tag}
                      </span>
                    ))}
                    <button className="px-2 py-0.5 bg-surface-variant text-on-surface-variant text-[11px] rounded hover:bg-surface-container-high transition-colors uppercase tracking-wider font-mono">+ Add tag</button>
                  </div>

                  <div
                    className="prose prose-sm max-w-none text-on-surface text-[15px] leading-relaxed font-sans outline-none"
                    contentEditable
                    suppressContentEditableWarning
                    onInput={(event) => setDraftContent(event.currentTarget.innerHTML)}
                    dangerouslySetInnerHTML={{ __html: draftContent }}
                  />
                </div>
              </div>

              <div className="h-16 border-t border-outline-variant bg-surface-container-lowest px-4 sm:px-6 flex items-center justify-between shrink-0 shadow-[0_-4px_12px_rgba(0,0,0,0.02)]">
                <div className="flex items-center gap-2 text-on-surface-variant font-medium text-[13px]">
                  {saveState === 'saving' ? 'Saving...' : 'Saved'}
                </div>
                <div className="flex items-center gap-2 sm:gap-3">
                  <button onClick={() => setIsDeleteDialogOpen(true)} className="px-3 sm:px-4 py-1.5 bg-error/10 text-error border border-error/20 rounded-lg text-[12px] font-medium hover:bg-error/20 transition-colors">
                    Delete Note
                  </button>
                </div>
              </div>
            </>
          ) : null}
        </div>

      </div>

      <ConfirmDialog 
        isOpen={isDeleteDialogOpen}
        title="Delete Note"
        message="Are you sure you want to delete this note? This action cannot be undone."
        confirmLabel="Delete"
        onConfirm={handleDeleteNote}
        onCancel={() => setIsDeleteDialogOpen(false)}
      />
    </div>
  );
}
