import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { Activity, ArrowDownRight, ArrowUpRight, Check, ChevronDown, CircleAlert, Clock3, Filter, MapPin, Plus, Search, ShieldCheck, Siren, X } from "lucide-react";
import { checkApiHealth, createIssue, getIssues, updateIssueStatus } from "./api";
import type { Category, Issue, IssueCreate, IssueStatus, Priority } from "./types";

const categories: Category[] = ["Roads", "Lighting", "Waste", "Parks", "Footpaths", "Other"];
const statuses: Array<"All" | IssueStatus> = ["All", "Submitted", "Under review", "Assigned", "In progress", "Resolved", "Closed"];
const nextStatus: Partial<Record<IssueStatus, IssueStatus[]>> = {
  "Submitted": ["Under review", "Assigned", "Closed"],
  "Under review": ["Assigned", "In progress", "Closed"],
  "Assigned": ["In progress", "Closed"],
  "In progress": ["Resolved", "Assigned", "Closed"],
  "Resolved": ["Closed", "In progress"],
  "Closed": []
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-AU", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value));
}

function statusClass(status: IssueStatus) {
  return ({
    "Submitted": "status-submitted",
    "Under review": "status-review",
    "Assigned": "status-assigned",
    "In progress": "status-progress",
    "Resolved": "status-resolved",
    "Closed": "status-closed"
  })[status];
}

