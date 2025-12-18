import axios from "axios";
import type {
  KidProfile,
  KidTask,
  Reward,
  PointsResponse,
  CreateTaskRequest,
  CreateRewardRequest,
} from "./types";

export const API_URL = import.meta.env.VITE_API_URL || "/api";

const api = axios.create({
  baseURL: API_URL, // "/api" in prod, can be full URL in dev if you want
});

export const getKids = async () =>
  (await api.get<KidProfile[]>("/kids")).data;

export const getTasks = async (kidId: string) =>
  (await api.get<KidTask[]>("/tasks", { params: { kidId } })).data;

export const completeTask = async (id: number) =>
  (await api.put<KidTask>(`/tasks/${id}/complete`)).data;

export const getPoints = async (kidId: string) =>
  (await api.get<PointsResponse>("/points", { params: { kidId } })).data;

export const getRewards = async () =>
  (await api.get<Reward[]>("/rewards")).data;

export const redeemReward = async (rewardId: number) =>
  (await api.post(`/rewards/${rewardId}/redeem`)).data;

export const createTask = async (payload: CreateTaskRequest) =>
  (await api.post<KidTask>("/tasks", payload)).data;

export const createReward = async (payload: CreateRewardRequest) =>
  (await api.post<Reward>("/rewards", payload)).data;

export type ParentLoginRequest = { username: string; password: string };
export type ParentLoginResponse = { token: string; role: "Parent" };

export const parentLogin = async (payload: ParentLoginRequest) =>
  (await api.post<ParentLoginResponse>("/parent/login", payload)).data;

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
  (await api.post<KidSessionResponse>("/kid-session", payload)).data;
