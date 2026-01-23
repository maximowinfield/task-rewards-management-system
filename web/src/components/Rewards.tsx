import { useEffect, useState } from "react";
import { Reward } from "../types";
import { getRewards, getPoints, redeemReward } from "../api";

/*
Rewards.tsx
------------
Purpose:
- Displays the list of available rewards.
- Shows the kid’s current points balance.
- Allows a kid to redeem a reward if they have enough points.

Important design choice:
- The component does NOT send kidId when redeeming a reward.
- The backend derives the kid identity from the JWT claims.
- This prevents a client from attempting to redeem rewards for another kid.
*/

export default function Rewards({ kidId }: { kidId: string }) {
  // List of available rewards
  const [rewards, setRewards] = useState<Reward[]>([]);

  // Current points balance for the selected kid
  const [points, setPoints] = useState(0);

  /*
  load()
  ------
  Loads all data needed for this component:
  - Rewards catalog (shared across all kids)
  - Current points balance for the active kid

  Keeping this logic in one function allows:
  - Reuse after redeeming a reward
  - Cleaner effect and click handlers
  */
  const load = async () => {
    setRewards(await getRewards());
    setPoints((await getPoints(kidId)).points);
  };

  /*
  Effect: reload when kidId changes
  -------------------------------
  - Runs on initial mount
  - Runs again if the selected kid changes
  - Ensures the UI always reflects the correct kid context
  */
  useEffect(() => {
    load();
  }, [kidId]);

  return (
    <div>
      <h3>Rewards</h3>

      <ul>
        {rewards.map((r) => (
          <li key={r.id}>
            {/* Reward name and cost */}
            {r.name} ({r.cost} pts)

            <button
              /*
              Disable redeem button if the kid does not have enough points.
              This is a UI convenience only; the backend still enforces the rule.
              */
              disabled={points < r.cost}
              onClick={async () => {
                /*
                Redeem flow:
                1) Call redeemReward with rewardId only
                2) Backend uses JWT claims to identify the kid
                3) Backend validates points balance and performs redemption
                4) Reload rewards and points to refresh UI state
                */
                await redeemReward(r.id);
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