function App() {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [apiStatus, setApiStatus] = useState<"connecting" | "online" | "offline">("connecting");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);
  const [form, setForm] = useState<IssueCreate>({
    title: "", description: "", category: "Roads", location: "", priority: "Normal"
  });

  const loadIssues = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getIssues({
        status: statusFilter === "All" ? undefined : statusFilter,
        category: categoryFilter || undefined,
        q: query.trim() || undefined
      });
      setIssues(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load issues.");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, categoryFilter, query]);

  useEffect(() => { void loadIssues(); }, [loadIssues]);

  useEffect(() => {
    let active = true;
    const checkHealth = async () => {
      try {
        const health = await checkApiHealth();
        if (active) setApiStatus(health.status === "ok" ? "online" : "offline");
      } catch {
        if (active) setApiStatus("offline");
      }
    };
    void checkHealth();
    const intervalId = window.setInterval(() => void checkHealth(), 30000);
    return () => {
      active = false;
      window.clearInterval(intervalId);
    };
  }, []);

  const stats = useMemo(() => ({
    open: issues.filter((i) => !["Resolved", "Closed"].includes(i.status)).length,
    urgent: issues.filter((i) => i.priority === "Urgent").length,
    progress: issues.filter((i) => i.status === "In progress").length,
    resolved: issues.filter((i) => i.status === "Resolved" || i.status === "Closed").length
  }), [issues]);

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");
    try {
      await createIssue(form);
      setForm({ title: "", description: "", category: "Roads", location: "", priority: "Normal" });
      setShowForm(false);
      setNotice("Issue submitted. It has been added to the service queue.");
      await loadIssues();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to submit issue.");
    } finally {
      setSaving(false);
    }
  }

  async function handleStatusChange(issue: Issue, status: IssueStatus) {
    setError("");
    try {
      const updated = await updateIssueStatus(issue.id, status);
      setIssues((old) => old.map((item) => item.id === updated.id ? updated : item));
      setSelectedIssue(updated);
      setNotice(`Issue #${updated.id} moved to ${updated.status}.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to update issue.");
    }
  }

  const dateLabel = new Intl.DateTimeFormat("en-AU", { weekday: "long", day: "numeric", month: "long" }).format(new Date());

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-lockup">
          <div className="brand-mark"><Activity size={21} strokeWidth={2.5} /></div>
          <div><div className="brand-name">civicflow<span>.</span></div><div className="brand-subtitle">COMMUNITY SERVICES</div></div>
        </div>
        <div className="workspace-label">WORKSPACE</div>
        <button className="nav-item nav-active" type="button"><Activity size={17} /> Service overview <span className="nav-count">{issues.length}</span></button>
        <button className="nav-item" type="button" onClick={() => setShowForm(true)}><Plus size={17} /> Report an issue</button>
        <div className="sidebar-bottom">
          <div className="sidebar-status"><span className={`online-dot ${apiStatus === "offline" ? "api-dot-offline" : apiStatus === "connecting" ? "api-dot-connecting" : ""}`} /><span>API connection</span><strong className={`api-status-label api-status-${apiStatus}`} role="status">{apiStatus === "online" ? "Live API" : apiStatus === "connecting" ? "Connecting…" : "Offline"}</strong></div>
          <div className="profile-chip"><div className="profile-avatar">CF</div><div><strong>Community Services</strong><span>Demo workspace</span></div><ChevronDown size={15} /></div>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div><div className="eyebrow">SERVICE OPERATIONS / OVERVIEW</div><h1>Community service desk</h1><p>Track local issues. Coordinate response. Build trust.</p></div>
          <div className="topbar-actions"><div className="date-pill"><Clock3 size={15} /> {dateLabel}</div><button className="btn btn-primary" onClick={() => setShowForm(true)}><Plus size={17} /> Report an issue</button></div>
        </header>

        {notice && <div className="notice" role="status"><Check size={17} />{notice}<button type="button" aria-label="Dismiss notice" onClick={() => setNotice("")}><X size={15} /></button></div>}
        {error && <div className="error-banner" role="alert"><CircleAlert size={18} /><span>{error}</span><button className="btn btn-outline btn-sm" onClick={() => void loadIssues()}>Retry</button></div>}

        <section className="stats-grid" aria-label="Issue summary">
          <article className="stat-card"><div className="stat-top"><span>Open issues</span><span className="stat-icon icon-blue"><Activity size={18} /></span></div><div className="stat-value">{loading ? "—" : stats.open}</div><div className="stat-foot"><span className="dot dot-blue" /> Needs attention</div></article>
          <article className="stat-card"><div className="stat-top"><span>Urgent priority</span><span className="stat-icon icon-red"><Siren size={18} /></span></div><div className="stat-value">{loading ? "—" : stats.urgent}</div><div className="stat-foot"><span className="dot dot-red" /> High-impact reports</div></article>
          <article className="stat-card"><div className="stat-top"><span>In progress</span><span className="stat-icon icon-amber"><ArrowUpRight size={18} /></span></div><div className="stat-value">{loading ? "—" : stats.progress}</div><div className="stat-foot"><span className="dot dot-amber" /> Assigned work underway</div></article>
          <article className="stat-card"><div className="stat-top"><span>Resolved / closed</span><span className="stat-icon icon-green"><ShieldCheck size={18} /></span></div><div className="stat-value">{loading ? "—" : stats.resolved}</div><div className="stat-foot"><span className="dot dot-green" /> Completed cases</div></article>
        </section>

        <section className="work-area">
          <div className="issues-panel">
            <div className="panel-heading"><div><h2>Issue queue</h2><p>Reports from the community and their current status.</p></div><span className="record-count">{issues.length} records</span></div>
            <div className="filter-row">
              <label className="search-box"><Search size={16} /><input aria-label="Search issues" placeholder="Search issues, description or location…" value={query} onChange={(e) => setQuery(e.target.value)} /></label>
              <label className="filter-select"><Filter size={15} /><select aria-label="Filter by status" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>{statuses.map((status) => <option key={status}>{status}</option>)}</select></label>
              <label className="filter-select"><select aria-label="Filter by category" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}><option value="">All categories</option>{categories.map((category) => <option key={category}>{category}</option>)}</select></label>
            </div>

            <div className="table-wrap">
              <table className="issue-table">
                <thead><tr><th>Issue</th><th>Category</th><th>Priority</th><th>Status</th><th>Reported</th><th><span className="sr-only">Actions</span></th></tr></thead>
                <tbody>
                  {loading && <tr><td colSpan={6} className="empty-cell">Loading issue queue…</td></tr>}
                  {!loading && !error && issues.length === 0 && <tr><td colSpan={6} className="empty-cell">No issues match these filters.</td></tr>}
                  {!loading && issues.map((issue) => <tr key={issue.id}>
                    <td><button className="issue-title" type="button" onClick={() => setSelectedIssue(issue)}>{issue.title}</button><div className="issue-location"><MapPin size={12} />{issue.location}</div></td>
                    <td><span className="category-label">{issue.category}</span></td>
                    <td><span className={`priority priority-${issue.priority.toLowerCase()}`}><span />{issue.priority}</span></td>
                    <td><span className={`status-pill ${statusClass(issue.status)}`}>{issue.status}</span></td>
                    <td className="date-cell">{formatDate(issue.created_at)}</td>
                    <td><button className="icon-button" type="button" aria-label={`View ${issue.title}`} onClick={() => setSelectedIssue(issue)}><ArrowDownRight size={16} /></button></td>
                  </tr>)}
                </tbody>
              </table>
            </div>
            <div className="table-footer"><span>Showing {issues.length} issue{issues.length === 1 ? "" : "s"}</span><button className="text-button" onClick={() => { setQuery(""); setStatusFilter("All"); setCategoryFilter(""); }}>Clear filters</button></div>
          </div>

          <aside className="side-panel">
            <div className="side-panel-title"><div><h2>Response workflow</h2><p>Standard case progression</p></div><span className="workflow-icon"><Activity size={18} /></span></div>
            <div className="workflow-list">
              {[["01","Submitted","Report received"],["02","Under review","Triage and validate"],["03","Assigned","Owner allocated"],["04","In progress","Work underway"],["05","Resolved","Outcome confirmed"]].map(([number, title, detail], index) => <div className="workflow-step" key={number}><div className={`workflow-number ${index === 3 ? "workflow-current" : ""}`}>{number}</div><div><strong>{title}</strong><span>{detail}</span></div>{index === 3 && <span className="workflow-you">EXAMPLE</span>}</div>)}
            </div>
            <div className="response-note"><div className="response-note-icon"><ShieldCheck size={17} /></div><div><strong>Transparent by design</strong><p>Every issue has a clear status and a traceable service workflow.</p></div></div>
          </aside>
        </section>

        <footer className="footer"><span>© {new Date().getFullYear()} CivicFlow · Portfolio prototype</span><span><span className="online-dot" /> API-backed demo data</span></footer>
      </main>

      {showForm && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowForm(false); }}>
        <section className="issue-modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
          <div className="modal-heading"><div><div className="eyebrow">COMMUNITY REPORT</div><h2 id="modal-title">Report a local issue</h2><p>Share enough detail for the service team to investigate.</p></div><button className="icon-button" type="button" aria-label="Close form" onClick={() => setShowForm(false)}><X size={18} /></button></div>
          <form onSubmit={handleCreate}>
            <label>Issue title<input required minLength={5} maxLength={120} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Streetlight not working" /></label>
            <label>Description<textarea required minLength={10} maxLength={3000} rows={4} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="What happened? Include useful details…" /></label>
            <div className="form-two-col"><label>Category<select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as Category })}>{categories.map((category) => <option key={category}>{category}</option>)}</select></label><label>Priority<select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value as Priority })}><option>Low</option><option>Normal</option><option>High</option><option>Urgent</option></select></label></div>
            <label>Location<input required minLength={3} maxLength={180} value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Street, landmark or area" /></label>
            <div className="modal-actions"><button className="btn btn-ghost" type="button" onClick={() => setShowForm(false)}>Cancel</button><button className="btn btn-primary" type="submit" disabled={saving}>{saving ? "Submitting…" : <><Plus size={16} /> Submit issue</>}</button></div>
          </form>
        </section>
      </div>}

      {selectedIssue && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelectedIssue(null); }}>
        <section className="issue-modal detail-modal" role="dialog" aria-modal="true" aria-labelledby="detail-title">
          <div className="modal-heading"><div><div className="eyebrow">CASE #{selectedIssue.id}</div><h2 id="detail-title">{selectedIssue.title}</h2><p><MapPin size={14} className="inline-icon" /> {selectedIssue.location}</p></div><button className="icon-button" type="button" aria-label="Close details" onClick={() => setSelectedIssue(null)}><X size={18} /></button></div>
          <div className="detail-meta"><span className="category-label">{selectedIssue.category}</span><span className={`priority priority-${selectedIssue.priority.toLowerCase()}`}><span />{selectedIssue.priority}</span><span className={`status-pill ${statusClass(selectedIssue.status)}`}>{selectedIssue.status}</span></div>
          <p className="detail-description">{selectedIssue.description}</p>
          <div className="detail-grid"><div><span>Reported</span><strong>{formatDate(selectedIssue.created_at)}</strong></div><div><span>Assigned team</span><strong>{selectedIssue.assigned_team || "Not assigned"}</strong></div></div>
          <label className="status-editor">Update status<select value={selectedIssue.status} onChange={(e) => void handleStatusChange(selectedIssue, e.target.value as IssueStatus)}>{[selectedIssue.status, ...(nextStatus[selectedIssue.status] || [])].map((status) => <option key={status}>{status}</option>)}</select></label>
          <p className="modal-footnote">Demo workflow: authentication and staff-role permissions are not enabled in this portfolio MVP.</p>
        </section>
      </div>}
    </div>
  );
}

export default App;
