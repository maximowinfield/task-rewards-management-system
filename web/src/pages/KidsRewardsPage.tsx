import { useEffect, useMemo, useState } from "react";
import { Link, useParams, Navigate } from "react-router-dom";
import type { KidTask, Reward } from "../types";
import {
  getTasks,
  getPoints,
  completeTask,
  getRewards,
  redeemReward,
  createTask,
  createReward,
  updateTask,
  deleteTask,
  updateReward,
  deleteReward,
} from "../api";

import { useAuth } from "../context/AuthContext";


export default function KidsRewardsPage() {
  const { auth, setAuth } = useAuth();
  const { kidId } = useParams<{ kidId: string }>();

  // ✅ Force Parent mode when visiting parent pages
  useEffect(() => {
    if (auth?.parentToken && auth?.activeRole !== "Parent") {
      setAuth((prev: any) => ({ ...prev, activeRole: "Parent" }));
    }
  }, [auth?.parentToken, auth?.activeRole, setAuth]);

  const [tasks, setTasks] = useState<KidTask[]>([]);
  const [points, setPoints] = useState<number>(0);
  const [rewards, setRewards] = useState<Reward[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Parent/admin form state
  const [taskTitle, setTaskTitle] = useState("");
  const [taskPoints, setTaskPoints] = useState(5);

  const [rewardName, setRewardName] = useState("");
  const [rewardCost, setRewardCost] = useState(20);

  // ✅ Option A: kidId comes from the URL
  const effectiveKidId = useMemo(() => kidId ?? "", [kidId]);

  // ✅ Inline edit state
  const [editingTaskId, setEditingTaskId] = useState<number | null>(null);
  const [editTaskTitle, setEditTaskTitle] = useState("");
  const [editTaskPoints, setEditTaskPoints] = useState(0);

  const [editingRewardId, setEditingRewardId] = useState<number | null>(null);
  const [editRewardName, setEditRewardName] = useState("");
  const [editRewardCost, setEditRewardCost] = useState(0);


  function startEditTask(t: KidTask) {
  setEditingTaskId(t.id);
  setEditTaskTitle(t.title);
  setEditTaskPoints(t.points);
}

function cancelEditTask() {
  setEditingTaskId(null);
  setEditTaskTitle("");
  setEditTaskPoints(0);
}

async function onSaveTask(id: number) {
  try {
    setError(null);
    await updateTask(id, {
      title: editTaskTitle.trim(),
      points: Number(editTaskPoints) || 0,
      assignedKidId: effectiveKidId, // keep it assigned to the current kid page
    });
    cancelEditTask();
    await loadAll(effectiveKidId);
  } catch (e: any) {
    console.error("updateTask failed:", e);
    setError(e?.message ?? String(e));
  }
}

async function onDeleteTask(id: number) {
  if (!confirm("Delete this task?")) return;

  try {
    setError(null);
    await deleteTask(id);
    await loadAll(effectiveKidId);
  } catch (e: any) {
    console.error("deleteTask failed:", e);
    setError(e?.message ?? String(e));
  }
}

function startEditReward(r: Reward) {
  setEditingRewardId(r.id);
  setEditRewardName(r.name);
  setEditRewardCost(r.cost);
}

function cancelEditReward() {
  setEditingRewardId(null);
  setEditRewardName("");
  setEditRewardCost(0);
}

async function onSaveReward(id: number) {
  try {
    setError(null);
    await updateReward(id, {
      name: editRewardName.trim(),
      cost: Number(editRewardCost) || 0,
    });
    cancelEditReward();
    await loadAll(effectiveKidId);
  } catch (e: any) {
    console.error("updateReward failed:", e);
    setError(e?.message ?? String(e));
  }
}

async function onDeleteReward(id: number) {
  if (!confirm("Delete this reward?")) return;

  try {
    setError(null);
    await deleteReward(id);
    await loadAll(effectiveKidId);
  } catch (e: any) {
    console.error("deleteReward failed:", e);
    setError(e?.message ?? String(e));
  }
}


  async function loadAll(id: string) {
    const [t, p, r] = await Promise.all([getTasks(id), getPoints(id), getRewards()]);
    setTasks(t);
    setPoints(p.points);
    setRewards(r);
  }

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setError(null);

        // If no kidId in the URL, send parent to Select Kid
        if (!effectiveKidId) {
          setTasks([]);
          setPoints(0);
          setRewards(await getRewards());
          return;
        }

        await loadAll(effectiveKidId);
      } catch (e: any) {
        console.error("loadAll failed:", e);
        setError(e?.message ?? String(e));
      } finally {
        setLoading(false);
      }
    })();
  }, [effectiveKidId]);

  async function onCompleteTask(id: number) {
    try {
      setError(null);
      await completeTask(id);
      await loadAll(effectiveKidId);
    } catch (e: any) {
      console.error("completeTask failed:", e);
      setError(e?.message ?? String(e));
    }
  }

  async function onRedeem(rewardId: number) {
    try {
      setError(null);

      // If your API requires kidId for parent redemption later, you can extend this.
      await redeemReward(rewardId);

      if (effectiveKidId) {
        await loadAll(effectiveKidId);
      }
    } catch (e: any) {
      console.error("redeemReward failed:", e);
      setError(e?.message ?? String(e));
    }
  }

  async function onCreateTask(e: React.FormEvent) {
    e.preventDefault();
    if (!effectiveKidId) return;

    const title = taskTitle.trim();
    if (!title) return;

    try {
      setError(null);
      await createTask({
        title,
        points: Number(taskPoints) || 0,
        assignedKidId: effectiveKidId,
      });
      setTaskTitle("");
      await loadAll(effectiveKidId);
    } catch (e: any) {
      console.error("createTask failed:", e);
      setError(e?.message ?? String(e));
    }
  }

  async function onCreateReward(e: React.FormEvent) {
    e.preventDefault();

    const name = rewardName.trim();
    if (!name) return;

    try {
      setError(null);
      await createReward({
        name,
        cost: Number(rewardCost) || 0,
      });
      setRewardName("");

      if (effectiveKidId) {
        await loadAll(effectiveKidId);
      } else {
        setRewards(await getRewards());
      }
    } catch (e: any) {
      console.error("createReward failed:", e);
      setError(e?.message ?? String(e));
    }
  }

  if (loading) return <p style={{ fontFamily: "system-ui" }}>Loading…</p>;

  // ✅ With Option A, if kidId is missing, route is invalid—send them to pick a kid
  if (!effectiveKidId) {
    return <Navigate to="/select-kid" replace />;
  }

  return (
    <div
      style={{
        maxWidth: 860,
        margin: "40px auto",
        padding: 16,
        fontFamily: "system-ui",
      }}
    >
      <h1 style={{ marginBottom: 8 }}>Kids Task List + Rewards</h1>
      <p style={{ marginTop: 0 }}>
        Kids complete tasks to earn points. Parents add tasks and rewards.
      </p>

      {error && (
        <div
          style={{
            border: "1px solid #ffb3b3",
            background: "#2a0f0f",
            padding: 12,
            borderRadius: 10,
            marginBottom: 16,
          }}
        >
          <strong style={{ color: "#ff6b6b" }}>Error</strong>
          <pre
            style={{
              margin: "8px 0 0",
              whiteSpace: "pre-wrap",
              color: "#ffb3b3",
            }}
          >
            {error}
          </pre>
        </div>
      )}

      {/* ✅ Header row */}
      <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 18 }}>
        <div>
          <strong>Viewing Kid ID:</strong> {effectiveKidId}{" "}
          <span style={{ opacity: 0.7 }}>({auth?.activeRole ?? "Unknown"})</span>
        </div>

        <div style={{ marginLeft: "auto", display: "flex", gap: 12, alignItems: "center" }}>
          <div style={{ padding: "8px 12px", border: "1px solid #eee", borderRadius: 10 }}>
            <strong>Points:</strong> {points}
          </div>

          <Link to="/select-kid" style={{ textDecoration: "underline" }}>
            Select Kid
          </Link>
        </div>
      </div>

      {/* Tasks */}
      <div style={{ border: "1px solid #eee", borderRadius: 12, padding: 14, marginBottom: 18 }}>
        <h2 style={{ marginTop: 0 }}>Tasks</h2>

        {tasks.length === 0 ? (
          <p>No tasks yet for this kid.</p>
        ) : (
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {tasks.map((t) => (
<li
  key={t.id}
  style={{
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: 10,
    borderBottom: "1px solid #f1f1f1",
  }}
>
  {/* Left side */}
  <div style={{ flex: 1 }}>
    {editingTaskId === t.id ? (
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <input
          value={editTaskTitle}
          onChange={(e) => setEditTaskTitle(e.target.value)}
          style={{ padding: 6, borderRadius: 8, border: "1px solid #ccc", flex: 1 }}
        />
        <input
          type="number"
          value={editTaskPoints}
          onChange={(e) => setEditTaskPoints(Number(e.target.value))}
          min={0}
          style={{ padding: 6, borderRadius: 8, border: "1px solid #ccc", width: 90 }}
        />
      </div>
    ) : (
      <span style={{ textDecoration: t.isComplete ? "line-through" : "none" }}>
        {t.title} <span style={{ opacity: 0.7 }}>({t.points} pts)</span>
      </span>
    )}
  </div>

  {/* Right side actions */}
{!!auth?.parentToken ? (
    editingTaskId === t.id ? (
      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={() => onSaveTask(t.id)} style={{ padding: "6px 10px", borderRadius: 8 }}>
          Save
        </button>
        <button onClick={cancelEditTask} style={{ padding: "6px 10px", borderRadius: 8 }}>
          Cancel
        </button>
      </div>
    ) : (
      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={() => startEditTask(t)} style={{ padding: "6px 10px", borderRadius: 8 }}>
          Edit
        </button>
        <button onClick={() => onDeleteTask(t.id)} style={{ padding: "6px 10px", borderRadius: 8 }}>
          Delete
        </button>
      </div>
    )
  ) : t.isComplete ? (
    <span style={{ fontSize: 12, opacity: 0.7 }}>Completed</span>
  ) : (
    <button onClick={() => onCompleteTask(t.id)} style={{ padding: "6px 10px", borderRadius: 8 }}>
      Complete
    </button>
  )}
</li>

            ))}
          </ul>
        )}
      </div>

      {/* Rewards */}
      <div style={{ border: "1px solid #eee", borderRadius: 12, padding: 14, marginBottom: 18 }}>
        <h2 style={{ marginTop: 0 }}>Rewards</h2>

        {rewards.length === 0 ? (
          <p>No rewards yet.</p>
        ) : (
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {rewards.map((r) => (
<li
  key={r.id}
  style={{
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: 10,
    borderBottom: "1px solid #f1f1f1",
  }}
>
  <div style={{ flex: 1 }}>
    {editingRewardId === r.id ? (
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <input
          value={editRewardName}
          onChange={(e) => setEditRewardName(e.target.value)}
          style={{ padding: 6, borderRadius: 8, border: "1px solid #ccc", flex: 1 }}
        />
        <input
          type="number"
          value={editRewardCost}
          onChange={(e) => setEditRewardCost(Number(e.target.value))}
          min={0}
          style={{ padding: 6, borderRadius: 8, border: "1px solid #ccc", width: 90 }}
        />
      </div>
    ) : (
      <span>
        {r.name} <span style={{ opacity: 0.7 }}>({r.cost} pts)</span>
      </span>
    )}
  </div>

  {!!auth?.parentToken ? (
    editingRewardId === r.id ? (
      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={() => onSaveReward(r.id)} style={{ padding: "6px 10px", borderRadius: 8 }}>
          Save
        </button>
        <button onClick={cancelEditReward} style={{ padding: "6px 10px", borderRadius: 8 }}>
          Cancel
        </button>
      </div>
    ) : (
      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={() => startEditReward(r)} style={{ padding: "6px 10px", borderRadius: 8 }}>
          Edit
        </button>
        <button onClick={() => onDeleteReward(r.id)} style={{ padding: "6px 10px", borderRadius: 8 }}>
          Delete
        </button>
      </div>
    )
  ) : (
    <button
      disabled={points < r.cost}
      onClick={() => onRedeem(r.id)}
      style={{ padding: "6px 10px", borderRadius: 8 }}
    >
      Redeem
    </button>
  )}
</li>

            ))}
          </ul>
        )}
      </div>

      {/* Parent admin (only show if Parent is active) */}
      {!!auth?.parentToken && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div style={{ border: "1px solid #eee", borderRadius: 12, padding: 14 }}>
            <h3 style={{ marginTop: 0 }}>Parent: Create Task</h3>
            <form onSubmit={onCreateTask} style={{ display: "grid", gap: 10 }}>
              <input
                value={taskTitle}
                onChange={(e) => setTaskTitle(e.target.value)}
                placeholder="Task title (e.g., Brush teeth)"
                style={{ padding: 8, borderRadius: 8, border: "1px solid #ccc" }}
              />
              <input
                type="number"
                value={taskPoints}
                onChange={(e) => setTaskPoints(Number(e.target.value))}
                min={0}
                style={{ padding: 8, borderRadius: 8, border: "1px solid #ccc" }}
              />
              <button type="submit" style={{ padding: "8px 12px", borderRadius: 8 }}>
                Add Task for Current Kid
              </button>
            </form>
          </div>

          <div style={{ border: "1px solid #eee", borderRadius: 12, padding: 14 }}>
            <h3 style={{ marginTop: 0 }}>Parent: Create Reward</h3>
            <form onSubmit={onCreateReward} style={{ display: "grid", gap: 10 }}>
              <input
                value={rewardName}
                onChange={(e) => setRewardName(e.target.value)}
                placeholder="Reward name (e.g., 30 mins game time)"
                style={{ padding: 8, borderRadius: 8, border: "1px solid #ccc" }}
              />
              <input
                type="number"
                value={rewardCost}
                onChange={(e) => setRewardCost(Number(e.target.value))}
                min={0}
                style={{ padding: 8, borderRadius: 8, border: "1px solid #ccc" }}
              />
              <button type="submit" style={{ padding: "8px 12px", borderRadius: 8 }}>
                Add Reward
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
