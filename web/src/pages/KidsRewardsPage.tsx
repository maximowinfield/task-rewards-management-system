import { useEffect, useMemo, useState } from "react";
import { Link, useParams, Navigate, useNavigate } from "react-router-dom";
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
import type React from "react";
import KidSelector from "../components/KidSelector";
import type { KidProfile } from "../types";
import { getKids } from "../api";




export default function KidsRewardsPage() {
  const { auth, setAuth } = useAuth();
  const { kidId } = useParams<{ kidId: string }>();

  const navigate = useNavigate();
  const [kids, setKids] = useState<KidProfile[]>([]);
  const [selectedKidId, setSelectedKidId] = useState<string>(auth?.selectedKidId ?? "");
  const isKidMode = auth?.uiMode === "Kid";
  const isParentMode = auth?.uiMode === "Parent";



    // ✅ Simple light/dark palette (fixes invisible light-mode styling)
  const isDark =
    typeof window !== "undefined" &&
    window.matchMedia &&
    window.matchMedia("(prefers-color-scheme: dark)").matches;

const ui = {
  bg: isDark ? "#0b0f19" : "#f8fafc",       // ⬅ softer light bg
  text: isDark ? "#e5e7eb" : "#0f172a",
  card: isDark ? "#0f172a" : "#ffffff",
  border: isDark ? "#1e293b" : "#e2e8f0",  // ⬅ lighter borders
  subtleText: isDark ? "#94a3b8" : "#64748b",
  link: isDark ? "#93c5fd" : "#2563eb",
  buttonBg: isDark ? "#020617" : "#ffffff",
  buttonText: isDark ? "#e5e7eb" : "#0f172a",
  dangerBg: isDark ? "#3a1212" : "#fee2e2",
  dangerText: isDark ? "#fecaca" : "#991b1b",
};


useEffect(() => {
  (async () => {
    try {
      // only load kids if parent is logged in
      if (!auth?.parentToken) return;

      const list = await getKids(); // must return KidProfile[]
      setKids(list);

      // default selection: auth selection OR first kid
      if (!selectedKidId && list.length > 0) {
        const first = String(list[0].id);
        setSelectedKidId(first);
        setAuth((prev: any) => ({ ...prev, selectedKidId: first, selectedKidName: list[0].displayName }));
      }
    } catch (e) {
      console.error("getKids failed", e);
    }
  })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [auth?.parentToken]);


  useEffect(() => {
  if (auth?.selectedKidId) setSelectedKidId(auth.selectedKidId);
}, [auth?.selectedKidId]);


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


if (!effectiveKidId) {
  setLoading(false);
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

  async function onCreateTask(e: React.FormEvent<HTMLFormElement>) {
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

if (!effectiveKidId) {
  return (
    <div
      style={{
        maxWidth: 860,
        margin: "40px auto",
        padding: 16,
        fontFamily: "system-ui",
        background: ui.bg,
        color: ui.text,
        minHeight: "60vh",
      }}
    >
      <h1 style={{ marginBottom: 8 }}>Kids + Rewards</h1>
      <p style={{ marginTop: 0, color: ui.subtleText }}>
        Pick a kid to continue.
      </p>

      <div
        style={{
          border: `1px solid ${ui.border}`,
          borderRadius: 12,
          padding: 14,
          background: ui.card,
          display: "flex",
          gap: 12,
          alignItems: "center",
          marginTop: 16,
          boxShadow: isDark
            ? "0 0 0 rgba(0,0,0,0)"
            : "0 1px 3px rgba(15, 23, 42, 0.08)",
        }}
      >
        <div style={{ minWidth: 120, fontWeight: 600 }}>Select Kid:</div>

        {kids.length === 0 ? (
          <span style={{ color: ui.subtleText }}>No kids found.</span>
        ) : (
          <KidSelector
            kids={kids}
            selectedKidId={selectedKidId || String(kids[0].id)}
            onChange={(newKidId) => {
              setSelectedKidId(newKidId);

              const kid = kids.find((k) => String(k.id) === String(newKidId));

              setAuth((prev: any) => ({
                ...prev,
                selectedKidId: newKidId,
                selectedKidName: kid?.displayName,
              }));

              navigate(`/parent/kids/${newKidId}`, { replace: true });
            }}
          />
        )}

        {kids.length > 0 && (
          <button
            style={{
              marginLeft: "auto",
              padding: "8px 12px",
              borderRadius: 10,
              cursor: "pointer",
              border: `1px solid ${ui.border}`,
              background: ui.buttonBg,
              color: ui.buttonText,
            }}
            onClick={() =>
              navigate(`/parent/kids/${selectedKidId || String(kids[0].id)}`, {
                replace: true,
              })
            }
          >
            Continue
          </button>
        )}
      </div>
    </div>
  );
}



return (
  <div
    style={{
      minHeight: "calc(100vh - 80px)",
      background: ui.bg,
      color: ui.text,
      padding: "32px 16px",
    }}
  >
        {/* 2️⃣ Content container (centered, max width) */}
    <div style={{ maxWidth: 980, margin: "0 auto", fontFamily: "system-ui" }}>
      {/* Error banner */}
      {error && (
        <div
          style={{
            border: `1px solid ${ui.dangerText}`,
            background: ui.dangerBg,
            padding: 12,
            borderRadius: 12,
            marginBottom: 16,
          }}
        >
          <strong style={{ color: ui.dangerText }}>Error</strong>
          <pre
            style={{
              margin: "8px 0 0",
              whiteSpace: "pre-wrap",
              color: ui.dangerText,
            }}
          >
            {error}
          </pre>
        </div>
      )}

      {/* Header row */}
      <div
        style={{
          display: "flex",
          gap: 12,
          alignItems: "center",
          marginBottom: 18,
          padding: 14,
          borderRadius: 14,
          border: `1px solid ${ui.border}`,
          background: ui.card,
          boxShadow: isDark
            ? "0 0 0 rgba(0,0,0,0)"
            : "0 1px 3px rgba(15, 23, 42, 0.08)",
        }}
      >
        <div style={{ display: "grid", gap: 4 }}>
          <div style={{ fontSize: 20, fontWeight: 800 }}>Kids + Rewards</div>
          <div style={{ color: ui.subtleText, fontSize: 13 }}>
            Viewing Kid ID: <strong style={{ color: ui.text }}>{effectiveKidId}</strong>{" "}
            • Mode: <strong style={{ color: ui.text }}>{auth?.uiMode ?? "Kid"}</strong>
          </div>
        </div>

        <div style={{ marginLeft: "auto", display: "flex", gap: 12, alignItems: "center" }}>
          <div
            style={{
              padding: "8px 12px",
              border: `1px solid ${ui.border}`,
              borderRadius: 12,
              background: ui.buttonBg,
              color: ui.buttonText,
              fontWeight: 700,
            }}
          >
            Points: {points}
          </div>

          <button
            onClick={() => navigate("/parent/kids", { replace: true })}
            style={{
              border: `1px solid ${ui.border}`,
              background: ui.buttonBg,
              color: ui.buttonText,
              borderRadius: 12,
              padding: "8px 12px",
              cursor: "pointer",
              fontWeight: 700,
            }}
          >
            Change Kid
          </button>
        </div>
      </div>

      {/* Tasks card */}
      <div
        style={{
          border: `1px solid ${ui.border}`,
          borderRadius: 14,
          padding: 16,
          marginBottom: 18,
          background: ui.card,
          boxShadow: isDark
            ? "0 0 0 rgba(0,0,0,0)"
            : "0 1px 3px rgba(15, 23, 42, 0.08)",
        }}
      >
        <h2 style={{ marginTop: 0, marginBottom: 10 }}>Tasks</h2>

        {tasks.length === 0 ? (
          <p style={{ color: ui.subtleText }}>No tasks yet for this kid.</p>
        ) : (
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {tasks.map((t) => (
              <li
                key={t.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: 12,
                  borderBottom: `1px solid ${ui.border}`,
                }}
              >
                <div style={{ flex: 1 }}>
                  {editingTaskId === t.id ? (
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <input
                        value={editTaskTitle}
                        onChange={(e) => setEditTaskTitle(e.target.value)}
                        style={{
                          padding: 10,
                          borderRadius: 10,
                          border: `1px solid ${ui.border}`,
                          background: ui.bg,
                          color: ui.text,
                          flex: 1,
                        }}
                      />
                      <input
                        type="number"
                        value={editTaskPoints}
                        onChange={(e) => setEditTaskPoints(Number(e.target.value))}
                        min={0}
                        style={{
                          padding: 10,
                          borderRadius: 10,
                          border: `1px solid ${ui.border}`,
                          background: ui.bg,
                          color: ui.text,
                          width: 110,
                        }}
                      />
                    </div>
                  ) : (
                    <span style={{ textDecoration: t.isComplete ? "line-through" : "none" }}>
                      {t.title}{" "}
                      <span style={{ color: ui.subtleText }}>({t.points} pts)</span>
                    </span>
                  )}
                </div>

                {/* Kid-visible action: Complete */}
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  {t.isComplete ? (
                    <span style={{ fontSize: 12, color: ui.subtleText }}>Completed</span>
                  ) : (
                    <button
                      onClick={() => onCompleteTask(t.id)}
                      style={{
                        padding: "8px 12px",
                        borderRadius: 10,
                        border: `1px solid ${ui.border}`,
                        background: ui.buttonBg,
                        color: ui.buttonText,
                        cursor: "pointer",
                        fontWeight: 700,
                      }}
                    >
                      Complete
                    </button>
                  )}

                  {/* Parent-only actions */}
                  {isParentMode &&
                    (editingTaskId === t.id ? (
                      <>
                        <button
                          onClick={() => onSaveTask(t.id)}
                          style={{
                            padding: "8px 12px",
                            borderRadius: 10,
                            border: `1px solid ${ui.border}`,
                            background: ui.buttonBg,
                            color: ui.buttonText,
                            cursor: "pointer",
                            fontWeight: 700,
                          }}
                        >
                          Save
                        </button>
                        <button
                          onClick={cancelEditTask}
                          style={{
                            padding: "8px 12px",
                            borderRadius: 10,
                            border: `1px solid ${ui.border}`,
                            background: ui.buttonBg,
                            color: ui.buttonText,
                            cursor: "pointer",
                            fontWeight: 700,
                          }}
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => startEditTask(t)}
                          style={{
                            padding: "8px 12px",
                            borderRadius: 10,
                            border: `1px solid ${ui.border}`,
                            background: ui.buttonBg,
                            color: ui.buttonText,
                            cursor: "pointer",
                            fontWeight: 700,
                          }}
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => onDeleteTask(t.id)}
                          style={{
                            padding: "8px 12px",
                            borderRadius: 10,
                            border: `1px solid ${ui.border}`,
                            background: ui.dangerBg,
                            color: ui.dangerText,
                            cursor: "pointer",
                            fontWeight: 700,
                          }}
                        >
                          Delete
                        </button>
                      </>
                    ))}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Rewards card */}
      <div
        style={{
          border: `1px solid ${ui.border}`,
          borderRadius: 14,
          padding: 16,
          marginBottom: 18,
          background: ui.card,
          boxShadow: isDark
            ? "0 0 0 rgba(0,0,0,0)"
            : "0 1px 3px rgba(15, 23, 42, 0.08)",
        }}
      >
        <h2 style={{ marginTop: 0, marginBottom: 10 }}>Rewards</h2>

        {rewards.length === 0 ? (
          <p style={{ color: ui.subtleText }}>No rewards yet.</p>
        ) : (
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {rewards.map((r) => (
              <li
                key={r.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: 12,
                  borderBottom: `1px solid ${ui.border}`,
                }}
              >
                <div style={{ flex: 1 }}>
                  {editingRewardId === r.id ? (
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <input
                        value={editRewardName}
                        onChange={(e) => setEditRewardName(e.target.value)}
                        style={{
                          padding: 10,
                          borderRadius: 10,
                          border: `1px solid ${ui.border}`,
                          background: ui.bg,
                          color: ui.text,
                          flex: 1,
                        }}
                      />
                      <input
                        type="number"
                        value={editRewardCost}
                        onChange={(e) => setEditRewardCost(Number(e.target.value))}
                        min={0}
                        style={{
                          padding: 10,
                          borderRadius: 10,
                          border: `1px solid ${ui.border}`,
                          background: ui.bg,
                          color: ui.text,
                          width: 110,
                        }}
                      />
                    </div>
                  ) : (
                    <span>
                      {r.name} <span style={{ color: ui.subtleText }}>({r.cost} pts)</span>
                    </span>
                  )}
                </div>

                {isParentMode ? (
                  editingRewardId === r.id ? (
                    <div style={{ display: "flex", gap: 8 }}>
                      <button
                        onClick={() => onSaveReward(r.id)}
                        style={{
                          padding: "8px 12px",
                          borderRadius: 10,
                          border: `1px solid ${ui.border}`,
                          background: ui.buttonBg,
                          color: ui.buttonText,
                          cursor: "pointer",
                          fontWeight: 700,
                        }}
                      >
                        Save
                      </button>
                      <button
                        onClick={cancelEditReward}
                        style={{
                          padding: "8px 12px",
                          borderRadius: 10,
                          border: `1px solid ${ui.border}`,
                          background: ui.buttonBg,
                          color: ui.buttonText,
                          cursor: "pointer",
                          fontWeight: 700,
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: "flex", gap: 8 }}>
                      <button
                        onClick={() => startEditReward(r)}
                        style={{
                          padding: "8px 12px",
                          borderRadius: 10,
                          border: `1px solid ${ui.border}`,
                          background: ui.buttonBg,
                          color: ui.buttonText,
                          cursor: "pointer",
                          fontWeight: 700,
                        }}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => onDeleteReward(r.id)}
                        style={{
                          padding: "8px 12px",
                          borderRadius: 10,
                          border: `1px solid ${ui.border}`,
                          background: ui.dangerBg,
                          color: ui.dangerText,
                          cursor: "pointer",
                          fontWeight: 700,
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  )
                ) : (
                  <button
                    disabled={points < r.cost}
                    onClick={() => onRedeem(r.id)}
                    style={{
                      padding: "8px 12px",
                      borderRadius: 10,
                      border: `1px solid ${ui.border}`,
                      background: ui.buttonBg,
                      color: ui.buttonText,
                      cursor: points < r.cost ? "not-allowed" : "pointer",
                      fontWeight: 700,
                      opacity: points < r.cost ? 0.5 : 1,
                    }}
                  >
                    Redeem
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Parent admin */}
      {isParentMode && !!auth?.parentToken && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div
            style={{
              border: `1px solid ${ui.border}`,
              borderRadius: 14,
              padding: 16,
              background: ui.card,
              boxShadow: isDark
            ? "0 0 0 rgba(0,0,0,0)"
            : "0 1px 3px rgba(15, 23, 42, 0.08)",
            }}
          >
            <h3 style={{ marginTop: 0 }}>Parent: Create Task</h3>
            <form onSubmit={onCreateTask} style={{ display: "grid", gap: 10 }}>
              <input
                value={taskTitle}
                onChange={(e) => setTaskTitle(e.target.value)}
                placeholder="Task title (e.g., Brush teeth)"
                style={{
                  padding: 10,
                  borderRadius: 10,
                  border: `1px solid ${ui.border}`,
                  background: ui.bg,
                  color: ui.text,
                }}
              />
              <input
                type="number"
                value={taskPoints}
                onChange={(e) => setTaskPoints(Number(e.target.value))}
                min={0}
                style={{
                  padding: 10,
                  borderRadius: 10,
                  border: `1px solid ${ui.border}`,
                  background: ui.bg,
                  color: ui.text,
                }}
              />
              <button
                type="submit"
                style={{
                  padding: "10px 12px",
                  borderRadius: 10,
                  border: `1px solid ${ui.border}`,
                  background: ui.buttonBg,
                  color: ui.buttonText,
                  cursor: "pointer",
                  fontWeight: 800,
                }}
              >
                Add Task
              </button>
            </form>
          </div>

          <div
            style={{
              border: `1px solid ${ui.border}`,
              borderRadius: 14,
              padding: 16,
              background: ui.card,
              boxShadow: isDark
            ? "0 0 0 rgba(0,0,0,0)"
            : "0 1px 3px rgba(15, 23, 42, 0.08)",
            }}
          >
            <h3 style={{ marginTop: 0 }}>Parent: Create Reward</h3>
            <form onSubmit={onCreateReward} style={{ display: "grid", gap: 10 }}>
              <input
                value={rewardName}
                onChange={(e) => setRewardName(e.target.value)}
                placeholder="Reward name (e.g., 30 mins game time)"
                style={{
                  padding: 10,
                  borderRadius: 10,
                  border: `1px solid ${ui.border}`,
                  background: ui.bg,
                  color: ui.text,
                }}
              />
              <input
                type="number"
                value={rewardCost}
                onChange={(e) => setRewardCost(Number(e.target.value))}
                min={0}
                style={{
                  padding: 10,
                  borderRadius: 10,
                  border: `1px solid ${ui.border}`,
                  background: ui.bg,
                  color: ui.text,
                }}
              />
              <button
                type="submit"
                style={{
                  padding: "10px 12px",
                  borderRadius: 10,
                  border: `1px solid ${ui.border}`,
                  background: ui.buttonBg,
                  color: ui.buttonText,
                  cursor: "pointer",
                  fontWeight: 800,
                }}
              >
                Add Reward
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  </div>
);
}
