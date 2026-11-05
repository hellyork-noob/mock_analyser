export type ExamProfile={id:string;family:string;tier:string;questions?:number;maxMarks?:number;minutes?:number;negativeMarking?:string;notes:string};
export const examProfiles:ExamProfile[]=[
 {id:'SSC CGL Pre',family:'SSC CGL',tier:'Tier 1 / Pre',questions:100,maxMarks:200,minutes:60,negativeMarking:'-0.50 per wrong answer',notes:'Standard Tier 1 reference; confirm current notification and applicable accommodations.'},
 {id:'SSC CGL Mains',family:'SSC CGL',tier:'Tier 2 / Mains',negativeMarking:'Depends on paper/section',notes:'Tier 2 has multiple papers and sections. No single universal total or time is imposed; enter the values for the actual paper.'},
 {id:'RRB NTPC Graduate Level Tier 1',family:'RRB NTPC Graduate Level',tier:'CBT 1',questions:100,maxMarks:100,minutes:90,negativeMarking:'1/3 mark per wrong answer',notes:'Standard CBT 1 reference; verify against your exam notification.'},
 {id:'RRB NTPC Graduate Level Tier 2',family:'RRB NTPC Graduate Level',tier:'CBT 2',questions:120,maxMarks:120,minutes:90,negativeMarking:'1/3 mark per wrong answer',notes:'Standard CBT 2 reference; verify against your exam notification.'}
];
export const legacyExamChoices=['SSC CGL','SSC CHSL','SSC CPO','SSC MTS','Banking','Railways','Other'];
export function getExamProfile(exam:string):ExamProfile|undefined{
 const normalized=exam.trim().toLowerCase().replace(/[–—_-]/g,' ').replace(/\s+/g,' ');
 return examProfiles.find(p=>p.id.toLowerCase()===normalized) ??
  (normalized==='ssc cgl pre' || normalized==='ssc cgl tier 1' || normalized==='ssc cgl prelims'?examProfiles[0]:
   normalized==='ssc cgl mains'||normalized==='ssc cgl tier 2'?examProfiles[1]:
   /^rrb ntpc graduate level (tier 1|cbt 1)$/.test(normalized)?examProfiles[2]:
   /^rrb ntpc graduate level (tier 2|cbt 2)$/.test(normalized)?examProfiles[3]:undefined);
}
export function allExamChoices(saved:string[]=[]):string[]{
 return [...new Set([...examProfiles.map(p=>p.id),...legacyExamChoices,...saved.filter(Boolean)])];
}
