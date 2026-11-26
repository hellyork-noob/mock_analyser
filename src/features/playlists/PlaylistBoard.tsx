import React, { useState, useEffect, useRef } from 'react';
import { db, type Playlist, type PlaylistVideo } from '../../data/db';
function playlistId(url: string) { try {
    return new URL(url).searchParams.get('list') || '';
}
catch {
    return '';
} }
function videoId(url: string) { try {
    const u = new URL(url);
    return u.hostname === 'youtu.be' ? u.pathname.slice(1) : u.searchParams.get('v') || '';
}
catch {
    return '';
} }
export function PlaylistBoard({ playlists, onChange }: {
    playlists: Playlist[];
    onChange: () => void;
}) {
    const [selected, setSelected] = useState<number | null>(null);
    const [title, setTitle] = useState(''), [url, setUrl] = useState(''), [videoTitle, setVideoTitle] = useState(''), [videoUrl, setVideoUrl] = useState('');
    const [error, setError] = useState(''), [busy, setBusy] = useState(false), [syncingId, setSyncingId] = useState<number | null>(null);
    const [menu, setMenu] = useState<number | null>(null), [addOpen, setAddOpen] = useState(false), [manualOpen, setManualOpen] = useState(false);
    const [search, setSearch] = useState(''), [filter, setFilter] = useState<'all' | 'incomplete' | 'completed'>('all'), [sort, setSort] = useState<'original' | 'title' | 'incomplete'>('original');
    const autoSynced = useRef<number | null>(null);
    const active = playlists.find(p => p.id === selected);
    const videos = active?.videos || [];
    const done = videos.filter(v => v.completed).length;
    const percentage = (completed: number, total: number) => total ? Math.round(completed / total * 100) : 0;
    const cover = (p: Playlist) => p.videos?.find(v => v.thumbnail)?.thumbnail;
    async function patch(id: number, changes: Partial<Playlist>) { await db.playlists.update(id, changes); onChange(); }
    async function add(e: React.FormEvent) { e.preventDefault(); setError(''); try {
        if (!playlistId(url))
            throw new Error('Paste a valid YouTube playlist URL with list=...');
        const id = await db.playlists.add({ title: title.trim(), url, completed: false, videos: [] });
        setTitle('');
        setUrl('');
        setAddOpen(false);
        onChange();
        setSelected(id);
        autoSynced.current = null;
    }
    catch (e) {
        setError(String(e));
    } }
    async function addVideo(e: React.FormEvent) { e.preventDefault(); if (!active?.id)
        return; const id = videoId(videoUrl); if (!id) {
        setError('Enter a valid YouTube video link');
        return;
    } const entries = active.videos || []; if (entries.some(v => v.id === id)) {
        setError('Video already added');
        return;
    } await patch(active.id, { videos: [...entries, { id, title: videoTitle.trim() || 'YouTube video', url: 'https://www.youtube.com/watch?v=' + id, completed: false }] }); setVideoTitle(''); setVideoUrl(''); setError(''); setManualOpen(false); }
    async function sync(playlist: Playlist) { if (!playlist.id)
        return; setError(''); setBusy(true); setSyncingId(playlist.id); try {
        const apiKey = localStorage.getItem('aa_v2_youtube_api_key') || '';
        if (!apiKey.trim())
            throw new Error('Add your YouTube API key in Settings to enable automatic video sync.');
        const id = playlistId(playlist.url);
        if (!id)
            throw new Error('Invalid playlist URL');
        const items: PlaylistVideo[] = [];
        let token = '';
        do {
            const endpoint = new URL('https://www.googleapis.com/youtube/v3/playlistItems');
            endpoint.searchParams.set('part', 'snippet,contentDetails');
            endpoint.searchParams.set('playlistId', id);
            endpoint.searchParams.set('maxResults', '50');
            endpoint.searchParams.set('key', apiKey.trim());
            if (token)
                endpoint.searchParams.set('pageToken', token);
            const response = await fetch(endpoint);
            const result = await response.json();
            if (!response.ok)
                throw new Error(result?.error?.message || 'YouTube API request failed');
            for (const item of result.items || []) {
                const vid = item.contentDetails?.videoId || item.snippet?.resourceId?.videoId;
                if (!vid)
                    continue;
                items.push({ id: vid, title: item.snippet?.title || 'Video', url: 'https://www.youtube.com/watch?v=' + vid, thumbnail: item.snippet?.thumbnails?.medium?.url, completed: !!playlist.videos?.find(v => v.id === vid)?.completed });
            }
            token = result.nextPageToken || '';
            if (items.length >= 1000)
                break;
        } while (token);
        await patch(playlist.id, { videos: items });
    }
    catch (e) {
        setError(e instanceof Error ? e.message : String(e));
    }
    finally {
        setBusy(false);
        setSyncingId(null);
    } }
    useEffect(() => { if (active?.id && autoSynced.current !== active.id) {
        autoSynced.current = active.id;
        if (localStorage.getItem('aa_v2_youtube_api_key'))
            void sync(active);
    } if (!active)
        autoSynced.current = null; }, [active?.id]);
    useEffect(() => { if (menu === null)
        return; function close(e: MouseEvent) { if (!(e.target as HTMLElement).closest('.aa-playlist-menu-wrap'))
        setMenu(null); } document.addEventListener('pointerdown', close); return () => document.removeEventListener('pointerdown', close); }, [menu]);
    const visibleVideos = videos.filter(v => v.title.toLowerCase().includes(search.trim().toLowerCase()) && (filter === 'all' || (filter === 'completed' ? v.completed : !v.completed))).sort((a, b) => sort === 'title' ? a.title.localeCompare(b.title) : sort === 'incomplete' ? Number(a.completed) - Number(b.completed) : videos.indexOf(a) - videos.indexOf(b));
    function openPlaylist(p: Playlist) { setSelected(p.id!); setSearch(''); setFilter('all'); setSort('original'); setMenu(null); setError(''); }
    function continueStudying() { const next = videos.find(v => !v.completed) || videos[0]; if (next)
        window.open(next.url, '_blank', 'noopener,noreferrer'); }
    return <section className="aa-playlists-v3">
  {error && <div className="aa-pl-error" role="alert">{error}<button type="button" onClick={() => setError('')} aria-label="Dismiss error">×</button></div>}
  {!active ? <>
   <div className="aa-pl-library-bar"><div><strong>My Playlists</strong><span>{playlists.length} playlists</span></div><button className="aa-pl-accent-btn" type="button" onClick={() => setAddOpen(x => !x)}>{addOpen ? '× Cancel' : '+ Add Playlist'}</button></div>
   {addOpen && <form className="aa-pl-add-form" onSubmit={add}><input required aria-label="Playlist name" placeholder="Playlist name" value={title} onChange={e => setTitle(e.target.value)}/><input required type="url" aria-label="YouTube playlist URL" placeholder="Paste YouTube playlist URL" value={url} onChange={e => setUrl(e.target.value)}/><button className="aa-pl-accent-btn" type="submit">Save & Sync</button></form>}
   <div className="aa-pl-library-grid">{playlists.map(p => {
                const entries = p.videos || [], completed = entries.filter(v => v.completed).length, percent = percentage(completed, entries.length), thumb = cover(p);
                return <article className="aa-pl-card" key={p.id}>
    <button className="aa-pl-card-open" type="button" onClick={() => openPlaylist(p)} aria-label={'Open ' + p.title}><div className="aa-pl-cover">{thumb ? <img src={thumb} alt="" loading="lazy"/> : <span>▶</span>}</div><div className="aa-pl-card-info"><strong>{p.title}</strong><div className="aa-pl-card-meta"><span>{entries.length} videos · {completed} completed</span><b>{percent}%</b></div><div className="aa-pl-track"><span style={{ width: percent + '%' }}/></div></div></button>
    <div className="aa-playlist-menu-wrap"><button type="button" className="aa-pl-menu-toggle" aria-label={'Options for ' + p.title} aria-expanded={menu === p.id} onClick={() => setMenu(menu === p.id ? null : p.id!)}>⋯</button>{menu === p.id && <div className="aa-pl-menu"><button type="button" onClick={() => { const name = prompt('Rename playlist', p.title); if (name?.trim())
                    void patch(p.id!, { title: name.trim() }); setMenu(null); }}>Rename</button><button type="button" disabled={busy} onClick={() => { setMenu(null); void sync(p); }}>Refresh videos</button><button type="button" className="aa-pl-danger" onClick={() => { setMenu(null); if (confirm('Delete playlist?'))
                    void db.playlists.delete(p.id!).then(onChange); }}>Delete playlist</button></div>}</div>
   </article>;
            })}</div>
   {!playlists.length && <div className="aa-pl-empty">No playlists yet. Add a YouTube playlist to get started.</div>}
  </> : <>
   <div className="aa-pl-detail-top"><button type="button" className="aa-pl-back" onClick={() => { setSelected(null); setError(''); setManualOpen(false); }}>← Back to Playlists</button><div className="aa-pl-detail-actions"><button type="button" className="aa-pl-quiet-btn" disabled={busy} onClick={() => void sync(active)}>{syncingId === active.id ? 'Syncing…' : '↻ Refresh'}</button><a className="aa-pl-quiet-btn" href={active.url} target="_blank" rel="noreferrer">YouTube ↗</a></div></div>
   <div className="aa-pl-detail-heading"><div className="aa-pl-detail-cover">{cover(active) ? <img src={cover(active)} alt=""/> : <span>▶</span>}</div><div className="aa-pl-detail-heading-info"><h2>{active.title}</h2><div className="aa-pl-muted">{videos.length} videos · {done} completed · {percentage(done, videos.length)}%</div><div className="aa-pl-track"><span style={{ width: percentage(done, videos.length) + '%' }}/></div></div><button className="aa-pl-accent-btn aa-pl-continue" type="button" disabled={!videos.length} onClick={continueStudying}>▶ Continue Studying</button></div>
   <div className="aa-pl-video-toolbar"><strong>Videos <span>({videos.length})</span></strong><div className="aa-pl-video-controls"><input aria-label="Search videos" placeholder="Search videos…" value={search} onChange={e => setSearch(e.target.value)}/><select aria-label="Video order" value={sort} onChange={e => setSort(e.target.value as typeof sort)}><option value="original">Original order</option><option value="title">Title A–Z</option><option value="incomplete">Unfinished first</option></select><select aria-label="Video completion filter" value={filter} onChange={e => setFilter(e.target.value as typeof filter)}><option value="all">All videos</option><option value="incomplete">Unfinished</option><option value="completed">Completed</option></select><button className="aa-pl-quiet-btn" type="button" onClick={() => setManualOpen(x => !x)}>{manualOpen ? '× Cancel' : '+ Add video'}</button></div></div>
   {manualOpen && <form className="aa-pl-add-form" onSubmit={addVideo}><input required aria-label="Video title" placeholder="Video title" value={videoTitle} onChange={e => setVideoTitle(e.target.value)}/><input required type="url" aria-label="YouTube video URL" placeholder="YouTube video URL" value={videoUrl} onChange={e => setVideoUrl(e.target.value)}/><button className="aa-pl-accent-btn" type="submit">Add video</button></form>}
   <div className="aa-pl-video-list">{visibleVideos.map(v => { const position = videos.indexOf(v) + 1; return <div className={'aa-pl-video-row' + (v.completed ? ' is-done' : '')} key={v.id}><a href={v.url} target="_blank" rel="noreferrer" className="aa-pl-video-link"><div className="aa-pl-video-thumb">{v.thumbnail ? <img src={v.thumbnail} alt="" loading="lazy"/> : <span>▶</span>}</div><div className="aa-pl-video-title"><strong>{position}. {v.title}</strong><small>{v.completed ? 'Completed' : 'Watch on YouTube ↗'}</small></div></a><label className="aa-pl-video-check" title="Mark video complete"><input type="checkbox" checked={v.completed} onChange={e => void patch(active.id!, { videos: videos.map(x => x.id === v.id ? { ...x, completed: e.target.checked } : x) })}/><span aria-hidden="true">✓</span></label><button className="aa-pl-remove-video" type="button" title="Remove video" aria-label={'Remove ' + v.title} onClick={() => { if (confirm('Remove this video from the playlist?'))
            void patch(active.id!, { videos: videos.filter(x => x.id !== v.id) }); }}>×</button></div>; })}{!visibleVideos.length && <div className="aa-pl-empty">{videos.length ? 'No videos match your filters.' : 'No videos yet. Refresh to synchronize from YouTube.'}</div>}</div>
  </>}
 </section>;
}
