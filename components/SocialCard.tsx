import React from 'react'
import { MdOutlineAccountTree, MdError } from 'react-icons/md'
import { FaTag, FaTags } from 'react-icons/fa'
import { useTranslation } from 'next-i18next'
import { getDefaultBackgroundUrl } from '../lib/get-default-background'
import siteConfig from '../site.config'
import styles from '../styles/components/SocialCard.module.css'

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
}

export const SocialCard: React.FC<SocialCardProps> = ({ url, siteMap }) => {
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

  // Use i18n for translations
  const { t } = useTranslation('common')

  const renderContent = () => {
    const defaultBgStyle = {
      backgroundImage: `url(${getDefaultBackgroundUrl()})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
    }

    switch (parsed.type) {
      case 'root':
        return (
          <div 
            className={styles.container} 
            style={defaultBgStyle}
          >
            <TitleBrand />
          </div>
        )

      case 'post':
        // This is intentionally left empty as requested
        return (
          <div 
            className={styles.container} 
            style={defaultBgStyle}
          >
            <div style={{ color: 'white', fontSize: '24px' }}>
              Post social card - To be implemented
            </div>
          </div>
        )

      case 'category':
        return (
          <div 
            className={styles.container} 
            style={defaultBgStyle}
          >
            <TitleIcon
              icon={
                <MdOutlineAccountTree className={styles.icon48} />
              }
              text={parsed.slug || 'Category'}
            />
          </div>
        )

      case 'tag':
        return (
          <div 
            className={styles.container} 
            style={defaultBgStyle}
          >
            <TitleIcon
              icon={
                <FaTag className={styles.icon48} />
              }
              text={parsed.tag || 'Tag'}
            />
          </div>
        )

      case 'all-tags':
        return (
          <div 
            className={styles.container} 
            style={defaultBgStyle}
          >
            <TitleIcon
              icon={
                <FaTags className={styles.icon48} />
              }
              text={t('allTags')}
            />
          </div>
        )

      case '404':
        return (
          <div 
            className={styles.container} 
            style={defaultBgStyle}
          >
            <TitleIcon
              icon={
                <MdError className={styles.icon48} />
              }
              text={t('error.404.title')}
            />
          </div>
        )

      default:
        return (
          <div 
            className={styles.container} 
            style={defaultBgStyle}
          >
            <TitleBrand />
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
