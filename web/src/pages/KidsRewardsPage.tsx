import { useEffect, useState } from "react";
import type { KidProfile, KidTask, Reward } from "../types";
import {
  getKids,
  getTasks,
  getPoints,
  completeTask,
  getRewards,
  redeemReward,
  createTask,
  createReward,
} from "../api";

export default function KidsRewardsPage() {
  const [kids, setKids] = useState<KidProfile[]>([]);
  const [selectedKidId, setSelectedKidId] = useState<string>("");

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

  async function loadAll(kidId: string) {
    try {
      const [t, p, r] = await Promise.all([
        getTasks(kidId),
        getPoints(kidId),
        getRewards(),
      ]);

      setTasks(t);
      setPoints(p.points);
      setRewards(r);
    } catch (e: any) {
      console.error("loadAll failed:", e);
      setError(e?.message ?? String(e));
    }
  }

  useEffect(() => {
    (async () => {
      try {
        setError(null);
        const k = await getKids();
        setKids(k);

        const defaultKidId = k[0]?.id ?? "";
        setSelectedKidId(defaultKidId);

        if (defaultKidId) {
          await loadAll(defaultKidId);
        }
      } catch (e: any) {
        console.error("initial load failed:", e);
        setError(e?.message ?? String(e));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (!selectedKidId) return;
    (async () => {
      setError(null);
      await loadAll(selectedKidId);
    })();
  }, [selectedKidId]);

  async function onCompleteTask(id: number) {
    try {
      setError(null);
      await completeTask(id);
      await loadAll(selectedKidId);
    } catch (e: any) {
      console.error("completeTask failed:", e);
      setError(e?.message ?? String(e));
    }
  }

  async function onRedeem(rewardId: number) {
    try {
      setError(null);
      await redeemReward(rewardId, selectedKidId);
      await loadAll(selectedKidId);
    } catch (e: any) {
      console.error("redeemReward failed:", e);
      setError(e?.message ?? String(e));
    }
  }

  async function onCreateTask(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedKidId) return;

    const title = taskTitle.trim();
    if (!title) return;

    try {
      setError(null);
      await createTask({
        title,
        points: Number(taskPoints) || 0,
        assignedKidId: selectedKidId,
      });
      setTaskTitle("");
      await loadAll(selectedKidId);
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
      await loadAll(selectedKidId);
    } catch (e: any) {
      console.error("createReward failed:", e);
      setError(e?.message ?? String(e));
    }
  }

  if (loading) return <p style={{ fontFamily: "system-ui" }}>Loading…</p>;

  return (
    <div style={{ maxWidth: 860, margin: "40px auto", padding: 16, fontFamily: "system-ui" }}>
      <h1 style={{ marginBottom: 8 }}>Kids Task List + Rewards</h1>
      <p style={{ marginTop: 0 }}>
        Kids complete tasks to earn points. Parents add tasks and rewards.
      </p>

      {error && (
        <div style={{ border: "1px solid #ffb3b3", background: "#2a0f0f", padding: 12, borderRadius: 10, marginBottom: 16 }}>
          <strong style={{ color: "#ff6b6b" }}>Error</strong>
          <pre style={{ margin: "8px 0 0", whiteSpace: "pre-wrap", color: "#ffb3b3" }}>{error}</pre>
        </div>
      )}

      {/* Kid selector */}
      <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 18 }}>
        <label>
          <strong>Select kid:</strong>{" "}
          <select
            value={selectedKidId}
            onChange={(e) => setSelectedKidId(e.target.value)}
            style={{ padding: 8, borderRadius: 8, border: "1px solid #ccc" }}
          >
            {kids.map((k) => (
              <option key={k.id} value={k.id}>
                {k.displayName}
              </option>
            ))}
          </select>
        </label>

        <div style={{ marginLeft: "auto", padding: "8px 12px", border: "1px solid #eee", borderRadius: 10 }}>
          <strong>Points:</strong> {points}
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
                <span style={{ flex: 1, textDecoration: t.isComplete ? "line-through" : "none" }}>
                  {t.title} <span style={{ opacity: 0.7 }}>({t.points} pts)</span>
                </span>

                {t.isComplete ? (
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
                <span style={{ flex: 1 }}>
                  {r.name} <span style={{ opacity: 0.7 }}>({r.cost} pts)</span>
                </span>

                <button
                  disabled={points < r.cost}
                  onClick={() => onRedeem(r.id)}
                  style={{ padding: "6px 10px", borderRadius: 8 }}
                >
                  Redeem
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Parent admin */}
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
              Add Task for Selected Kid
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
    </div>
  );
}
