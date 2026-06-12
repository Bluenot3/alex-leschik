import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { RefreshCw, Mail, Building2, Tag, Clock, CheckCircle2, Circle, XCircle, Filter, Trash2, Loader2 } from "lucide-react";

type Lead = Tables<"leads">;
type Status = "new" | "contacted" | "closed";

const STATUS_META: Record<Status, { label: string; icon: React.ReactNode; color: string }> = {
  new: { label: "New", icon: <Circle className="w-3 h-3" />, color: "#38bdf8" },
  contacted: { label: "Contacted", icon: <CheckCircle2 className="w-3 h-3" />, color: "#34d399" },
  closed: { label: "Closed", icon: <XCircle className="w-3 h-3" />, color: "#94a3b8" },
};

export default function LeadInbox() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Status | "all">("all");
  const [updating, setUpdating] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("leads")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) setLeads(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const updateStatus = async (id: string, status: Status) => {
    setUpdating(id);
    await supabase.from("leads").update({ status }).eq("id", id);
    setLeads((prev) =>
      prev.map((l) => (l.id === id ? { ...l, status } : l))
    );
    setUpdating(null);
  };

  const deleteLead = async (id: string) => {
    if (!confirm("Delete this lead permanently?")) return;
    await supabase.from("leads").delete().eq("id", id);
    setLeads((prev) => prev.filter((l) => l.id !== id));
  };

  const filtered = filter === "all" ? leads : leads.filter((l) => l.status === filter);

  const counts = {
    all: leads.length,
    new: leads.filter((l) => l.status === "new").length,
    contacted: leads.filter((l) => l.status === "contacted").length,
    closed: leads.filter((l) => l.status === "closed").length,
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  return (
    <div className="lead-inbox">
      {/* Header + filters */}
      <div className="lead-inbox__header">
        <div className="lead-inbox__counts">
          {(["all", "new", "contacted", "closed"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`lead-inbox__filter ${filter === s ? "lead-inbox__filter--active" : ""}`}
            >
              <span
                className="lead-inbox__dot"
                style={{
                  background:
                    s === "all"
                      ? "#94a3b8"
                      : STATUS_META[s as Status].color,
                }}
              />
              {s === "all" ? "All" : STATUS_META[s as Status].label}
              <span className="lead-inbox__count">{counts[s]}</span>
            </button>
          ))}
        </div>
        <button onClick={load} className="lead-inbox__refresh" title="Refresh">
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Lead list */}
      <div className="lead-inbox__list">
        {loading && leads.length === 0 && (
          <div className="lead-inbox__empty">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground/40" />
            <span>Loading leads...</span>
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div className="lead-inbox__empty">
            <Filter className="w-5 h-5 text-muted-foreground/30" />
            <span>{filter === "all" ? "No leads yet." : `No ${filter} leads.`}</span>
          </div>
        )}

        {filtered.map((lead) => (
          <div key={lead.id} className="lead-inbox__item">
            <div className="lead-inbox__item-top">
              <div className="lead-inbox__item-meta">
                <span className="lead-inbox__name">{lead.name}</span>
                <span className="lead-inbox__email">
                  <Mail className="w-2.5 h-2.5" />
                  {lead.email}
                </span>
                {lead.company && (
                  <span className="lead-inbox__company">
                    <Building2 className="w-2.5 h-2.5" />
                    {lead.company}
                  </span>
                )}
              </div>
              <div className="lead-inbox__item-right">
                <span className="lead-inbox__time">
                  <Clock className="w-2.5 h-2.5" />
                  {formatDate(lead.created_at)}
                </span>
                <div className="lead-inbox__actions">
                  {(["new", "contacted", "closed"] as Status[]).map((s) => (
                    <button
                      key={s}
                      onClick={() => updateStatus(lead.id, s)}
                      disabled={updating === lead.id}
                      className={`lead-inbox__status-btn ${lead.status === s ? "lead-inbox__status-btn--active" : ""}`}
                      title={STATUS_META[s].label}
                      style={{
                        borderColor:
                          lead.status === s ? STATUS_META[s].color : undefined,
                        color:
                          lead.status === s ? STATUS_META[s].color : undefined,
                      }}
                    >
                      {STATUS_META[s].icon}
                    </button>
                  ))}
                  <button
                    onClick={() => deleteLead(lead.id)}
                    className="lead-inbox__delete-btn"
                    title="Delete"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>

            {(lead.project_type || lead.budget_range) && (
              <div className="lead-inbox__tags">
                {lead.project_type && (
                  <span className="lead-inbox__tag">
                    <Tag className="w-2.5 h-2.5" />
                    {lead.project_type}
                  </span>
                )}
                {lead.budget_range && (
                  <span className="lead-inbox__tag">
                    {lead.budget_range}
                  </span>
                )}
                {lead.source && (
                  <span className="lead-inbox__tag lead-inbox__tag--source">
                    {lead.source}
                  </span>
                )}
              </div>
            )}

            {lead.message && (
              <p className="lead-inbox__message">{lead.message}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
