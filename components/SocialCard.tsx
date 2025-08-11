import React from 'react'
import { MdOutlineAccountTree, MdError } from 'react-icons/md'
import { FaTag, FaTags } from 'react-icons/fa'
import { getDefaultBackgroundUrl } from '../lib/get-default-background'
import styles from '../styles/components/SocialCard.module.css'
import siteConfig from '../site.config'
import localeConfig from '../site.locale.json'

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

  // Parse URL to determine the type
  const parseUrl = (url: string) => {
    try {
      // Handle both absolute URLs and relative paths
      const path = url.startsWith('http') ? new URL(url).pathname : url
      const segments = path.split('/').filter(Boolean)

      if (segments.length === 0) {
        return { type: 'root' }
      }

      if (segments[0] === 'post' && segments.length === 2) {
        return { type: 'post', slug: segments[1] }
      }

      if (segments[0] === 'category' && segments.length === 2) {
        return { type: 'category', slug: segments[1] }
      }

      if (segments[0] === 'tag' && segments.length === 2) {
        return { type: 'tag', tag: segments[1] }
      }

      if (segments[0] === 'all-tags') {
        return { type: 'all-tags' }
      }

      return { type: '404' }
    } catch (error) {
      // Fallback for invalid URLs
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

    switch (parsed.type) {
      case 'root':
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
        // This is intentionally left empty as requested
        return (
          <div style={containerStyle}>
            <div style={{ color: 'white', fontSize: '24px' }}>
              Post social card - To be implemented
            </div>
          </div>
        )

      case 'category':
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
