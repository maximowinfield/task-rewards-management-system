import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getKids } from "../api";
import { KidProfile } from "../types";

export default function SelectKid() {
  const { auth, setAuth, enterKidMode, enterParentMode } = useAuth();
  const navigate = useNavigate();
  const [kids, setKids] = useState<KidProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        // Ensure we're in Parent mode before fetching kids
        enterParentMode();
        const data = await getKids();
        setKids(data);
      } finally {
        setLoading(false);
      }
    })();
  }, [enterParentMode]);

  function setCurrentKid(kidId: string, kidName: string) {
    // Parent selection only (no kid session)
    setAuth((prev) => ({
      ...prev,
      selectedKidId: kidId,
      selectedKidName: kidName,
      uiMode: "Parent",
      activeRole: "Parent",
    }));

    navigate(`/parent/kids/${kidId}`, { replace: true });
  }

  async function goKidMode(kidId: string) {
    await enterKidMode(kidId); // ✅ calls /api/kid-session and stores kidToken
    navigate("/kid", { replace: true });
  }

  return (
    <div style={{ maxWidth: 860, margin: "24px auto", padding: "0 16px" }}>
      <h2>Select Kid</h2>

      <p>
        Active role: <strong>{auth?.activeRole ?? "none"}</strong>
      </p>
      <p>
        Current kid: <strong>{auth?.kidName ?? "(none)"}</strong>
      </p>

      {loading ? (
        <p>Loading kids...</p>
      ) : (
        <div style={{ display: "grid", gap: 10 }}>
          {kids.map((k) => (
            <div
              key={k.id}
              style={{
                display: "flex",
                gap: 8,
                alignItems: "center",
                border: "1px solid #333",
                borderRadius: 10,
                padding: 10,
              }}
            >
              <div style={{ flex: 1 }}>
                <strong>{k.displayName}</strong>
                <div style={{ fontSize: 12, opacity: 0.8 }}>{k.id}</div>
              </div>

              <button onClick={() => setCurrentKid(k.id, k.displayName)}>
                View as Parent
              </button>

              <button onClick={() => void goKidMode(k.id)}>
                Enter Kid Mode
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
