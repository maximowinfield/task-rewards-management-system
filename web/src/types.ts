export type KidProfile = { id: string; displayName: string };

export type KidTask = {
  id: number;
  title: string;
  points: number;
  assignedKidId: string;
  isComplete: boolean;
  completedAt: string | null;
};

export type Reward = { id: number; name: string; cost: number };

export type PointsResponse = { kidId: string; points: number };

export type CreateTaskRequest = {
  title: string;
  points: number;
  assignedKidId: string;
};

export type CreateRewardRequest = {
  name: string;
  cost: number;
};
