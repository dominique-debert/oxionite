import React from 'react'
import { MdOutlineAccountTree, MdError } from 'react-icons/md'
import { FaTag, FaTags } from 'react-icons/fa'
import { getDefaultBackgroundUrl } from '../lib/get-default-background'
import styles from '../styles/components/SocialCard.module.css'
import siteConfig from '../site.config'
import localeConfig from '../site.locale.json'
import { parseUrlPathname } from '../lib/context/url-parser'

// Common components
const PillBrand: React.FC = () => (
  <div className={styles.pillBrand}>
    <img
      src="/icon.png"
      alt="Site Icon"
      width={16}
      height={16}
    />
    <span>{siteConfig.name}</span>
  </div>
)

const PillText: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className={styles.pillText}>
    {children}
  </div>
)

const TitleBrand: React.FC = () => (
  <div className={styles.titleBrand}>
    <img
      src="/icon.png"
      alt="Site Icon"
      width={48}
      height={48}
    />
    <span>{siteConfig.name}</span>
  </div>
)

const TitleIcon: React.FC<{ icon: React.ReactNode; text: string }> = ({ icon, text }) => (
  <div className={styles.titleIcon}>
    <span className={styles.icon48}>{icon}</span>
    <span>{text}</span>
  </div>
)

const TitlePost: React.FC<{ title: string }> = ({ title }) => (
  <div className={styles.titlePost}>
    {title}
  </div>
)

// URL Parser and Social Card Component
export interface SocialCardProps {
  url: string
  siteMap?: any // We'll use any for now to avoid type issues
  imageUrl?: string
  baseUrl?: string
}

export const SocialCard: React.FC<SocialCardProps> = ({ url, siteMap, imageUrl, baseUrl }) => {
  const globalStyles = `
    * {
      box-sizing: border-box;
    }
    body {
      margin: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
    }
  `

  // Parse URL using the proper utility
  const parseUrl = (url: string) => {
    console.log('[SocialCard] Parsing URL with parseUrlPathname:', url)
    try {
      if (!url) {
        console.log('[SocialCard] URL is undefined/empty, defaulting to root')
        return { type: 'root' }
      }
      
      const path = url.startsWith('http') ? new URL(url).pathname : url
      const parsed = parseUrlPathname(path)
      
      console.log('[SocialCard] Parsed result from parseUrlPathname:', parsed)
      
      // Convert to SocialCard format
      if (parsed.isRoot) {
        return { type: 'root' }
      } else if (parsed.isPost) {
        return { type: 'post', slug: parsed.slug }
      } else if (parsed.isCategory) {
        return { type: 'category', slug: parsed.slug }
      } else if (parsed.isTag) {
        return { type: 'tag', tag: parsed.slug }
      } else if (parsed.isAllTags) {
        return { type: 'all-tags' }
      } else {
        return { type: '404' }
      }
    } catch (error) {
      console.error('[SocialCard] Error parsing URL:', error)
      return { type: 'root' }
    }
  }

  const parsed = parseUrl(url)

  // Server-side compatible translations
  const translations = (() => {
    try {
      // Import translations based on default locale
      const locale = localeConfig.defaultLocale
      const translations = require(`../public/locales/${locale}/common.json`)
      return translations
    } catch (error) {
      // Fallback to English if file not found
      return {
        allTags: 'All Tags',
        category: 'Category',
        tag: 'Tag',
        'error.404.title': 'Page Not Found'
      }
    }
  })()

  const t = (key: string) => {
    const keys = key.split('.')
    let result = translations
    for (const k of keys) {
      result = result?.[k]
      if (result === undefined) return key
    }
    return result || key
  }

  const renderContent = () => {
    console.log('[SocialCard] Rendering with props:', { url, imageUrl, baseUrl })
    console.log('[SocialCard] Parsed result:', parsed)

    const containerStyle = {
      width: '1200px',
      height: '630px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundImage: `url(${imageUrl || (baseUrl ? `${baseUrl}/default_background.png` : '/default_background.png')})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      fontFamily: 'system-ui, -apple-system, sans-serif',
    }

    const glassStyle = {
      backgroundColor: 'rgba(0, 0, 0, 0.3)',
      border: '1px solid rgba(255, 255, 255, 0.2)',
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      borderRadius: '32px',
    }

    const iconUrl = baseUrl ? `${baseUrl}/icon.png` : '/icon.png';

    console.log('[SocialCard] Final styles:', { containerStyle, iconUrl })

    switch (parsed.type) {
      case 'root':
        console.log('[SocialCard] Rendering root view')
        return (
          <div style={containerStyle}>
            <div style={{
              ...glassStyle,
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              padding: '32px 48px',
              fontSize: '48px',
              color: 'rgba(255, 255, 255, 0.9)',
            }}>
              <img src={iconUrl} alt="Site Icon" width={48} height={48} />
              <span>{siteConfig.name}</span>
            </div>
          </div>
        )

      case 'post':
        console.log('[SocialCard] Rendering post view (placeholder)')
        return (
          <div style={containerStyle}>
            <div style={{ color: 'white', fontSize: '24px' }}>
              Post social card - To be implemented
            </div>
          </div>
        )

      case 'category':
        console.log('[SocialCard] Rendering category view:', parsed.slug)
        return (
          <div style={containerStyle}>
            <div style={{
              ...glassStyle,
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              padding: '32px 48px',
              fontSize: '48px',
              color: 'rgba(255, 255, 255, 0.9)',
            }}>
              <MdOutlineAccountTree style={{ fontSize: '48px' }} />
              <span>{parsed.slug || t('category')}</span>
            </div>
          </div>
        )

      case 'tag':
        console.log('[SocialCard] Rendering tag view:', parsed.tag)
        return (
          <div style={containerStyle}>
            <div style={{
              ...glassStyle,
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              padding: '32px 48px',
              fontSize: '48px',
              color: 'rgba(255, 255, 255, 0.9)',
            }}>
              <FaTag style={{ fontSize: '48px' }} />
              <span>{parsed.tag || t('tag')}</span>
            </div>
          </div>
        )

      case 'all-tags':
        console.log('[SocialCard] Rendering all-tags view')
        return (
          <div style={containerStyle}>
            <div style={{
              ...glassStyle,
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              padding: '32px 48px',
              fontSize: '48px',
              color: 'rgba(255, 255, 255, 0.9)',
            }}>
              <FaTags style={{ fontSize: '48px' }} />
              <span>{t('allTags')}</span>
            </div>
          </div>
        )

      case '404':
        console.log('[SocialCard] Rendering 404 view')
        return (
          <div style={containerStyle}>
            <div style={{
              ...glassStyle,
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              padding: '32px 48px',
              fontSize: '48px',
              color: 'rgba(255, 255, 255, 0.9)',
            }}>
              <MdError style={{ fontSize: '48px' }} />
              <span>{t('error.404.title')}</span>
            </div>
          </div>
        )

      default:
        console.log('[SocialCard] Rendering default root view')
        return (
          <div style={containerStyle}>
            <div style={{
              ...glassStyle,
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              padding: '32px 48px',
              fontSize: '48px',
              color: 'rgba(255, 255, 255, 0.9)',
            }}>
              <img src={iconUrl} alt="Site Icon" width={48} height={48} />
              <span>{siteConfig.name}</span>
            </div>
          </div>
        )
    }
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: globalStyles }} />
      {renderContent()}
    </>
  )
}
