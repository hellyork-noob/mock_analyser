import Dexie, {type Table} from 'dexie';
export type SectionResult={subject:string;correct:number;incorrect:number;unattempted:number;score:number;maxScore:number;sectionType?:'main'|'qualifying';timeMinutes?:number};
export type Mock={sections?:SectionResult[];id?:number;exam:string;title:string;date:string;score:number;maxScore:number;correct:number;incorrect:number;unattempted:number;subject:string;url?:string;timeMinutes?:number;sectionTimeMinutes?:number;provider?:string;mockName?:string;percentile?:number};
export type ExamSectionConfig={name:string;questions:number;positive:number;negative:number;maxMarks:number;sectionType?:'main'|'qualifying';qualifyingThreshold?:number};
export type CustomExamProfile={id?:number;name:string;tier:string;key:string;durationMinutes:number;targetScore?:number;subjectTargets?:Record<string,number>;sections:ExamSectionConfig[];createdAt:string};
export type Exam={id?:number;name:string;date:string};
export type PlaylistVideo={id:string;title:string;url:string;thumbnail?:string;completed:boolean};
export type Playlist={id?:number;title:string;url:string;completed:boolean;videos?:PlaylistVideo[]};
class AnalyzerDB extends Dexie{mocks!:Table<Mock,number>;exams!:Table<Exam,number>;playlists!:Table<Playlist,number>;customExamProfiles!:Table<CustomExamProfile,number>;constructor(){super('advance_analyzer_v2_clean_phase5a');this.version(1).stores({mocks:'++id,exam,date,subject',exams:'++id,date',playlists:'++id'});this.version(2).stores({mocks:'++id,exam,date,subject',exams:'++id,date',playlists:'++id',customExamProfiles:'++id,&key'});}}
export const db=new AnalyzerDB();
export async function exportBackup(){const payload={app:'Advance Analyzer v2',schema:2,exportedAt:new Date().toISOString(),mocks:await db.mocks.toArray(),exams:await db.exams.toArray(),playlists:await db.playlists.toArray(),customExamProfiles:await db.customExamProfiles.toArray()};const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='advance-analyzer-v2-clean-phase5a-backup.json';a.click();URL.revokeObjectURL(url);}
/** Restore a complete v2 backup atomically. No database deletion or schema migration. */
export async function importBackup(value:unknown):Promise<void>{
 if(!value||typeof value!=='object')throw new Error('Invalid backup file');
 const data=value as Record<string,unknown>;
 if(data.app!=='Advance Analyzer v2')throw new Error('This is not an Advance Analyzer v2 backup');
 for(const key of ['mocks','exams','playlists','customExamProfiles'])if(!Array.isArray(data[key]))throw new Error('Backup is missing '+key);
 const mocks=data.mocks as Mock[],exams=data.exams as Exam[],playlists=data.playlists as Playlist[],profiles=data.customExamProfiles as CustomExamProfile[];
 if(mocks.some(m=>!m||typeof m.exam!=='string'||typeof m.title!=='string'||typeof m.score!=='number'||typeof m.maxScore!=='number'))throw new Error('Invalid mock records');
 if(profiles.some(p=>!p||typeof p.key!=='string'||!Array.isArray(p.sections)))throw new Error('Invalid exam profiles');
 if(exams.some(e=>!e||typeof e.name!=='string'||typeof e.date!=='string'))throw new Error('Invalid countdown records');
 if(playlists.some(p=>!p||typeof p.title!=='string'||typeof p.url!=='string'))throw new Error('Invalid playlist records');
 await db.transaction('rw',db.mocks,db.exams,db.playlists,db.customExamProfiles,async()=>{
  await Promise.all([db.mocks.clear(),db.exams.clear(),db.playlists.clear(),db.customExamProfiles.clear()]);
  if(mocks.length)await db.mocks.bulkAdd(mocks);
  if(exams.length)await db.exams.bulkAdd(exams);
  if(playlists.length)await db.playlists.bulkAdd(playlists);
  if(profiles.length)await db.customExamProfiles.bulkAdd(profiles);
 });
}
