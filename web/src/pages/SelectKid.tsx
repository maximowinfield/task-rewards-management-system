import { useAuth } from "../context/AuthContext";
import { startKidSession } from "../api";

export default function SelectKid() {
  const { auth, setAuth } = useAuth();

  async function enterKidMode(kidId: string, displayName: string) {
    try {
      const data = await startKidSession({ kidId });

      setAuth({
        token: data.token,
        role: "Kid",
        kidName: displayName,
      });
    } catch (err: any) {
      alert(err?.message || "Failed to enter kid mode");
    }
  }

  return (
    <div>
      <h2>Select Kid</h2>

      <button onClick={() => enterKidMode("kid-1", "Kid 1")}>
        Kid 1
      </button>

      <button onClick={() => enterKidMode("kid-2", "Kid 2")}>
        Kid 2
      </button>
    </div>
  );
}
