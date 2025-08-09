import * as React from 'react'
import { useRouter } from 'next/router'

export function SocialImagePreviewer() {
  const router = useRouter()
  const [imageUrl, setImageUrl] = React.useState('')
  const [loading, setLoading] = React.useState(false)

  const handleGenerate = () => {
    setLoading(true)
    // The social image API route is `/api/social-image`. 
    // We need to pass the current page's path to it. 
    // The API handler will read this from the `req.nextUrl.pathname`.
    // So we construct the URL like `/api/social-image/current/path`
    const pagePath = router.asPath === '/' ? '' : router.asPath;
    const finalUrl = `/api/social-image${pagePath}?t=${Date.now()}`;
    setImageUrl(finalUrl);
    setTimeout(() => setLoading(false), 1000);
  };

  React.useEffect(() => {
    handleGenerate();
  }, [router.asPath]);

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
      
      <div style={{ marginBottom: '10px', textAlign: 'center' }}>
        <button
          onClick={handleGenerate}
          disabled={loading}
          style={{
            padding: '8px 16px',
            backgroundColor: loading ? '#666' : '#0070f3',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontSize: '12px'
          }}
        >
          {loading ? 'Loading...' : 'Generate Preview'}
        </button>
      </div>

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
