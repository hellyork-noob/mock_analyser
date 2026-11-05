import React,{useState,useEffect,useRef} from 'react';
import {db,type Exam,type Playlist,type PlaylistVideo} from './db';

const btn:React.CSSProperties={padding:'8px 12px',borderRadius:9,cursor:'pointer'};
const panel:React.CSSProperties={padding:18,border:'1px solid #8884',borderRadius:14,marginBottom:12};
const grid:React.CSSProperties={display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(230px,1fr))',gap:12};
function daysUntil(date:string){const now=new Date();const today=Date.UTC(now.getFullYear(),now.getMonth(),now.getDate());return Math.round((Date.parse(date+'T00:00:00Z')-today)/86400000)}
export function CountdownBoard({exams,onChange}:{exams:Exam[];onChange:()=>void}){
 const [showPast,setShowPast]=useState(false);
 const [editing,setEditing]=useState<Exam|null>(null),[name,setName]=useState(''),[date,setDate]=useState(''),[error,setError]=useState('');
 function edit(e?:Exam){setEditing(e??null);setName(e?.name??'');setDate(e?.date??'');setError('')}
 async function save(e:React.FormEvent){e.preventDefault();setError('');try{if(!name.trim()||!date||!Number.isFinite(daysUntil(date)))throw new Error('Enter a valid exam name and date');if(editing?.id)await db.exams.update(editing.id,{name:name.trim(),date});else await db.exams.add({name:name.trim(),date});edit();onChange()}catch(err){setError(err instanceof Error?err.message:String(err))}}
 const upcoming=[...exams].filter(e=>daysUntil(e.date)>=0).sort((a,b)=>daysUntil(a.date)-daysUntil(b.date));
 const nearest=upcoming[0];
 const remaining=[...exams].filter(e=>(showPast||daysUntil(e.date)>=0)&&e.id!==nearest?.id).sort((a,b)=>{const da=daysUntil(a.date),dbb=daysUntil(b.date);return (da<0?1:0)-(dbb<0?1:0)||Math.abs(da)-Math.abs(dbb)});
 const urgency=(d:number)=>d<0?'past':d<=10?'urgent':d<=30?'near':d<=100?'soon':'far';
 const label=(d:number)=>d<0?'Past exam':d<=10?'Very close':d<=30?'Approaching':d<=100?'Upcoming':'Far away';
 return <section className="v21-countdown">
  <div className="v21-countdown-top">
   <article className={'panel v21-next-exam '+(nearest?'v21-urgency-'+urgency(daysUntil(nearest.date)):'')}>
    <div className="v21-countdown-eyebrow">NEXT UPCOMING EXAM</div>
    {nearest?<><h2>{nearest.name}</h2><div className="v21-countdown-date">{nearest.date}</div><div className="v21-countdown-days"><strong>{daysUntil(nearest.date)}</strong><span>days remaining</span></div>{daysUntil(nearest.date)<=10&&<div className="v21-countdown-alert">Prepare for exam day</div>}</>:<><h2>No upcoming exam</h2><p>Add your next exam to start the countdown.</p></>}
   </article>
   <form className="panel v21-countdown-add" onSubmit={save}>
    <div className="v21-countdown-eyebrow">{editing?'EDIT COUNTDOWN':'ADD NEW EXAM'}</div>
    <label>Exam name<input required value={name} onChange={e=>setName(e.target.value)} placeholder="e.g. SSC CGL Tier 1"/></label>
    <label>Exam date<input required type="date" value={date} onChange={e=>setDate(e.target.value)}/></label>
    <div className="v21-countdown-actions"><button className="primary" type="submit">{editing?'Save changes':'+ Add exam'}</button>{editing&&<button className="secondary" type="button" onClick={()=>edit()}>Cancel</button>}</div>
    {error&&<p className="error" role="alert">{error}</p>}
   </form>
  </div>
  <div className="v21-countdown-list-head"><strong>{upcoming.length} upcoming exam{upcoming.length===1?'':'s'}</strong><label><input type="checkbox" checked={showPast} onChange={e=>setShowPast(e.target.checked)}/> Show past exams</label></div>
  <div className="v21-countdown-grid">{remaining.map(e=>{
   const d=daysUntil(e.date);
   const past=d<0;
   const displayDate=new Date(e.date+'T00:00:00');
   const formattedDate=Number.isNaN(displayDate.getTime())?e.date:displayDate.toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'});
   return <article className={'panel v21-countdown-card v21-urgency-'+urgency(d)} key={e.id}>
    <div className="v21-countdown-card-main">
     <div className="v21-countdown-card-info">
      <strong className="v21-countdown-card-name" title={e.name}>{e.name}</strong>
      <time dateTime={e.date}>{formattedDate}</time>
     </div>
     <div className={'v21-countdown-card-status'+(past?' is-past':'')}>
      {past?<span className="v21-countdown-past-pill">Passed</span>:<><strong>{d}</strong><small>days left</small></>}
     </div>
    </div>
    <div className="v21-countdown-card-footer">
     <span className="v21-countdown-card-category">{label(d)}</span>
     <div className="v21-countdown-card-tools">
      <button className="v21-countdown-tool" type="button" title={'Edit '+e.name} aria-label={'Edit '+e.name} onClick={()=>edit(e)}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L9 17l-4 1 1-4Z"/></svg></button>
      <button className="v21-countdown-tool v21-countdown-tool-danger" type="button" title={'Delete '+e.name} aria-label={'Delete '+e.name} onClick={async()=>{if(confirm('Delete this countdown?')){await db.exams.delete(e.id!);if(editing?.id===e.id)edit();onChange()}}}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h18M8 6V4h8v2m3 0-1 14H6L5 6m5 4v7m4-7v7"/></svg></button>
     </div>
    </div>
   </article>
  })}</div>
  {!remaining.length&&<div className="v21-countdown-empty">{nearest?'No other exams to display.':'No countdowns to display.'}</div>}
 </section>
}

