import MockDetail from "./MockDetail";
import { useEffect, useMemo, useState } from "react";
import { ArrowUpRight, Trash2, Pencil } from "lucide-react";
import { db, type Mock, type CustomExamProfile } from "../../data/db";
import EditMockDialog from "./EditMockDialog";
import Empty from "../../components/Empty";
import { selectHistoryRows, selectHistoryProviders } from "./history";
export default function HistoryPage({ mocks, exam, customProfiles, reload }: {
    mocks: Mock[];
    exam: string;
    customProfiles: CustomExamProfile[];
    reload: () => void;
}) {
    const [historySearch, setHistorySearch] = useState("");
    const [historySort, setHistorySort] = useState<"newest" | "oldest" | "score-high" | "score-low">("newest");
    const [historySubject, setHistorySubject] = useState("All");
    const [historyProvider, setHistoryProvider] = useState("All");
    const [editingMock, setEditingMock] = useState<Mock | null>(null);
    const [viewingMock, setViewingMock] = useState<Mock | null>(null);
    useEffect(() => {
        setHistorySubject("All");
        setHistoryProvider("All");
        setEditingMock(null);
        setViewingMock(null);
    }, [exam]);
    const historyProviders = useMemo(() => selectHistoryProviders(mocks, exam), [mocks, exam]);
    const historyRows = useMemo(() => selectHistoryRows(mocks, exam, { historySearch, historySubject, historyProvider, historySort }), [mocks, exam, historySearch, historySubject, historyProvider, historySort]);
    const [page, setPage] = useState(0);
    const pageSize = 50;
    const pageCount = Math.max(1, Math.ceil(historyRows.length / pageSize));
    const currentPage = Math.min(page, pageCount - 1);
    const visibleRows = historyRows.slice(currentPage * pageSize, (currentPage + 1) * pageSize);
    useEffect(() => setPage(0), [exam, historySearch, historySubject, historyProvider, historySort]);
    return (<div className="panel aa-history-panel">
              <div className="panelhead aa-history-head">
                <div>
                  <h3>
                    Mock history{" "}
                    <span className="aa-history-count">
                      {historyRows.length}
                    </span>
                  </h3>
                  <p>{exam || "No exam selected"} · saved tests</p>
                </div>
                <div className="p4-history-filters">
                  <input aria-label="Search mock history" placeholder="Search mocks" value={historySearch} onChange={(e) => setHistorySearch(e.target.value)}/>
                  <select aria-label="Filter by subject" value={historySubject} onChange={(e) => setHistorySubject(e.target.value)}>
                    <option>All</option>
                    <option>Full Mock</option>
                    {[
            ...new Set(customProfiles
                .filter((p) => p.key === exam)
                .flatMap((p) => p.sections.map((s) => s.name))),
        ].map((x) => (<option key={x}>{x}</option>))}
                  </select>
                  <select aria-label="Filter by provider" value={historyProvider} onChange={(e) => setHistoryProvider(e.target.value)}>
                    <option value="All">All providers</option>
                    {historyProviders.map((p) => (<option key={p} value={p}>
                        {p}
                      </option>))}
                  </select>
                  <select aria-label="Sort mock history" value={historySort} onChange={(e) => setHistorySort(e.target.value as "newest" | "oldest" | "score-high" | "score-low")}>
                    <option value="newest">Newest first</option>
                    <option value="oldest">Oldest first</option>
                    <option value="score-high">Highest score %</option>
                    <option value="score-low">Lowest score %</option>
                  </select>
                  {(historySearch ||
            historySubject !== "All" ||
            historyProvider !== "All" ||
            historySort !== "newest") && (<button type="button" className="aa-history-reset" onClick={() => {
                setHistorySearch("");
                setHistorySubject("All");
                setHistoryProvider("All");
                setHistorySort("newest");
            }}>
                      Clear filters
                    </button>)}
                </div>
              </div>
              {mocks.some((m) => m.exam === exam) ? (<div className="tablewrap aa-history-table">
                  <table>
                    <thead>
                      <tr>
                        <th>Mock</th>
                        <th>Date</th>
                        <th>Score</th>
                        <th>Accuracy</th>
                        <th>Percentile</th>
                        <th>Time</th>
                        <th>Speed</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visibleRows.map((m) => (<tr key={m.id}>
                          <td>
                            <strong>{m.title}</strong>
                            <small>{m.subject}</small>
                          </td>
                          <td>{m.date}</td>
                          <td>
                            <strong>
                              {m.score} / {m.maxScore}
                            </strong>
                            <small>
                              {m.maxScore > 0
                    ? ((100 * m.score) / m.maxScore).toFixed(1) +
                        "%"
                    : "—"}
                            </small>
                          </td>
                          <td>
                            {((m.correct /
                    Math.max(1, m.correct + m.incorrect)) *
                    100).toFixed(0)}
                            %
                          </td>
                          <td>
                            {m.percentile !== undefined
                    ? `${m.percentile.toFixed(2)}%`
                    : "—"}
                          </td>
                          <td>
                            {m.timeMinutes && m.timeMinutes > 0
                    ? `${m.timeMinutes} min`
                    : "—"}
                          </td>
                          <td>
                            {m.timeMinutes && m.timeMinutes > 0
                    ? `${((m.correct + m.incorrect) / m.timeMinutes).toFixed(2)} Q/min`
                    : "—"}
                          </td>
                          <td>
                            <div className="actions">
                              <button className="aa-history-view" title="View detailed analysis" aria-label={`View analysis for ${m.title}`} onClick={() => setViewingMock(m)}>
                                View Analysis
                              </button>
                              <button title="Edit mock" aria-label={`Edit ${m.title}`} onClick={() => setEditingMock(m)}>
                                <Pencil size={17}/>
                              </button>
                              {m.url && (<a href={m.url} target="_blank" rel="noreferrer" aria-label="Open mock">
                                  <ArrowUpRight size={17}/>
                                </a>)}
                              <button title="Delete mock" onClick={async () => {
                    if (confirm("Delete this v2 mock?")) {
                        await db.mocks.delete(m.id!);
                        reload();
                    }
                }}>
                                <Trash2 size={17}/>
                              </button>
                            </div>
                          </td>
                        </tr>))}
                    </tbody>
                  </table>
                  {historyRows.length === 0 && (<Empty text="No mocks match your filters."/>)}
                </div>) : (<Empty text="No mocks for the selected exam yet. Add your first mock."/>)}
              {pageCount > 1 && <nav className="history-pagination" aria-label="Mock history pages">
                <span>Showing {currentPage * pageSize + 1} to {Math.min((currentPage + 1) * pageSize, historyRows.length)} of {historyRows.length} mocks</span>
                <button className="secondary" type="button" disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)}>Previous</button>
                <span aria-live="polite">Page {currentPage + 1} of {pageCount}</span>
                <button className="secondary" type="button" disabled={currentPage + 1 >= pageCount} onClick={() => setPage(currentPage + 1)}>Next</button>
              </nav>}
              {viewingMock && (<MockDetail mock={viewingMock} profile={customProfiles.find((p) => p.key === viewingMock.exam)} onClose={() => setViewingMock(null)}/>)}
              {editingMock && (<EditMockDialog key={editingMock.id} mock={editingMock} custom={customProfiles.find((p) => p.key === editingMock.exam)} onClose={() => setEditingMock(null)} onSaved={() => {
                setEditingMock(null);
                reload();
            }}/>)}
            </div>);
}
