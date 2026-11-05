import Dexie, {type Table} from 'dexie';
import {db,importBackup,type Mock,type Exam,type Playlist,type CustomExamProfile} from './db';

export type BackupPayload={app:'Advance Analyzer v2';schema:2;exportedAt:string;mocks:Mock[];exams:Exam[];playlists:Playlist[];customExamProfiles:CustomExamProfile[]};
export type BackupSnapshot={id?:number;createdAt:string;fingerprint:string;total:number;payload:BackupPayload};
class BackupVault extends Dexie{
 snapshots!:Table<BackupSnapshot,number>;
 constructor(){super('advance_analyzer_v2_backup_vault');this.version(1).stores({snapshots:'++id,createdAt'});}
}
const vault=new BackupVault();
let inFlight:Promise<boolean>|null=null;
const MAX_SNAPSHOTS=15;

export async function captureSnapshot():Promise<boolean>{
 if(inFlight)return inFlight;
 inFlight=(async()=>{
  // A single readonly transaction provides a consistent point-in-time snapshot.
  const [mocks,exams,playlists,customExamProfiles]=await db.transaction('r',db.mocks,db.exams,db.playlists,db.customExamProfiles,async()=>Promise.all([
   db.mocks.toArray(),db.exams.toArray(),db.playlists.toArray(),db.customExamProfiles.toArray()
  ]));
  const total=mocks.length+exams.length+playlists.length+customExamProfiles.length;
  // Never let an empty workspace overwrite a usable snapshot.
  if(total===0)return false;
  const records={mocks,exams,playlists,customExamProfiles};
  const fingerprint=JSON.stringify(records);
  const latest=await vault.snapshots.orderBy('id').last();
  if(latest?.fingerprint===fingerprint)return false;
  const createdAt=new Date().toISOString();
  const payload:BackupPayload={app:'Advance Analyzer v2',schema:2,exportedAt:createdAt,...records};
  await vault.transaction('rw',vault.snapshots,async()=>{
   await vault.snapshots.add({createdAt,fingerprint,total,payload});
   const old=await vault.snapshots.orderBy('id').reverse().offset(MAX_SNAPSHOTS).primaryKeys();
   if(old.length)await vault.snapshots.bulkDelete(old);
  });
  return true;
 })().finally(()=>{inFlight=null});
 return inFlight;
}
export async function listSnapshots():Promise<Array<{id:number;createdAt:string;total:number}>>{
 return (await vault.snapshots.orderBy('id').reverse().toArray()).map(s=>({id:s.id!,createdAt:s.createdAt,total:s.total}));
}
export async function getSnapshot(id:number):Promise<BackupSnapshot>{
 const snapshot=await vault.snapshots.get(id);
 if(!snapshot)throw new Error('Snapshot not found');
 return snapshot;
}
export async function restoreSnapshot(id:number):Promise<void>{
 const {payload}=await getSnapshot(id);
 await importBackup(payload);
}
export async function downloadSnapshot(id:number):Promise<void>{
 const {payload}=await getSnapshot(id);
 const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});
 const url=URL.createObjectURL(blob);
 try{
  const link=document.createElement('a');link.href=url;
  link.download=`advance-analyzer-auto-backup-${new Date().toISOString().replace(/[:.]/g,'-')}.json`;
  document.body.appendChild(link);link.click();link.remove();
 }finally{setTimeout(()=>URL.revokeObjectURL(url),10000)}
}
export async function requestPersistentStorage():Promise<boolean>{
 if(!navigator.storage?.persist)return false;
 return navigator.storage.persist();
}
export async function isStoragePersistent():Promise<boolean>{return !!(await navigator.storage?.persisted?.());}
