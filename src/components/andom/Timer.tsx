import { useEffect, useState } from "react";
import { formatDuration, workingSeconds } from "@/lib/andom";

export function Timer({ startedAt }: { startedAt: string }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const sec = workingSeconds(startedAt, now);
  return <span className="font-mono tabular-nums">{formatDuration(sec)}</span>;
}