import { useEffect, useState } from "react";
import axios from "axios";

type TodoItem = {
  id: number;
  title: string;
  isDone: boolean;
};

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

export default function TodosPage() {
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [title, setTitle] = useState("");
  const [error, setError] = useState<string | null>(null);

  const loadTodos = async () => {
    try {
      const res = await axios.get<TodoItem[]>(`${API_BASE}/api/todos`);
      setTodos(res.data);
    } catch {
      setError("Failed to load todos.");
    }
  };

  useEffect(() => {
    loadTodos();
  }, []);

  const addTodo = async () => {
    if (!title.trim()) return;

    await axios.post(`${API_BASE}/api/todos`, {
      title,
      isDone: false,
    });

    setTitle("");
    loadTodos();
  };

  const toggleTodo = async (todo: TodoItem) => {
    await axios.put(`${API_BASE}/api/todos/${todo.id}`, {
      ...todo,
      isDone: !todo.isDone,
    });

    loadTodos();
  };

  const deleteTodo = async (id: number) => {
    await axios.delete(`${API_BASE}/api/todos/${id}`);
    loadTodos();
  };

  return (
    <div style={{ maxWidth: 860, margin: "24px auto", padding: "0 16px" }}>
      <h2>Todos</h2>

      {error && <div style={{ color: "red" }}>{error}</div>}

      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="New todo"
          style={{ flex: 1 }}
        />
        <button onClick={addTodo}>Add</button>
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
            }}
          >
            <input
              type="checkbox"
              checked={t.isDone}
              onChange={() => toggleTodo(t)}
            />
            <span
              style={{
                flex: 1,
                textDecoration: t.isDone ? "line-through" : "none",
              }}
            >
              {t.title}
            </span>
            <button onClick={() => deleteTodo(t.id)}>✕</button>
          </li>
        ))}
      </ul>
    </div>
  );
}
