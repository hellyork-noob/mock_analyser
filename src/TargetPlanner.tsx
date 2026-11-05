import type {Mock,CustomExamProfile} from './db';
export default function TargetPlanner({mocks,exam,profile}:{mocks:Mock[];exam:string;profile?:CustomExamProfile}){
 const max=profile?.sections.reduce((n,s)=>n+s.maxMarks,0)??0;
 const target=profile?.targetScore??0;
 const full=mocks.filter(m=>m.exam===exam&&m.subject==='Full Mock'&&m.maxScore>0).sort((a,b)=>a.date.localeCompare(b.date)||(a.id??0)-(b.id??0));
 const latest=full[full.length-1];const recent=full.slice(-5);
 const best=full.length?Math.max(...full.map(m=>100*m.score/m.maxScore)):null;
 const recentAvg=recent.length?recent.reduce((n,m)=>n+100*m.score/m.maxScore,0)/recent.length:null;
 const targetPct=max>0?100*target/max:0;
 const latestPct=latest?100*latest.score/latest.maxScore:null;
 const latestEquivalent=latest&&latest.maxScore>0?latest.score/latest.maxScore*max:null;
 const gap=latestEquivalent===null?null:target-latestEquivalent;
 return <div className="panel p5d-planner"><div className="panelhead"><div><h3>Target score planner</h3><p>Personal target for {exam} · full mocks only</p></div></div>
 {!profile?<p className="muted">Select a configured exam to view its target.</p>:!target?<p className="muted">Set your target score in Settings → Manage target exams → Edit. No target is set for this exam yet.</p>:<>
 <div className="p5d-metrics"><div><small>Target score</small><strong>{target} / {max}</strong><span>{targetPct.toFixed(1)}% of maximum</span></div><div><small>Latest full mock</small><strong>{latest?`${latest.score} / ${latest.maxScore}`:'—'}</strong><span>{latest?latest.date:'No full mocks yet'}</span></div><div><small>Gap to target</small><strong>{gap===null?'—':gap<=0?'Target reached':`${gap.toFixed(1)} marks`}</strong><span>Marks needed to reach target</span></div><div><small>Recent average</small><strong>{recentAvg===null?'—':`${recentAvg.toFixed(1)}%`}</strong><span>Last {recent.length} full mocks</span></div></div>
 <div className="p5d-progress"><div className="p5d-progress-label"><span>Latest full mock</span><span>Target {targetPct.toFixed(1)}%</span></div><div className="p5d-track"><div className="p5d-fill" style={{width:`${Math.max(0,Math.min(100,latestPct??0))}%`}}/><div className="p5d-marker" style={{left:`${Math.max(0,Math.min(100,targetPct))}%`}}/></div></div>
 <p className="muted">{!latest?'Add a full mock to start tracking your target.':gap!==null&&gap<=0?'Your latest full mock met or exceeded the target.':`Your latest full mock is ${gap?.toFixed(1)} marks below your target.`}{best!==null?` Best recorded full mock: ${best.toFixed(1)}%.`:''} Targets are goals, not score predictions.</p>
 </>}</div>;
}
