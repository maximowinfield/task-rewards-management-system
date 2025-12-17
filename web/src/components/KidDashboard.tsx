import { useEffect, useState } from "react";
import { KidTask } from "../types";
import { getTasks, getPoints, completeTask } from "../api";

type Props = { kidId: string };

export default function KidDashboard({ kidId }: Props) {
  const [tasks, setTasks] = useState<KidTask[]>([]);
  const [points, setPoints] = useState(0);

  const load = async () => {
    setTasks(await getTasks(kidId));
    setPoints((await getPoints(kidId)).points);
  };

  useEffect(() => { load(); }, [kidId]);

  const finish = async (id: number) => {
    await completeTask(id);
    await load();
  };

  return (
    <div>
      <h2>Points: {points}</h2>
      <ul>
        {tasks.map(t => (
          <li key={t.id}>
            {t.title} ({t.points} pts)
            {!t.isComplete && (
              <button onClick={() => finish(t.id)}>Complete</button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
