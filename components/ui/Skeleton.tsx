import { combinarClases } from "@/lib/utiles";

interface Props {
  className?: string;
}

export function Skeleton({ className }: Props) {
  return <div className={combinarClases("animate-pulse rounded-2xl bg-gray-200", className)} />;
}
