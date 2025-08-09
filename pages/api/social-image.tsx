import { NextRequest } from 'next/server'
import { ImageResponse } from 'next/og'
import type { CSSProperties } from 'react'
import * as libConfig from '@/lib/config'
import { parseUrlPathname } from '@/lib/context/url-parser'

// Color constants for social images
const COLORS = {
  background: 'rgba(0, 0, 0, 0.8)',
  border: 'rgba(255, 255, 255, 0.2)',
  text: 'rgba(255, 255, 255, 0.95)',
} as const

export const runtime = 'edge'

// --- Font Type Definition ---
type FontInfo = {
  name: string
  data: ArrayBuffer
  weight: 400 | 700 | 800
  style: 'normal'
}

// --- Font Fetching ---
async function getFonts(): Promise<FontInfo[]> {
  const fontUrls = [
    { weight: 400, url: 'https://fonts.gstatic.com/s/notosanskr/v37/PbyxFmXiEBPT4ITbgNA5Cgms3VYcOA-vvnIzzuoyeLQ.ttf' },
    { weight: 700, url: 'https://fonts.gstatic.com/s/notosanskr/v37/PbyxFmXiEBPT4ITbgNA5Cgms3VYcOA-vvnIzzg01eLQ.ttf' },
    { weight: 800, url: 'https://fonts.gstatic.com/s/notosanskr/v37/PbyxFmXiEBPT4ITbgNA5Cgms3VYcOA-vvnIzzmo1eLQ.ttf' },
  ] as const

  const fontPromises = fontUrls.map(async ({ weight, url }) => {
    try {
      const response = await fetch(url)
      if (!response.ok) return null
      const data = await response.arrayBuffer()
      return { name: 'Noto Sans KR', data, weight, style: 'normal' } as FontInfo
    } catch {
      return null
    }
  })

  const results = await Promise.all(fontPromises)
  return results.filter((font): font is FontInfo => font !== null)
}

export default async function OGImage(req: NextRequest) {
  console.log('\n--- [social-image] START ---');
  const fonts = await getFonts();
  console.log(`[social-image] 1. Fonts loaded: ${fonts.length}`);
  const options = {
    width: 1200,
    height: 630,
    fonts: fonts.length > 0 ? fonts : undefined,
  };
  console.log(`[social-image] 2. ImageResponse options prepared. Fonts included: ${!!options.fonts}`);

  try {
    const { pathname } = req.nextUrl;
    const parsed = parseUrlPathname(pathname);
    console.log('[social-image] 3. Parsed URL:', parsed);

    const safeConfig = {
      name: libConfig.name || 'Site Name',
      description: libConfig.description || 'Site Description',
      domain: libConfig.domain || 'example.com',
      host: libConfig.host || 'http://localhost:3000',
    };
    console.log('[social-image] 4. Safe config:', safeConfig);

    const fontStyle = {
      fontFamily: fonts.length > 0 ? '"Noto Sans KR"' : 'system-ui',
    };

    console.log(`[social-image] 5. Rendering view: ${parsed.isRoot ? 'Root' : 'Post'}`);
    const element = parsed.isRoot
      ? (
        <div style={{ ...styles.wrapper, ...styles.center }}>
          <BackgroundImage host={safeConfig.host} />
          <div style={styles.homeContainer}>
            <img src={`${safeConfig.host}/icon.png`} alt="Icon" style={styles.icon} />
            <span style={{ ...fontStyle, ...styles.homeTitle }}>{safeConfig.name}</span>
          </div>
        </div>
      )
      : (
        <div style={{ ...styles.wrapper, ...styles.center, ...styles.column }}>
          <BackgroundImage host={safeConfig.host} />
          <div style={styles.postContainer}>
            <h1 style={{ ...fontStyle, ...styles.postTitle }}>{safeConfig.name}</h1>
            <p style={{ ...fontStyle, ...styles.postDescription }}>{safeConfig.description}</p>
          </div>
          <div style={{ ...fontStyle, ...styles.domain }}>{safeConfig.domain}</div>
        </div>
      );

    console.log('[social-image] 6. Element created, calling ImageResponse constructor...');
    const response = new ImageResponse(element, options);
    console.log('[social-image] 7. ImageResponse constructor finished.');
    return response;
  } catch (err) {
    console.error('[social-image] ERROR:', err);
    // Fallback to a very simple image if anything goes wrong
    return new ImageResponse(
      <div style={{ ...styles.wrapper, ...styles.center, backgroundColor: '#000', color: '#fff' }}>
        Error generating image
      </div>,
      { width: 1200, height: 630 }
    );
  }
}

// --- Reusable Components & Styles ---

const BackgroundImage = ({ host }: { host: string }) => (
  <svg width="1200" height="630" style={{ position: 'absolute', top: 0, left: 0 }}>
    <defs>
      <filter id="blur" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="10" edgeMode="duplicate" />
      </filter>
    </defs>
    <image
      href={`${host}/default_background.png`}
      width="100%"
      height="100%"
      preserveAspectRatio="xMidYMid slice"
      filter="url(#blur)"
    />
    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)' }} />
  </svg>
)

const styles: { [key: string]: CSSProperties } = {
  wrapper: { width: '100%', height: '100%', display: 'flex', color: COLORS.text },
  center: { alignItems: 'center', justifyContent: 'center' },
  column: { flexDirection: 'column' },
  homeContainer: { position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '48px', padding: '64px 96px', borderRadius: '9999px', border: `2px solid ${COLORS.border}`, backgroundColor: COLORS.background },
  icon: { width: '128px', height: '128px', borderRadius: '24px' },
  homeTitle: { fontSize: 72, fontWeight: 800, color: COLORS.text },
  postContainer: { position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '0 40px', maxWidth: '100%' },
  postTitle: { fontSize: 60, fontWeight: 700, margin: '0 0 20px', color: COLORS.text, lineHeight: 1.2 },
  postDescription: { fontSize: 36, fontWeight: 400, margin: 0, opacity: 0.9, color: COLORS.text, lineHeight: 1.4 },
  domain: { position: 'absolute', bottom: 40, right: 40, fontSize: 24, fontWeight: 600, opacity: 0.8, color: COLORS.text },
};
 