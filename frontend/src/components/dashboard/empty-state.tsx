import { CircleDot } from "lucide-react";
export function Empty({ title, text }: { title: string; text: string }) {
  return (
    <div className="empty-state">
      <CircleDot size={28} />
      <h3>{title}</h3>
      <p>{text}</p>
    </div>
  );
}
