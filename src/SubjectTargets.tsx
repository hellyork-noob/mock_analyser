import type {Mock,CustomExamProfile,SectionResult} from './db';

type Snapshot={name:string;target:number;max:number;average:number|null;gap:number|null;accuracy:number|null;attemptRate:number|null;count:number;priority:number};
const asPct=(a:number,b:number)=>b>0?100*a/b:null;
const fmt=(n:number|null)=>n===null?'—':`${n.toFixed(1)}%`;
export default function SubjectTargets({mocks,exam,profile}:{mocks:Mock[];exam:string;profile?:CustomExamProfile}){
 const sections=profile?.sections??[];
 const examMax=sections.reduce((sum,s)=>sum+s.maxMarks,0);
 const overallTarget=profile?.targetScore??0;
 const targetPct=examMax>0?100*overallTarget/examMax:0;
 const customTargets=profile?.subjectTargets??{};
 const customActive=sections.length>0&&sections.every(s=>Number.isFinite(customTargets[s.name]));
 const scoped=mocks.filter(m=>m.exam===exam).sort((a,b)=>a.date.localeCompare(b.date)||(a.id??0)-(b.id??0));
 const results:Snapshot[]=sections.map(s=>{
  const rows:SectionResult[]=[];
  for(const mock of scoped){
   const section=mock.sections?.find(r=>r.subject===s.name);
   if(section)rows.push(section);
   else if(mock.subject===s.name)rows.push({subject:s.name,score:mock.score,maxScore:mock.maxScore,correct:mock.correct,incorrect:mock.incorrect,unattempted:mock.unattempted});
  }
  const recent=rows.filter(r=>r.maxScore>0).slice(-5);
  const average=recent.length?recent.reduce((sum,r)=>sum+100*r.score/r.maxScore,0)/recent.length:null;
  const correct=recent.reduce((sum,r)=>sum+r.correct,0),wrong=recent.reduce((sum,r)=>sum+r.incorrect,0),skipped=recent.reduce((sum,r)=>sum+r.unattempted,0);
  const target=customActive?customTargets[s.name]:s.maxMarks*targetPct/100;
  const subjectTargetPct=s.maxMarks>0?100*target/s.maxMarks:0;
  const gap=average===null?null:target-average*s.maxMarks/100;
  // Prioritize actual mark shortfall, naturally accounting for section size.
  const priority=gap===null?0:Math.max(0,gap);
  return {name:s.name,target,max:s.maxMarks,average,gap,accuracy:asPct(correct,correct+wrong),attemptRate:asPct(correct+wrong,correct+wrong+skipped),count:recent.length,priority};
 });
 const ranked=[...results].filter(r=>r.gap!==null&&r.gap>0).sort((a,b)=>b.priority-a.priority);
 return <section className="panel p5e-targets">
  <div className="panelhead"><div><h3>Subject-wise target planning</h3><p>Exam-specific target allocation and weak-area priorities</p></div></div>
  {!profile?<p className="muted">Select one of your configured exams to view section targets.</p>:overallTarget<=0?<p className="muted">Set a target score for this exam in Settings → Manage target exams to enable subject-wise planning.</p>:!sections.length?<p className="muted">Add sections to this exam to enable subject targets.</p>:<>
   <p className="muted">Your {overallTarget} / {examMax} target ({targetPct.toFixed(1)}%) uses {customActive?'your independently saved subject targets':'automatic proportional subject targets'}. To customize, edit the exam in Settings.</p>
   <div className="p5e-scroll"><table className="p5e-table"><thead><tr><th>Subject</th><th>Subject target</th><th>Recent average</th><th>Gap</th><th>Accuracy</th><th>Attempt rate</th></tr></thead><tbody>{results.map(r=><tr key={r.name}><td><strong>{r.name}</strong><small>{r.count} recent entries</small></td><td>{r.target.toFixed(1)} / {r.max}</td><td>{fmt(r.average)}</td><td className={r.gap!==null&&r.gap>0?'p5e-warning':'p5e-good'}>{r.gap===null?'—':r.gap<=0?'Met':`${r.gap.toFixed(1)} marks below`}</td><td>{fmt(r.accuracy)}</td><td>{fmt(r.attemptRate)}</td></tr>)}</tbody></table></div>
   <div className="p5e-actions"><h4>Suggested focus order</h4>{ranked.length?ranked.slice(0,3).map((r,i)=><p key={r.name}><strong>{i+1}. {r.name}</strong> — {r.gap?.toFixed(1)} marks below the subject target. {r.accuracy!==null&&r.accuracy<70?'Prioritize accuracy and review mistakes.':r.attemptRate!==null&&r.attemptRate<75?'Prioritize question coverage and selection.':'Practice weaker topics and review missed marks.'}</p>):<p>{results.some(r=>r.count>0)?'No measured subject currently falls below its suggested target.':'Add full mocks with section breakdowns or sectional mocks to calculate priorities.'}</p>}</div>
   <p className="muted p5e-footnote">Averages use up to five latest entries per subject, combining full-mock sections and standalone sectional mocks. Ranking weights shortfall by section marks. Different mock difficulty can affect comparisons.</p>
  </>}
 </section>;
}
