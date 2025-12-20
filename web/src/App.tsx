import { Link, Routes, Route, Navigate } from "react-router-dom";
import KidsRewardsPage from "./pages/KidsRewardsPage";
import TodosPage from "./pages/TodosPage";
import Login from "./pages/Login";
import SelectKid from "./pages/SelectKid";
import RequireRole from "./components/RequireRole";
import KidDashboard from "./components/KidDashboard";
import { useAuth } from "./context/AuthContext";

export default function App() {
  const { auth, setAuth } = useAuth();

  const isParent = !!auth?.parentToken;
const isAuthed = !!auth.parentToken;
const isKidMode = auth.activeRole === "Kid";
const isParentMode = auth.activeRole === "Parent";


  // Option A: kidId in the URL
  const parentKidId = auth?.selectedKidId;

  function clearAuth() {
  setAuth({
    parentToken: null,
    activeRole: null,
    kidId: undefined,
    kidName: undefined,
    selectedKidId: undefined,
    selectedKidName: undefined,
  });
}


function switchToParent() {
  setAuth((prev) => (prev.parentToken ? { ...prev, activeRole: "Parent" } : prev));
}
}