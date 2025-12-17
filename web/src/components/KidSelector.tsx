import { KidProfile } from "../types";

type Props = {
  kids: KidProfile[];
  selectedKidId: string;
  onChange: (kidId: string) => void;
};

export default function KidSelector({ kids, selectedKidId, onChange }: Props) {
  return (
    <select value={selectedKidId} onChange={e => onChange(e.target.value)}>
      {kids.map(k => (
        <option key={k.id} value={k.id}>
          {k.displayName}
        </option>
      ))}
    </select>
  );
}
