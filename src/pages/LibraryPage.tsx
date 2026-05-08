import { useEffect, useState, useRef } from 'react'
import { Upload, Search, Play, Image, Music, Grid, List } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { db } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { PLATFORM_MAP } from '@/constants/platforms'
import type { UserAsset, ContentPiece } from '@/types/database'
import { format } from 'date-fns'

type ViewMode = 'grid' | 'list'
type AssetFilter = 'all' | 'video' | 'image' | 'audio'

function formatBytes(bytes: number) {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / 1024 / 1024).toFixed(1) + ' MB'
}

export function LibraryPage() {
  const { user } = useAuth()
  const [assets, setAssets] = useState<UserAsset[]>([])
  const [pieces, setPieces] = useState<ContentPiece[]>([])
  const [view, setView] = useState<ViewMode>('grid')
  const [filter, setFilter] = useState<AssetFilter>('all')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [activeTab, setActiveTab] = useState<'uploads' | 'generated'>('generated')
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!user) return
    Promise.all([
      db.from('user_assets').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
      db.from('content_pieces').select('*').eq('user_id', user.id).not('video_url', 'is', null).order('posted_at', { ascending: false }),
    ]).then(([assetsRes, piecesRes]) => {
      setAssets(assetsRes.data || [])
      setPieces(piecesRes.data || [])
      setLoading(false)
    })
  }, [user])

  async function handleUpload(files: FileList | null) {
    if (!files || !user) return
    setUploading(true)
    for (const file of Array.from(files)) {
      const ext = file.name.split('.').pop()
      const path = `${user.id}/${Date.now()}.${ext}`
      const { data: uploadData, error } = await supabase.storage.from('user-assets').upload(path, file)
      if (!error && uploadData) {
        const { data: urlData } = supabase.storage.from('user-assets').getPublicUrl(path)
        const type = file.type.startsWith('video') ? 'video' : file.type.startsWith('audio') ? 'audio' : 'image'
        const { data: asset } = await db.from('user_assets').insert({
          user_id: user.id,
          file_url: urlData.publicUrl,
          file_type: type,
          name: file.name,
          tags: [],
          size_bytes: file.size,
        }).select().single()
        if (asset) setAssets(prev => [asset, ...prev])
      }
    }
    setUploading(false)
  }

  const filteredAssets = assets.filter(a =>
    (filter === 'all' || a.file_type === filter) &&
    (search === '' || a.name.toLowerCase().includes(search.toLowerCase()))
  )

  const AssetIcon = ({ type }: { type: string }) => {
    if (type === 'video') return <Play size={20} color="#00B4D8" />
    if (type === 'audio') return <Music size={20} color="#FFB547" />
    return <Image size={20} color="#00E5A0" />
  }

  return (
    <div style={{ padding: 28, maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontFamily: 'Syne', fontSize: 24, fontWeight: 700, color: '#F0F4F8', marginBottom: 4 }}>Library</h1>
          <p style={{ color: '#8B9EB0', fontSize: 14 }}>{assets.length} uploaded · {pieces.length} AI-generated</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="btn-primary"
            style={{ fontSize: 13 }}
          >
            <Upload size={14} /> {uploading ? 'Uploading…' : 'Upload Assets'}
          </button>
          <input ref={fileRef} type="file" multiple accept="video/*,image/*,audio/*" style={{ display: 'none' }} onChange={e => handleUpload(e.target.files)} />
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 20, background: '#0F1318', border: '1px solid #1E2A36', borderRadius: 8, padding: 4, width: 'fit-content' }}>
        {[{ id: 'generated', label: 'AI Generated' }, { id: 'uploads', label: 'My Uploads' }].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
            style={{ padding: '6px 16px', borderRadius: 6, background: activeTab === tab.id ? '#161C24' : 'transparent', color: activeTab === tab.id ? '#F0F4F8' : '#8B9EB0', border: 'none', cursor: 'pointer', fontSize: 13, fontFamily: 'Syne', fontWeight: 600, transition: 'all 0.15s' }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Toolbar */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, alignItems: 'center' }}>
        <div style={{ flex: 1, position: 'relative', maxWidth: 300 }}>
          <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#4A5E70' }} />
          <input className="input-base" placeholder="Search assets…" value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: 36 }} />
        </div>
        {activeTab === 'uploads' && (
          <div style={{ display: 'flex', gap: 6 }}>
            {(['all', 'video', 'image', 'audio'] as const).map(f => (
              <button key={f} onClick={() => setFilter(f)} style={{ padding: '6px 12px', borderRadius: 20, border: `1px solid ${filter === f ? '#00E5A0' : '#1E2A36'}`, background: filter === f ? 'rgba(0,229,160,0.1)' : 'transparent', color: filter === f ? '#00E5A0' : '#8B9EB0', fontSize: 12, cursor: 'pointer', fontFamily: 'DM Sans', textTransform: 'capitalize' }}>
                {f}
              </button>
            ))}
          </div>
        )}
        <div style={{ display: 'flex', gap: 4, marginLeft: 'auto' }}>
          {([{ icon: <Grid size={14} />, id: 'grid' }, { icon: <List size={14} />, id: 'list' }] as const).map(v => (
            <button key={v.id} onClick={() => setView(v.id)} style={{ padding: '6px 10px', borderRadius: 6, background: view === v.id ? '#1E2A36' : 'transparent', border: 'none', color: view === v.id ? '#F0F4F8' : '#4A5E70', cursor: 'pointer' }}>
              {v.icon}
            </button>
          ))}
        </div>
      </div>

      {/* Drag and drop zone */}
      {activeTab === 'uploads' && filteredAssets.length === 0 && !loading && (
        <div
          onClick={() => fileRef.current?.click()}
          style={{
            border: '2px dashed #1E2A36', borderRadius: 16, padding: 60, textAlign: 'center', cursor: 'pointer',
            background: 'rgba(30,42,54,0.2)', transition: 'all 0.2s',
          }}
          onDragOver={e => { e.preventDefault(); (e.currentTarget as HTMLDivElement).style.borderColor = '#00E5A0' }}
          onDragLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = '#1E2A36' }}
          onDrop={e => { e.preventDefault(); handleUpload(e.dataTransfer.files) }}
        >
          <Upload size={32} color="#4A5E70" style={{ margin: '0 auto 12px' }} />
          <div style={{ fontSize: 16, fontFamily: 'Syne', fontWeight: 600, color: '#F0F4F8', marginBottom: 8 }}>Drop files here or click to upload</div>
          <div style={{ fontSize: 13, color: '#8B9EB0' }}>Video, images, and audio files supported</div>
        </div>
      )}

      {/* Generated content */}
      {loading && activeTab === 'generated' ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
          {[0,1,2,3,4,5].map(i => <div key={i} className="animate-shimmer" style={{ height: 180, borderRadius: 10 }} />)}
        </div>
      ) : activeTab === 'generated' && (
        view === 'grid' ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
            {pieces.map(piece => (
              <div key={piece.id} className="card card-hover" style={{ padding: 0, overflow: 'hidden', cursor: 'pointer' }}>
                <div style={{ height: 140, background: '#161C24', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                  {piece.thumbnail_url ? (
                    <img src={piece.thumbnail_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 32 }}>{PLATFORM_MAP[piece.platform]?.icon}</div>
                    </div>
                  )}
                  <div style={{ position: 'absolute', top: 8, left: 8 }}>
                    <span style={{ background: 'rgba(8,11,15,0.8)', padding: '3px 8px', borderRadius: 20, fontSize: 10, color: '#F0F4F8', fontFamily: 'JetBrains Mono' }}>
                      {PLATFORM_MAP[piece.platform]?.name}
                    </span>
                  </div>
                </div>
                <div style={{ padding: '10px 12px' }}>
                  <div style={{ fontSize: 12, color: '#F0F4F8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 4 }}>
                    {piece.hook || piece.caption?.slice(0, 50) || '—'}
                  </div>
                  <div style={{ fontSize: 11, color: '#4A5E70', fontFamily: 'JetBrains Mono' }}>
                    {piece.duration_seconds ? `${piece.duration_seconds}s · ` : ''}{piece.posted_at ? format(new Date(piece.posted_at), 'MMM d') : 'Draft'}
                  </div>
                </div>
              </div>
            ))}
            {pieces.length === 0 && !loading && (
              <div style={{ gridColumn: '1/-1', textAlign: 'center', color: '#4A5E70', padding: 40 }}>
                No AI-generated content yet. Create your first post!
              </div>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {pieces.map(piece => (
              <div key={piece.id} className="card card-hover" style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px' }}>
                <div style={{ width: 48, height: 48, background: '#161C24', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 22 }}>
                  {PLATFORM_MAP[piece.platform]?.icon}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, color: '#F0F4F8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {piece.hook || piece.caption?.slice(0, 80) || '—'}
                  </div>
                  <div style={{ fontSize: 11, color: '#8B9EB0', marginTop: 2 }}>
                    {PLATFORM_MAP[piece.platform]?.name} · {piece.duration_seconds ? `${piece.duration_seconds}s` : 'Image'}
                  </div>
                </div>
                <div style={{ fontSize: 11, color: '#4A5E70', fontFamily: 'JetBrains Mono', whiteSpace: 'nowrap' }}>
                  {piece.posted_at ? format(new Date(piece.posted_at), 'MMM d, yyyy') : 'Draft'}
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {loading && activeTab === 'uploads' ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 16 }}>
          {[0,1,2,3,4,5].map(i => <div key={i} className="animate-shimmer" style={{ height: 160, borderRadius: 10 }} />)}
        </div>
      ) : activeTab === 'uploads' && filteredAssets.length > 0 && (
        view === 'grid' ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 16 }}>
            {filteredAssets.map(asset => (
              <div key={asset.id} className="card card-hover" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ height: 120, background: '#161C24', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {asset.file_type === 'image' && asset.file_url ? (
                    <img src={asset.file_url} alt={asset.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <AssetIcon type={asset.file_type} />
                  )}
                </div>
                <div style={{ padding: '8px 10px' }}>
                  <div style={{ fontSize: 12, color: '#F0F4F8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{asset.name}</div>
                  <div style={{ fontSize: 10, color: '#4A5E70', fontFamily: 'JetBrains Mono', marginTop: 2 }}>{formatBytes(asset.size_bytes)}</div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {filteredAssets.map(asset => (
              <div key={asset.id} className="card card-hover" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px' }}>
                <div style={{ width: 40, height: 40, background: '#161C24', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <AssetIcon type={asset.file_type} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, color: '#F0F4F8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{asset.name}</div>
                  <div style={{ fontSize: 11, color: '#4A5E70', fontFamily: 'JetBrains Mono' }}>{asset.file_type} · {formatBytes(asset.size_bytes)}</div>
                </div>
                <div style={{ fontSize: 11, color: '#4A5E70', fontFamily: 'JetBrains Mono', whiteSpace: 'nowrap' }}>
                  {format(new Date(asset.created_at), 'MMM d, yyyy')}
                </div>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  )
}
