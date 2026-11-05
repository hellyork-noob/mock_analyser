import React,{useState} from 'react';
export function YouTubeApiSettings(){
 const [key,setKey]=useState(()=>localStorage.getItem('aa_v2_youtube_api_key')||'');
 const [show,setShow]=useState(false);const [saved,setSaved]=useState(false);
 return <div className="settingrow"><div><strong>YouTube Data API v3</strong><small>Used to automatically synchronize playlist videos when a playlist is added or opened. Your key stays in this browser.</small></div><div style={{display:'flex',gap:6,flexWrap:'wrap',alignItems:'center'}}><input aria-label="YouTube API key" type={show?'text':'password'} placeholder="Paste YouTube API key" value={key} onChange={e=>{setKey(e.target.value);setSaved(false)}}/><button className="secondary" onClick={()=>setShow(v=>!v)}>{show?'Hide':'Show'}</button><button className="secondary" onClick={()=>{localStorage.setItem('aa_v2_youtube_api_key',key.trim());setSaved(true)}}>Save key</button>{saved&&<small>Saved</small>}</div></div>
}
