import { type NextApiRequest, type NextApiResponse } from 'next'
import { ImageResponse } from 'next/og'
import * as libConfig from '@/lib/config'
import { parseUrlPathname } from '@/lib/context/url-parser'
import interSemiBoldFont from '@/lib/fonts/inter-semibold'

export const runtime = 'edge'

export default async function OGImage(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const url = new URL(req.url!, `https://${req.headers.host || 'localhost'}`)
    const parsed = parseUrlPathname(url.pathname)

    if (parsed.isRoot) {
      return createMinimalSocialImage()
    }

    return createPostSocialImage()
  } catch (error) {
    console.error('Error generating social image:', error)
    return createMinimalSocialImage()
  }
}

/**
 * For the home page, returns only the background image, filling the canvas.
 */
function createMinimalSocialImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
        }}
      >
        <img
          src={new URL('/default_background.png', libConfig.host).toString()}
          alt="Background"
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
          }}
        />
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  )
}

/**
 * For post pages, returns an image with text and a dark overlay.
 */
function createPostSocialImage() {
  return new ImageResponse(
    (
      <div
        style={{
          position: 'relative',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#1F2027',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
        }}
      >
        <img
          src={new URL('/default_background.png', libConfig.host).toString()}
          alt="Background"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
          }}
        />
        <div
          style={{
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            padding: '0 40px',
          }}
        >
          <h1
            style={{
              fontSize: 60,
              fontWeight: 700,
              fontFamily: 'Inter',
              margin: '0 0 20px',
              textShadow: '2px 2px 4px rgba(0,0,0,0.8)',
            }}
          >
            {libConfig.name}
          </h1>
          <p
            style={{
              fontSize: 36,
              fontWeight: 400,
              fontFamily: 'Inter',
              margin: 0,
              opacity: 0.9,
              textShadow: '1px 1px 2px rgba(0,0,0,0.8)',
            }}
          >
            {libConfig.description}
          </p>
        </div>
        <div
          style={{
            position: 'absolute',
            bottom: 40,
            right: 40,
            fontSize: 24,
            fontWeight: 600,
            fontFamily: 'Inter',
            opacity: 0.8,
            textShadow: '1px 1px 2px rgba(0,0,0,0.8)'
          }}
        >
          {libConfig.domain}
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      fonts: [
        {
          name: 'Inter',
          data: interSemiBoldFont,
          style: 'normal',
          weight: 700
        }
      ]
    }
  )
}
