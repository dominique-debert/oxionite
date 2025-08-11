import React from 'react'

export interface SocialCardProps {
  title: string
  author?: string
  date?: string
  imageUrl: string
}

// Note: This component is not intended for direct use in the browser.
// It's designed to be rendered to an HTML string and then screenshotted by Puppeteer.
export const SocialCard: React.FC<SocialCardProps> = ({ title, author, date, imageUrl }) => {
  // CSS to reset body margin and apply box-sizing globally.
  // This ensures consistent rendering between live preview and Puppeteer.
  const globalStyles = `
    * {
      box-sizing: border-box;
    }
    body {
      margin: 0;
      font-family: sans-serif;
    }
  `

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: globalStyles }} />
      <div
      style={{
        width: '1200px',
        height: '630px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundImage: `url(${imageUrl})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        fontFamily: 'sans-serif' // Placeholder font
      }}
    >
      {/* Glassmorphism Container */}
      <div
        style={{
          position: 'relative',
          width: '90%',
          height: '80%',
          backgroundColor: 'rgba(255, 255, 255, 0.2)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)', // For Safari
          borderRadius: '20px',
          border: '1px solid rgba(255, 255, 255, 0.3)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '40px',
          boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.37)'
        }}
      >
        <h1
          style={{
            fontSize: '64px',
            color: 'white',
            fontWeight: 'bold',
            textShadow: '2px 2px 8px rgba(0,0,0,0.6)',
            margin: 0
          }}
        >
          {title}
        </h1>

        {author && (
          <p
            style={{
              fontSize: '32px',
              color: 'rgba(255, 255, 255, 0.9)',
              textShadow: '1px 1px 4px rgba(0,0,0,0.5)',
              marginTop: '20px'
            }}
          >
            {author}
          </p>
        )}

        {date && (
          <p
            style={{
              fontSize: '24px',
              color: 'rgba(255, 255, 255, 0.7)',
              position: 'absolute',
              bottom: '40px',
              right: '40px'
            }}
          >
            {date}
          </p>
        )}
      </div>
    </div>
    </>
  )
}
