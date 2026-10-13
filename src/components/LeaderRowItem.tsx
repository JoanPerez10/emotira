import type { LeaderRow } from "../api/types";
import type { Mode } from "../types";
import { formatScoreValue } from "../modes";

interface Props {
  row: LeaderRow;
  mode: Mode;
}

export default function LeaderRowItem({ row, mode }: Props) {
  return (
    <li className={row.isMe ? "me" : ""}>
      <span className="pos">#{row.rank}</span>
      <span className="name">
        {row.username}
        {row.isMe && " (tu)"}
      </span>
      <span className="val">{formatScoreValue(mode, row.value)}</span>
    </li>
  );
}
