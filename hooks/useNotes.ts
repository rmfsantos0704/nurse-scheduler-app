import { useState, useCallback } from "react";
import { noteService, Note } from "../services/noteService";

export function useNotes() {
  const [notes,     setNotes]     = useState<Note[]>([]);
  const [filtered,  setFiltered]  = useState<Note[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [refreshing,setRefreshing]= useState(false);
  const [search,    setSearch]    = useState("");

  const fetch = useCallback(async () => {
    try {
      const data = await noteService.getAll();
      setNotes(data);
      setFiltered(data);
    } catch { /* silent */ }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  const refresh = () => { setRefreshing(true); fetch(); };

  const handleSearch = (text: string) => {
    setSearch(text);
    if (!text.trim()) { setFiltered(notes); return; }
    const q = text.toLowerCase();
    setFiltered(notes.filter(n =>
      n.title.toLowerCase().includes(q) ||
      n.content.toLowerCase().includes(q)
    ));
  };

  const create = async (body: Omit<Note, "_id" | "createdAt" | "updatedAt">) => {
    const created = await noteService.create(body);
    const updated = [created, ...notes];
    setNotes(updated);
    setFiltered(updated);
    return created;
  };

  const update = async (id: string, body: Partial<Note>) => {
    const updated = await noteService.update(id, body);
    const newList = notes.map(n => n._id === updated._id ? updated : n);
    setNotes(newList);
    handleSearch(search);
    return updated;
  };

  const remove = async (id: string) => {
    const newList = notes.filter(n => n._id !== id);
    setNotes(newList); setFiltered(newList);
    await noteService.remove(id).catch(() => {});
  };
const removeMany = async (ids: string[]) => {
  // Optimistic update — remove all at once from both lists
  setNotes(prev => prev.filter(n => !ids.includes(n._id)));
  setFiltered(prev => prev.filter(n => !ids.includes(n._id)));
  // Delete from backend in parallel
  await Promise.all(ids.map(id => noteService.remove(id).catch(() => {})));
};
return {
  notes, filtered, loading, refreshing, search,
  fetch, refresh, handleSearch, create, update, remove, removeMany,
};
}