import { useEffect, useState } from 'react'
import { getTodos, addTodo, updateTodo, deleteTodo, type Todo } from './api'

export default function App() {
  const [todos, setTodos] = useState<Todo[]>([])
  const [title, setTitle] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getTodos().then(setTodos).catch(e => setError(e.message)).finally(() => setLoading(false))
  }, [])

  async function onAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    const t = await addTodo(title.trim())
    setTodos(prev => [...prev, t])
    setTitle('')
  }

  async function toggle(todo: Todo) {
    const updated = { ...todo, isDone: !todo.isDone }
    const saved = await updateTodo(updated)
    setTodos(prev => prev.map(t => t.id === saved.id ? saved : t))
  }

  async function onDelete(id: number) {
    await deleteTodo(id)
    setTodos(prev => prev.filter(t => t.id !== id))
  }

  if (loading) return <p style={{fontFamily:'system-ui'}}>Loading…</p>
  if (error) return <p style={{color:'red', fontFamily:'system-ui'}}>Error: {error}</p>

  return (
    <div style={{maxWidth: 720, margin: '40px auto', padding: 16, fontFamily: 'system-ui'}}>
      <h1 style={{marginBottom: 8}}>Fullstack Todo</h1>
      <p style={{marginTop: 0}}>React + TypeScript front end talking to a C# minimal API.</p>

      <form onSubmit={onAdd} style={{display: 'flex', gap: 8, marginBottom: 16}}>
        <input
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="Add a todo"
          style={{flex: 1, padding: 8, borderRadius: 8, border: '1px solid #ccc'}}
        />
        <button type="submit" style={{padding: '8px 14px', borderRadius: 8}}>Add</button>
      </form>

      <ul style={{listStyle: 'none', padding: 0}}>
        {todos.map(t => (
          <li key={t.id} style={{display: 'flex', alignItems: 'center', gap: 8, padding: 8, borderBottom: '1px solid #eee'}}>
            <input type="checkbox" checked={t.isDone} onChange={() => toggle(t)} />
            <span style={{textDecoration: t.isDone ? 'line-through' : 'none', flex:1}}>{t.title}</span>
            <button onClick={() => onDelete(t.id)} style={{padding: '4px 8px'}}>Delete</button>
          </li>
        ))}
      </ul>
    </div>
  )
}