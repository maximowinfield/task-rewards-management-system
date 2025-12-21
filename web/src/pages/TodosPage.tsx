import { useEffect, useState } from "react";
import { api } from "../api";

type TodoItem = {
  id: number;
  title: string;
  isDone: boolean;
};

export default function TodosPage(): JSX.Element {
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [title, setTitle] = useState("");
  const [error, setError] = useState<string | null>(null);

  const loadTodos = async () => {
    try {
      // ✅ baseURL is "/api", so this hits "/api/todos"
      const res = await api.get<TodoItem[]>("/todos");
      setTodos(res.data);
      setError(null);
    } catch (err: any) {
      const status = err?.response?.status;
      setError(`Failed to load todos.${status ? ` (HTTP ${status})` : ""}`);
    }
  };

  useEffect(() => {
    void loadTodos();
  }, []);

  const addTodo = async () => {
    if (!title.trim()) return;

    await api.post("/todos", { title, isDone: false });
    setTitle("");
    await loadTodos();
  };

  const toggleTodo = async (todo: TodoItem) => {
    await api.put(`/todos/${todo.id}`, { ...todo, isDone: !todo.isDone });
    await loadTodos();
  };

  const deleteTodo = async (id: number) => {
    await api.delete(`/todos/${id}`);
    await loadTodos();
  };

  return (
    <div style={{ maxWidth: 860, margin: "24px auto", padding: "0 16px" }}>
      <h2>Todos</h2>

      {error && <div style={{ color: "red", marginBottom: 12 }}>{error}</div>}

      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="New todo"
          style={{ flex: 1, padding: 8 }}
        />
        <button onClick={addTodo} style={{ padding: "8px 12px" }}>
          Add
        </button>
      </div>

      <ul style={{ listStyle: "none", padding: 0 }}>
        {todos.map((t) => (
          <li
            key={t.id}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 8,
              padding: 8,
              border: "1px solid rgba(148,163,184,0.25)",
              borderRadius: 10,
            }}
          >
            <input type="checkbox" checked={t.isDone} onChange={() => void toggleTodo(t)} />
            <span style={{ flex: 1, textDecoration: t.isDone ? "line-through" : "none" }}>
              {t.title}
            </span>
            <button onClick={() => void deleteTodo(t.id)} style={{ padding: "6px 10px" }}>
              ✕
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
