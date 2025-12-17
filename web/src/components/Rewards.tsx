import { useEffect, useState } from "react";
import { Reward } from "../types";
import { getRewards, getPoints, redeemReward } from "../api";

export default function Rewards({ kidId }: { kidId: string }) {
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [points, setPoints] = useState(0);

  const load = async () => {
    setRewards(await getRewards());
    setPoints((await getPoints(kidId)).points);
  };

  useEffect(() => { load(); }, [kidId]);

  return (
    <div>
      <h3>Rewards</h3>
      <ul>
        {rewards.map(r => (
          <li key={r.id}>
            {r.name} ({r.cost} pts)
            <button
              disabled={points < r.cost}
              onClick={async () => {
                await redeemReward(r.id, kidId);
                await load();
              }}
            >
              Redeem
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
