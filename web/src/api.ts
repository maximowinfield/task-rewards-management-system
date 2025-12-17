import axios from "axios";
import type {
  KidProfile,
  KidTask,
  Reward,
  PointsResponse,
  CreateTaskRequest,
  CreateRewardRequest
} from "./types";

export const API_URL =
  import.meta.env.VITE_API_URL ?? "http://localhost:5000";

const api = axios.create({
  baseURL: API_URL,
});


export const getKids = async () =>
  (await api.get<KidProfile[]>("/api/kids")).data;

export const getTasks = async (kidId: string) =>
  (await api.get<KidTask[]>("/api/tasks", { params: { kidId } })).data;

export const completeTask = async (id: number) =>
  (await api.put<KidTask>(`/api/tasks/${id}/complete`)).data;

export const getPoints = async (kidId: string) =>
  (await api.get<PointsResponse>("/api/points", { params: { kidId } })).data;

export const getRewards = async () =>
  (await api.get<Reward[]>("/api/rewards")).data;

export const redeemReward = async (rewardId: number) =>
  (await api.post(`/api/rewards/${rewardId}/redeem`)).data;

export const createTask = async (payload: CreateTaskRequest) =>
  (await api.post<KidTask>("/api/tasks", payload)).data;

export const createReward = async (payload: CreateRewardRequest) =>
  (await api.post<Reward>("/api/rewards", payload)).data;

export type ParentLoginRequest = { username: string; password: string };
export type ParentLoginResponse = { token: string; role: "Parent" };

export const parentLogin = async (payload: ParentLoginRequest) =>
  (await api.post<ParentLoginResponse>("/api/parent/login", payload)).data;

export function setApiToken(token?: string) {
  if (token) api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
  else delete api.defaults.headers.common["Authorization"];
}

export type KidSessionRequest = { kidId: string };
export type KidSessionResponse = {
  token: string;
  role: "Kid";
  kidId: string;
  displayName: string;
};

export const startKidSession = async (payload: KidSessionRequest) =>
  (await api.post<KidSessionResponse>("/api/kid-session", payload)).data;