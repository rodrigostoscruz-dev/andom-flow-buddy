import { useEffect, useState } from "react";
import { formatDuration } from "@/lib/andom";

export function Timer({ startedAt }: { startedAt: string }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const sec = Math.max(0, Math.floor((now - new Date(startedAt).getTime()) / 1000));
  return <span className="font-mono tabular-nums">{formatDuration(sec)}</span>;
}