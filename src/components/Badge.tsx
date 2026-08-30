const styles: Record<string, string> = {
  новый: "bg-blue-100 text-blue-700",
  "в доставке": "bg-amber-100 text-amber-700",
  доставлен: "bg-green-100 text-green-700",
  отменён: "bg-red-100 text-red-700",
  запланирован: "bg-slate-100 text-slate-700",
  "в работе": "bg-sky-100 text-sky-700",
  завершён: "bg-green-100 text-green-700",
  ожидает: "bg-slate-100 text-slate-600",
  выполнен: "bg-green-100 text-green-700",
};

export function Badge({ status }: { status: string }) {
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[status] ?? "bg-slate-100 text-slate-600"}`}
    >
      {status}
    </span>
  );
}
