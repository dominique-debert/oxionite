import * as React from 'react'
import { useRouter } from 'next/router'

// Debounce function to limit API calls
function debounce<F extends (...args: any[]) => any>(func: F, waitFor: number) {
  let timeout: NodeJS.Timeout

  return (...args: Parameters<F>): Promise<ReturnType<F>> =>
    new Promise(resolve => {
      if (timeout) {
        clearTimeout(timeout)
      }

      timeout = setTimeout(() => resolve(func(...args)), waitFor)
    })
}

export function SocialImagePreviewer() {
  const router = useRouter()
  const [path, setPath] = React.useState(router.asPath)
  const [imageUrl, setImageUrl] = React.useState('')
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const generatePreview = React.useCallback(async (currentPath: string) => {
    if (!currentPath.trim()) return

    setLoading(true)
    setError('')

    try {
      const response = await fetch(`/api/generate-social-image?path=${encodeURIComponent(currentPath)}&t=${Date.now()}`)

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const blob = await response.blob()
      const imageUrl = URL.createObjectURL(blob)
      setImageUrl(imageUrl)
    } catch (err) {
      console.error('Error fetching preview:', err)
      setError(err instanceof Error ? err.message : 'Failed to load preview')
    } finally {
      setLoading(false)
    }
  }, [])

  const debouncedGenerate = React.useMemo(() => debounce(generatePreview, 500), [generatePreview]);

  // Update path when route changes
  React.useEffect(() => {
    setPath(router.asPath)
    debouncedGenerate(router.asPath)
  }, [router.asPath, debouncedGenerate])


  return (
    <div style={{
      position: 'fixed',
      bottom: '20px',
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 9999,
      backgroundColor: 'rgba(0, 0, 0, 0.9)',
      color: 'white',
      padding: '15px',
      borderRadius: '8px',
      fontSize: '12px',
      maxWidth: '350px',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
      backdropFilter: 'blur(10px)',
      border: '1px solid rgba(255, 255, 255, 0.1)'
    }}>
      <div style={{ marginBottom: '10px', fontWeight: 'bold', fontSize: '14px' }}>
        🎨 Social Image Debug
      </div>
      
      <div style={{ marginBottom: '10px' }}>
        <input
          type="text"
          value={path}
          onChange={(e) => setPath(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && generatePreview(path)}
          placeholder="Enter path (e.g. /)"
          style={{
            width: '100%',
            padding: '8px',
            backgroundColor: '#333',
            color: 'white',
            border: '1px solid #555',
            borderRadius: '4px',
            fontSize: '12px'
          }}
        />
      </div>
      <div style={{ marginBottom: '10px', textAlign: 'center' }}>
        <button
          onClick={() => generatePreview(path)}
          disabled={loading}
          style={{
            width: '100%',
            padding: '8px 16px',
            backgroundColor: loading ? '#666' : '#0070f3',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontSize: '12px'
          }}
        >
          {loading ? 'Loading...' : 'Refresh Preview'}
        </button>
      </div>

      {error && <div style={{ color: 'red', textAlign: 'center', marginBottom: '10px' }}>{error}</div>}
      {imageUrl && (
        <div>
          <div style={{ marginBottom: '5px', fontSize: '10px', color: '#ccc', textAlign: 'center' }}>
            Preview (1200×630):
          </div>
          <img
            src={imageUrl}
            alt="Social preview"
            style={{
              width: '100%',
              height: 'auto',
              borderRadius: '4px',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              maxHeight: '180px',
              objectFit: 'contain'
            }}
            onError={(e) => {
              console.error('Social image failed to load:', imageUrl);
            }}
          />
          <div style={{ marginTop: '5px', fontSize: '9px', color: '#888', wordBreak: 'break-all', textAlign: 'center' }}>
            {imageUrl}
          </div>
        </div>
      )}
    </div>
  );
}
