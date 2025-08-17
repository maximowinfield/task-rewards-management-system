const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8080';

export type Todo = { id:number; title:string; isDone:boolean };

export async function getTodos(): Promise<Todo[]> {
  const res = await fetch(`${baseUrl}/api/todos`);
  if (!res.ok) throw new Error('Failed to fetch todos');
  return res.json();
}

export async function addTodo(title: string): Promise<Todo> {
  const res = await fetch(`${baseUrl}/api/todos`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, isDone: false })
  });
  if (!res.ok) throw new Error('Failed to add todo');
  return res.json();
}

export async function updateTodo(todo: Todo): Promise<Todo> {
  const res = await fetch(`${baseUrl}/api/todos/${todo.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(todo)
  });
  if (!res.ok) throw new Error('Failed to update todo');
  return res.json();
}

export async function deleteTodo(id: number): Promise<void> {
  const res = await fetch(`${baseUrl}/api/todos/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete todo');
}