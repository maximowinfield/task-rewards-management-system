import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getKids, startKidSession } from "../api";

export default function SelectKid() {
  const { auth, setAuth } = useAuth();
  const navigate = useNavigate();
  const [kids, setKids] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const data = await getKids();
        setKids(data);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  function setCurrentKid(kidId: string, kidName: string) {
    // ✅ Parent selection (NOT kid session)
    setAuth((prev: any) => ({
      ...prev,
      selectedKidId: kidId,
      selectedKidName: kidName,
      activeRole: "Parent",
    }));

    navigate(`/parent/kids/${kidId}`, { replace: true });
  }

  async function enterKidMode(kidId: string) {
    // Must be a Parent token active for this endpoint
    setAuth((prev: any) => ({ ...prev, activeRole: "Parent" }));

    const data = await startKidSession({ kidId });

    setAuth((prev: any) => ({
      ...prev,
      kidToken: data.token,
      kidId: data.kidId,
      kidName: data.displayName,

      // optional but helpful: remember what kid parent was viewing
      selectedKidId: data.kidId,
      selectedKidName: data.displayName,

      activeRole: "Kid",
    }));

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

              {/* ✅ Parent action */}
              <button onClick={() => setCurrentKid(k.id, k.displayName)}>
                View as Parent
              </button>

              {/* ✅ Kid action */}
              <button onClick={() => enterKidMode(k.id)}>Enter Kid Mode</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
