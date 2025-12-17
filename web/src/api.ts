import axios from "axios";
import type {
  KidProfile,
  KidTask,
  Reward,
  PointsResponse,
  CreateTaskRequest,
  CreateRewardRequest
} from "./types";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
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

export const redeemReward = async (rewardId: number, kidId: string) =>
  api.post(`/api/rewards/${rewardId}/redeem`, null, { params: { kidId } });

export const createTask = async (payload: CreateTaskRequest) =>
  (await api.post<KidTask>("/api/tasks", payload)).data;

export const createReward = async (payload: CreateRewardRequest) =>
  (await api.post<Reward>("/api/rewards", payload)).data;
