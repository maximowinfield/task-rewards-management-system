import axios from "axios";
import type {
  KidProfile,
  KidTask,
  Reward,
  PointsResponse,
  CreateTaskRequest,
  CreateRewardRequest,
} from "./types";

// ============================================================
// api.ts (Frontend API Client)
// - Central place for all HTTP calls to the backend.
// - Uses one shared axios instance so configuration is consistent.
// - Automatically attaches the correct JWT (Parent or Kid).
// ============================================================

/**
 * Base URL for the API.
 *
 * Production:
 * - When frontend and backend share the same origin, "/api" is sufficient.
 *
 * Development:
 * - VITE_API_URL can be set to a full URL such as "http://localhost:5000/api".
 */
export const API_URL = import.meta.env.VITE_API_URL || "/api";

/**
 * One shared axios instance.
 *
 * Why:
 * - Keeps baseURL, interceptors, and headers consistent.
 * - Ensures all requests flow through the same configuration.
 */
export const api = axios.create({
  baseURL: API_URL,
});

/**
 * Request interceptor.
 *
 * Purpose:
 * - Attaches the Authorization header before every request.
 * - Reads tokens directly from localStorage so refreshes and mobile restores
 *   still send authenticated requests even before React state hydrates.
 *
 * Token selection:
 * - Uses activeRole if present (true auth role).
 * - Falls back to uiMode if activeRole is not available.
 * - Chooses kidToken or parentToken accordingly.
 */
api.interceptors.request.use((config) => {
  try {
    const raw = localStorage.getItem("kidsrewards.auth.v1");
    if (raw) {
      const parsed = JSON.parse(raw);

      const role = parsed?.activeRole ?? parsed?.uiMode;
      const token =
        role === "Kid"
          ? parsed?.kidToken
          : parsed?.parentToken;

      if (token) {
        config.headers = config.headers ?? {};
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
  } catch {
    // Ignore storage or parsing errors
  }

  return config;
});

/**
 * setApiToken
 *
 * Used by AuthContext after login/logout to immediately
 * set or clear the Authorization header.
 */
export function setApiToken(token?: string) {
  if (token) {
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common.Authorization;
  }
}

/**
 * setApiRoleToken
 *
 * Convenience helper that selects the correct token
 * based on the active role.
 */
export function setApiRoleToken(role: "Kid" | "Parent", auth: any) {
  const token = role === "Kid" ? auth?.kidToken : auth?.parentToken;
  setApiToken(token);
}

/* ============================================================
   AUTH
   ============================================================ */

export type ParentLoginRequest = {
  username: string;
  password: string;
};

export type ParentLoginResponse = {
  token: string;
  role: "Parent";
};

export const parentLogin = async (payload: ParentLoginRequest) =>
  (await api.post<ParentLoginResponse>("/parent/login", payload)).data;

/* ============================================================
   KIDS
   ============================================================ */

export const getKids = async () =>
  (await api.get<KidProfile[]>("/kids")).data;

/* ============================================================
   TASKS
   ============================================================ */

export const getTasks = async (kidId: string) =>
  (await api.get<KidTask[]>("/tasks", { params: { kidId } })).data;

export const completeTask = async (id: number) =>
  (await api.put<KidTask>(`/tasks/${id}/complete`)).data;

export const createTask = async (payload: CreateTaskRequest) =>
  (await api.post<KidTask>("/tasks", payload)).data;

export type UpdateTaskRequest = {
  title?: string;
  points?: number;
  assignedKidId?: string;
};

export const updateTask = async (id: number, payload: UpdateTaskRequest) =>
  (await api.put<KidTask>(`/tasks/${id}`, payload)).data;

export const deleteTask = async (id: number) =>
  (await api.delete(`/tasks/${id}`)).data;

/* ============================================================
   POINTS
   ============================================================ */

export const getPoints = async (kidId: string) =>
  (await api.get<PointsResponse>("/points", { params: { kidId } })).data;

/* ============================================================
   REWARDS
   ============================================================ */

export const getRewards = async () =>
  (await api.get<Reward[]>("/rewards")).data;

export const redeemReward = async (rewardId: number) =>
  (await api.post(`/rewards/${rewardId}/redeem`)).data;

export const createReward = async (payload: CreateRewardRequest) =>
  (await api.post<Reward>("/rewards", payload)).data;

export type UpdateRewardRequest = {
  name?: string;
  cost?: number;
};

export const updateReward = async (id: number, payload: UpdateRewardRequest) =>
  (await api.put<Reward>(`/rewards/${id}`, payload)).data;

export const deleteReward = async (id: number) =>
  (await api.delete(`/rewards/${id}`)).data;

/* ============================================================
   KID SESSION
   ============================================================ */

export type KidSessionRequest = {
  kidId: string;
};

export type KidSessionResponse = {
  token: string;
  role: "Kid";
  kidId: string;
  displayName: string;
};

export const startKidSession = async (payload: KidSessionRequest) =>
  (await api.post<KidSessionResponse>("/kid-session", payload)).data;