function playlistId(url:string){try{return new URL(url).searchParams.get('list')||''}catch{return ''}}
function videoId(url:string){try{const u=new URL(url);return u.hostname==='youtu.be'?u.pathname.slice(1):u.searchParams.get('v')||''}catch{return ''}}
export function PlaylistBoard({playlists,onChange}:{playlists:Playlist[];onChange:()=>void}){
 const [selected,setSelected]=useState<number|null>(null);
 const [title,setTitle]=useState(''),[url,setUrl]=useState(''),[videoTitle,setVideoTitle]=useState(''),[videoUrl,setVideoUrl]=useState('');
 const [error,setError]=useState(''),[busy,setBusy]=useState(false),[syncingId,setSyncingId]=useState<number|null>(null);
 const [menu,setMenu]=useState<number|null>(null),[addOpen,setAddOpen]=useState(false),[manualOpen,setManualOpen]=useState(false);
 const [search,setSearch]=useState(''),[filter,setFilter]=useState<'all'|'incomplete'|'completed'>('all'),[sort,setSort]=useState<'original'|'title'|'incomplete'>('original');
 const autoSynced=useRef<number|null>(null);
 const active=playlists.find(p=>p.id===selected);
 const videos=active?.videos||[];
 const done=videos.filter(v=>v.completed).length;
 const percentage=(completed:number,total:number)=>total?Math.round(completed/total*100):0;
 const cover=(p:Playlist)=>p.videos?.find(v=>v.thumbnail)?.thumbnail;
 async function patch(id:number,changes:Partial<Playlist>){await db.playlists.update(id,changes);onChange()}
 async function add(e:React.FormEvent){e.preventDefault();setError('');try{if(!playlistId(url))throw new Error('Paste a valid YouTube playlist URL with list=...');const id=await db.playlists.add({title:title.trim(),url,completed:false,videos:[]});setTitle('');setUrl('');setAddOpen(false);onChange();setSelected(id);autoSynced.current=null}catch(e){setError(String(e))}}
 async function addVideo(e:React.FormEvent){e.preventDefault();if(!active?.id)return;const id=videoId(videoUrl);if(!id){setError('Enter a valid YouTube video link');return}const entries=active.videos||[];if(entries.some(v=>v.id===id)){setError('Video already added');return}await patch(active.id,{videos:[...entries,{id,title:videoTitle.trim()||'YouTube video',url:'https://www.youtube.com/watch?v='+id,completed:false}]});setVideoTitle('');setVideoUrl('');setError('');setManualOpen(false)}
 async function sync(playlist:Playlist){if(!playlist.id)return;setError('');setBusy(true);setSyncingId(playlist.id);try{const apiKey=localStorage.getItem('aa_v2_youtube_api_key')||'';if(!apiKey.trim())throw new Error('Add your YouTube API key in Settings to enable automatic video sync.');const id=playlistId(playlist.url);if(!id)throw new Error('Invalid playlist URL');const items:PlaylistVideo[]=[];let token='';do{const endpoint=new URL('https://www.googleapis.com/youtube/v3/playlistItems');endpoint.searchParams.set('part','snippet,contentDetails');endpoint.searchParams.set('playlistId',id);endpoint.searchParams.set('maxResults','50');endpoint.searchParams.set('key',apiKey.trim());if(token)endpoint.searchParams.set('pageToken',token);const response=await fetch(endpoint);const result=await response.json();if(!response.ok)throw new Error(result?.error?.message||'YouTube API request failed');for(const item of result.items||[]){const vid=item.contentDetails?.videoId||item.snippet?.resourceId?.videoId;if(!vid)continue;items.push({id:vid,title:item.snippet?.title||'Video',url:'https://www.youtube.com/watch?v='+vid,thumbnail:item.snippet?.thumbnails?.medium?.url,completed:!!playlist.videos?.find(v=>v.id===vid)?.completed})}token=result.nextPageToken||'';if(items.length>=1000)break}while(token);await patch(playlist.id,{videos:items})}catch(e){setError(e instanceof Error?e.message:String(e))}finally{setBusy(false);setSyncingId(null)}}
 useEffect(()=>{if(active?.id&&autoSynced.current!==active.id){autoSynced.current=active.id;if(localStorage.getItem('aa_v2_youtube_api_key'))void sync(active)}if(!active)autoSynced.current=null},[active?.id]);
 useEffect(()=>{if(menu===null)return;function close(e:MouseEvent){if(!(e.target as HTMLElement).closest('.aa-playlist-menu-wrap'))setMenu(null)}document.addEventListener('pointerdown',close);return()=>document.removeEventListener('pointerdown',close)},[menu]);
 const visibleVideos=videos.filter(v=>v.title.toLowerCase().includes(search.trim().toLowerCase())&&(filter==='all'||(filter==='completed'?v.completed:!v.completed))).sort((a,b)=>sort==='title'?a.title.localeCompare(b.title):sort==='incomplete'?Number(a.completed)-Number(b.completed):videos.indexOf(a)-videos.indexOf(b));
 function openPlaylist(p:Playlist){setSelected(p.id!);setSearch('');setFilter('all');setSort('original');setMenu(null);setError('')}
 function continueStudying(){const next=videos.find(v=>!v.completed)||videos[0];if(next)window.open(next.url,'_blank','noopener,noreferrer')}
 return <section className="aa-playlists-v3">
  {error&&<div className="aa-pl-error" role="alert">{error}<button type="button" onClick={()=>setError('')} aria-label="Dismiss error">×</button></div>}
  {!active?<>
   <div className="aa-pl-library-bar"><div><strong>My Playlists</strong><span>{playlists.length} playlists</span></div><button className="aa-pl-accent-btn" type="button" onClick={()=>setAddOpen(x=>!x)}>{addOpen?'× Cancel':'+ Add Playlist'}</button></div>
   {addOpen&&<form className="aa-pl-add-form" onSubmit={add}><input required aria-label="Playlist name" placeholder="Playlist name" value={title} onChange={e=>setTitle(e.target.value)}/><input required type="url" aria-label="YouTube playlist URL" placeholder="Paste YouTube playlist URL" value={url} onChange={e=>setUrl(e.target.value)}/><button className="aa-pl-accent-btn" type="submit">Save & Sync</button></form>}
   <div className="aa-pl-library-grid">{playlists.map(p=>{const entries=p.videos||[],completed=entries.filter(v=>v.completed).length,percent=percentage(completed,entries.length),thumb=cover(p);return <article className="aa-pl-card" key={p.id}>
    <button className="aa-pl-card-open" type="button" onClick={()=>openPlaylist(p)} aria-label={'Open '+p.title}><div className="aa-pl-cover">{thumb?<img src={thumb} alt="" loading="lazy"/>:<span>▶</span>}</div><div className="aa-pl-card-info"><strong>{p.title}</strong><div className="aa-pl-card-meta"><span>{entries.length} videos · {completed} completed</span><b>{percent}%</b></div><div className="aa-pl-track"><span style={{width:percent+'%'}}/></div></div></button>
    <div className="aa-playlist-menu-wrap"><button type="button" className="aa-pl-menu-toggle" aria-label={'Options for '+p.title} aria-expanded={menu===p.id} onClick={()=>setMenu(menu===p.id?null:p.id!)}>⋯</button>{menu===p.id&&<div className="aa-pl-menu"><button type="button" onClick={()=>{const name=prompt('Rename playlist',p.title);if(name?.trim())void patch(p.id!,{title:name.trim()});setMenu(null)}}>Rename</button><button type="button" disabled={busy} onClick={()=>{setMenu(null);void sync(p)}}>Refresh videos</button><button type="button" className="aa-pl-danger" onClick={()=>{setMenu(null);if(confirm('Delete playlist?'))void db.playlists.delete(p.id!).then(onChange)}}>Delete playlist</button></div>}</div>
   </article>})}</div>
   {!playlists.length&&<div className="aa-pl-empty">No playlists yet. Add a YouTube playlist to get started.</div>}
  </>:<>
   <div className="aa-pl-detail-top"><button type="button" className="aa-pl-back" onClick={()=>{setSelected(null);setError('');setManualOpen(false)}}>← Back to Playlists</button><div className="aa-pl-detail-actions"><button type="button" className="aa-pl-quiet-btn" disabled={busy} onClick={()=>void sync(active)}>{syncingId===active.id?'Syncing…':'↻ Refresh'}</button><a className="aa-pl-quiet-btn" href={active.url} target="_blank" rel="noreferrer">YouTube ↗</a></div></div>
   <div className="aa-pl-detail-heading"><div className="aa-pl-detail-cover">{cover(active)?<img src={cover(active)} alt=""/>:<span>▶</span>}</div><div className="aa-pl-detail-heading-info"><h2>{active.title}</h2><div className="aa-pl-muted">{videos.length} videos · {done} completed · {percentage(done,videos.length)}%</div><div className="aa-pl-track"><span style={{width:percentage(done,videos.length)+'%'}}/></div></div><button className="aa-pl-accent-btn aa-pl-continue" type="button" disabled={!videos.length} onClick={continueStudying}>▶ Continue Studying</button></div>
   <div className="aa-pl-video-toolbar"><strong>Videos <span>({videos.length})</span></strong><div className="aa-pl-video-controls"><input aria-label="Search videos" placeholder="Search videos…" value={search} onChange={e=>setSearch(e.target.value)}/><select aria-label="Video order" value={sort} onChange={e=>setSort(e.target.value as typeof sort)}><option value="original">Original order</option><option value="title">Title A–Z</option><option value="incomplete">Unfinished first</option></select><select aria-label="Video completion filter" value={filter} onChange={e=>setFilter(e.target.value as typeof filter)}><option value="all">All videos</option><option value="incomplete">Unfinished</option><option value="completed">Completed</option></select><button className="aa-pl-quiet-btn" type="button" onClick={()=>setManualOpen(x=>!x)}>{manualOpen?'× Cancel':'+ Add video'}</button></div></div>
   {manualOpen&&<form className="aa-pl-add-form" onSubmit={addVideo}><input required aria-label="Video title" placeholder="Video title" value={videoTitle} onChange={e=>setVideoTitle(e.target.value)}/><input required type="url" aria-label="YouTube video URL" placeholder="YouTube video URL" value={videoUrl} onChange={e=>setVideoUrl(e.target.value)}/><button className="aa-pl-accent-btn" type="submit">Add video</button></form>}
   <div className="aa-pl-video-list">{visibleVideos.map(v=>{const position=videos.indexOf(v)+1;return <div className={'aa-pl-video-row'+(v.completed?' is-done':'')} key={v.id}><a href={v.url} target="_blank" rel="noreferrer" className="aa-pl-video-link"><div className="aa-pl-video-thumb">{v.thumbnail?<img src={v.thumbnail} alt="" loading="lazy"/>:<span>▶</span>}</div><div className="aa-pl-video-title"><strong>{position}. {v.title}</strong><small>{v.completed?'Completed':'Watch on YouTube ↗'}</small></div></a><label className="aa-pl-video-check" title="Mark video complete"><input type="checkbox" checked={v.completed} onChange={e=>void patch(active.id!,{videos:videos.map(x=>x.id===v.id?{...x,completed:e.target.checked}:x)})}/><span aria-hidden="true">✓</span></label><button className="aa-pl-remove-video" type="button" title="Remove video" aria-label={'Remove '+v.title} onClick={()=>{if(confirm('Remove this video from the playlist?'))void patch(active.id!,{videos:videos.filter(x=>x.id!==v.id)})}}>×</button></div>})}{!visibleVideos.length&&<div className="aa-pl-empty">{videos.length?'No videos match your filters.':'No videos yet. Refresh to synchronize from YouTube.'}</div>}</div>
  </>}
 </section>
}
