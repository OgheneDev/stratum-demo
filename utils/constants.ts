const STATE_COLORS: Record<string, { bg: string; text: string; dot: string }> =
  {
    landed: { bg: "bg-sky-500/10", text: "text-sky-300", dot: "bg-sky-400" },
    deboarding: {
      bg: "bg-sky-500/8",
      text: "text-sky-300/80",
      dot: "bg-sky-300",
    },
    cleaning: {
      bg: "bg-slate-500/10",
      text: "text-slate-400",
      dot: "bg-slate-400",
    },
    fueling: {
      bg: "bg-amber-500/10",
      text: "text-amber-300",
      dot: "bg-amber-400",
    },
    boarding: {
      bg: "bg-emerald-500/10",
      text: "text-emerald-300",
      dot: "bg-emerald-400",
    },
    departed: {
      bg: "bg-slate-500/8",
      text: "text-slate-300",
      dot: "bg-slate-300",
    },
    pending: {
      bg: "bg-amber-500/10",
      text: "text-amber-300",
      dot: "bg-amber-400",
    },
    assigned: { bg: "bg-sky-500/10", text: "text-sky-300", dot: "bg-sky-400" },
    in_transit: {
      bg: "bg-blue-500/10",
      text: "text-blue-300",
      dot: "bg-blue-400",
    },
    delivered: {
      bg: "bg-emerald-500/10",
      text: "text-emerald-300",
      dot: "bg-emerald-400",
    },
    cancelled: {
      bg: "bg-rose-500/10",
      text: "text-rose-300",
      dot: "bg-rose-400",
    },
    waiting: {
      bg: "bg-amber-500/10",
      text: "text-amber-300",
      dot: "bg-amber-400",
    },
    triage: {
      bg: "bg-orange-500/10",
      text: "text-orange-300",
      dot: "bg-orange-400",
    },
    assessment: {
      bg: "bg-blue-500/10",
      text: "text-blue-300",
      dot: "bg-blue-400",
    },
    treatment: {
      bg: "bg-purple-500/10",
      text: "text-purple-300",
      dot: "bg-purple-400",
    },
    discharged: {
      bg: "bg-emerald-500/10",
      text: "text-emerald-300",
      dot: "bg-emerald-400",
    },
  };

export function stateStyle(s: string) {
  return (
    STATE_COLORS[s] ?? {
      bg: "bg-slate-500/10",
      text: "text-slate-300",
      dot: "bg-slate-400",
    }
  );
}
