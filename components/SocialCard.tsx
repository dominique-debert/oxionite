import React from 'react'
import { MdOutlineAccountTree, MdError, MdDescription } from 'react-icons/md'
import { FaTag, FaTags } from 'react-icons/fa'
import { getDefaultBackgroundUrl } from '../lib/get-default-background'
import siteConfig from '../site.config'
import localeConfig from '../site.locale.json'
import { parseUrlPathname } from '../lib/context/url-parser'
import type { SiteMap, PageInfo } from '../lib/context/types'

// Common components
const Background: React.FC<{ imageUrl?: string; children?: React.ReactNode; baseUrl?: string }> = ({ imageUrl, children, baseUrl }) => {
  // Ensure we use absolute URLs for server-side rendering
  let finalImageUrl = imageUrl || getDefaultBackgroundUrl();
  
  // Convert relative URLs to absolute for Puppeteer
  if (finalImageUrl.startsWith('/') && baseUrl) {
    finalImageUrl = `${baseUrl}${finalImageUrl}`;
  }
  
  console.log('[Background Component] imageUrl:', imageUrl, 'baseUrl:', baseUrl, 'finalImageUrl:', finalImageUrl);
  
  const backgroundStyle = {
    ...COMMON_STYLES.container,
    backgroundImage: `url(${finalImageUrl})`,
  };

  console.log('[Background Component] backgroundStyle:', backgroundStyle);
  return <div style={backgroundStyle}>{children}</div>;
};

const PillText: React.FC<{ 
  iconUrl?: string; 
  text: string; 
  isImageCircle?: boolean;
  fontSize?: string;
  padding?: string;
}> = ({ iconUrl, text, isImageCircle = false, fontSize = '36px', padding = '16px 24px' }) => (
  <div style={{
    ...COMMON_STYLES.glass,
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding,
    fontSize,
    fontWeight: 'bold',
    color: 'rgba(255, 255, 255, 0.9)',
  }}>
    {iconUrl && (
      <img
        src={iconUrl}
        alt="Icon"
        width={isImageCircle ? 32 : 54}
        height={isImageCircle ? 32 : 54}
        style={{
          borderRadius: isImageCircle ? '999px' : '0',
          objectFit: 'cover',
        }}
      />
    )}
    <span>{text}</span>
  </div>
)


const TitleBrand: React.FC<{ iconUrl: string }> = ({ iconUrl }) => (
  <div style={{
    ...COMMON_STYLES.glass,
    ...COMMON_STYLES.title,
  }}>
    <img
      src={iconUrl}
      alt="Site Icon"
      width={144}
      height={144}
    />
    <span>{siteConfig.name}</span>
  </div>
)

const TitleIcon: React.FC<{ icon: React.ReactNode; text: string }> = ({ icon, text }) => (
  <div style={{
    ...COMMON_STYLES.glass,
    ...COMMON_STYLES.title,
  }}>
    <span style={{ display: 'flex', alignItems: 'center', fontSize: '72px', color: 'rgba(255, 255, 255, 0.9)' }}>{icon}</span>
    <span>{text}</span>
  </div>
)

const TitlePost: React.FC<{ title: string }> = ({ title }) => (
  <div style={{
    ...COMMON_STYLES.glass,
    width: '1040px',
    minHeight: '300px',
    padding: '48px',
    fontSize: '48px',
    fontWeight: 'bold',
    color: 'rgba(255, 255, 255, 0.9)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-start',
    textAlign: 'left',
    borderRadius: '24px',
  }}>
    <div style={{ width: '100%', wordWrap: 'break-word' }}>
      {title}
    </div>
  </div>
)

// Common styles
const COMMON_STYLES = {
  container: {
    width: '1200px',
    height: '630px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    fontFamily: 'system-ui, -apple-system, sans-serif',
  },
  glass: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    border: '3px solid rgba(255, 255, 255, 0.2)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    borderRadius: '64px',
    color: 'rgba(255, 255, 255, 0.9)',
  },
  title: {
    fontSize: '96px',
    fontWeight: 'bold',
    borderRadius: '999px',
    padding: '32px 48px',
    display: 'flex',
    alignItems: 'center',
    gap: '32px',
    
  }
} as const

// URL Parser and Social Card Component
export interface SocialCardProps {
  url: string
  siteMap?: SiteMap
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
        return { type: 'post', slug: parsed.slug, locale: parsed.locale }
      } else if (parsed.isCategory) {
        return { type: 'category', slug: parsed.slug, locale: parsed.locale }
      } else if (parsed.isTag) {
        return { type: 'tag', tag: parsed.slug, locale: parsed.locale }
      } else if (parsed.isAllTags) {
        return { type: 'all-tags', locale: parsed.locale }
      } else {
        return { type: '404', locale: parsed.locale }
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
    console.log('[SocialCard] siteMap available:', !!siteMap, 'pageInfoMap available:', !!siteMap?.pageInfoMap)

    const glassStyle = COMMON_STYLES.glass

    const iconUrl = baseUrl ? `${baseUrl}/icon.png` : '/icon.png';

    console.log('[SocialCard] iconUrl:', iconUrl)
    console.log('[SocialCard] Provided imageUrl:', imageUrl)

    switch (parsed.type) {
      case 'root':
        console.log('[SocialCard] Rendering root view')
        console.log('[SocialCard] No cover image available for root view')
        return (
          <Background baseUrl={baseUrl}>
            <TitleBrand iconUrl={iconUrl} />
          </Background>
        )

      case 'post':
        console.log('[SocialCard] Rendering post view:', parsed.slug)
        const currentLocale = parsed.locale || localeConfig.defaultLocale
        let postTitle = 'Post'
        let postCoverImage: string | undefined

        console.log('[SocialCard] Post case - currentLocale:', currentLocale, 'slug:', parsed.slug)
        console.log('[SocialCard] Post case - searching for page with type Post or Home')

        if (siteMap && siteMap.pageInfoMap) {
          const allPages = Object.values(siteMap.pageInfoMap)
          console.log('[SocialCard] Post case - total pages:', allPages.length)
          
          const matchingPages = allPages.filter(
            (p: PageInfo) => (p.type === 'Post' || p.type === 'Home') && p.slug === parsed.slug && p.language === currentLocale
          )
          console.log('[SocialCard] Post case - matching pages:', matchingPages.length, matchingPages.map(p => ({title: p.title, type: p.type, coverImage: p.coverImage})))

          const pageInfo = matchingPages[0]
          if (pageInfo) {
            postTitle = pageInfo.title
            postCoverImage = pageInfo.coverImage || undefined
            console.log('[SocialCard] Post case - found page:', {title: postTitle, coverImage: postCoverImage})
            
            // Check if we should use original cover image without overlays
            if (pageInfo.useOriginalCoverImage) {
              console.log('[SocialCard] Post case - using original cover image only')
              return (
                <Background imageUrl={postCoverImage} baseUrl={baseUrl} />
              )
            }
          } else {
            console.log('[SocialCard] Post case - no matching page found')
          }
        }

        const pageInfo = siteMap?.pageInfoMap ? Object.values(siteMap.pageInfoMap).find(
          (p: PageInfo) => (p.type === 'Post' || p.type === 'Home') && p.slug === parsed.slug && p.language === currentLocale
        ) : null;
        
        // Handle authors array from pageInfo
        const authors = pageInfo?.authors || [];
        const firstAuthor = authors[0] || 'Author';
        const authorDisplayText = authors.length > 1 ? `${firstAuthor} +${authors.length - 1}` : firstAuthor;
        
        // Find first author's avatar from siteConfig
        const firstAuthorConfig = siteConfig.authors?.find((a: any) => a.name === firstAuthor);
        const authorAvatar = firstAuthorConfig?.avatar_dir;

        return (
          <Background imageUrl={postCoverImage} baseUrl={baseUrl}>
            <div style={{ 
              position: 'relative', 
              width: '100%', 
              height: '100%', 
              padding: '80px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center'
            }}>
              {/* Top row with breadcrumb and authors */}
              <div style={{ 
                position: 'absolute', 
                top: '60px', 
                left: '80px', 
                right: '80px', 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                zIndex: 10
              }}>
                {/* Breadcrumb */}
                <PillText text="breadcrumb" fontSize="24px" padding="12px 24px" />
              
                {/* Author */}
                <PillText 
                  iconUrl={authorAvatar} 
                  text={authorDisplayText} 
                  fontSize="24px" 
                  padding="12px 24px"
                  isImageCircle={true}
                />
                
              </div>

              {/* Main title panel */}
              <TitlePost title={postTitle} />

              {/* Bottom row with tags and date */}
              <div style={{ 
                position: 'absolute', 
                bottom: '60px', 
                left: '80px', 
                right: '80px', 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                zIndex: 10
              }}>
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                  {pageInfo?.tags?.map((tag: string, index: number) => (
                    <PillText 
                      key={index} 
                      text={`#${tag}`} 
                      fontSize="20px" 
                      padding="8px 16px" 
                    />
                  ))}
                </div>
                {pageInfo?.date && (
                  <PillText 
                    text={new Date(pageInfo.date).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })} 
                    fontSize="24px" 
                    padding="12px 24px" 
                  />
                )}
              </div>
            </div>
          </Background>
        )

      case 'category': {
        console.log('[SocialCard] Rendering category view:', parsed.slug)
        const currentLocale = parsed.locale || localeConfig.defaultLocale
        console.log('[SocialCard] Parsed result:', parsed)
        console.log('[SocialCard] Current locale:', currentLocale)
        let title = parsed.slug || 'Category'
        let coverImage: string | undefined

        console.log('[SocialCard] Category case - searching for category with slug:', parsed.slug, 'locale:', currentLocale)

        if (siteMap && siteMap.pageInfoMap) {
          const allPages = Object.values(siteMap.pageInfoMap)
          console.log('[SocialCard] Category case - total pages:', allPages.length)
          
          const categoryPages = allPages.filter(
            (p: PageInfo) => p.type === 'Category' && p.slug === parsed.slug && p.language === currentLocale
          )
          console.log('[SocialCard] Category case - matching categories:', categoryPages.length, categoryPages.map(p => ({title: p.title, coverImage: p.coverImage})))

          const pageInfo = categoryPages[0]
          if (pageInfo) {
            title = pageInfo.title
            coverImage = pageInfo.coverImage || undefined
            console.log('[SocialCard] Category case - found category:', {title, coverImage})
            
            // Check if we should use original cover image without overlays
            if (pageInfo.useOriginalCoverImage) {
              console.log('[SocialCard] Category case - using original cover image only')
              return (
                <Background imageUrl={coverImage} baseUrl={baseUrl} />
              )
            }
          } else {
            console.log('[SocialCard] Category case - no matching category found')
          }
        }

        console.log('[SocialCard] Category final values:', {title, coverImage})

        return (
          <Background imageUrl={coverImage} baseUrl={baseUrl}>
            <div style={{ position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              <TitleIcon
                icon={<MdOutlineAccountTree />}
                text={title}
              />
              <div style={{ position: 'absolute', bottom: '-150px' }}>
                <PillText iconUrl={iconUrl} text={siteConfig.name} />
              </div>
            </div>
          </Background>
        )
      }

      case 'tag':
        console.log('[SocialCard] Rendering tag view:', parsed.tag)
        let tagCoverImage: string | undefined
        
        console.log('[SocialCard] Tag case - searching for pages with tag:', parsed.tag)

        if (siteMap && siteMap.pageInfoMap) {
          const allPages = Object.values(siteMap.pageInfoMap)
          console.log('[SocialCard] Tag case - total pages:', allPages.length)
          
          // Find a page with this tag to use its cover image
          const pagesWithTag = allPages.filter(
            (p: PageInfo) => p.tags && p.tags.includes(parsed.tag || '')
          )
          console.log('[SocialCard] Tag case - pages with this tag:', pagesWithTag.length, pagesWithTag.map(p => ({title: p.title, coverImage: p.coverImage})))
          
          if (pagesWithTag.length > 0) {
            tagCoverImage = pagesWithTag[0].coverImage || undefined
            console.log('[SocialCard] Tag case - using cover image from:', pagesWithTag[0].title, 'coverImage:', tagCoverImage)
          } else {
            console.log('[SocialCard] Tag case - no pages found with this tag')
          }
        } else {
          console.log('[SocialCard] Tag case - siteMap not available')
        }
        
        console.log('[SocialCard] Tag case - final tagCoverImage:', tagCoverImage)
        
        return (
          <Background imageUrl={tagCoverImage} baseUrl={baseUrl}>
            <div style={{ position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              <TitleIcon
                icon={<FaTag />}
                text={`#${parsed.tag || 'Tag'}`}
              />
              <div style={{ position: 'absolute', bottom: '-150px' }}>
                <PillText iconUrl={iconUrl} text={siteConfig.name} />
              </div>
            </div>
          </Background>
        )

      case 'all-tags':
        console.log('[SocialCard] Rendering all-tags view')
        return (
          <Background baseUrl={baseUrl}>
            <div style={{ position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              <TitleIcon
                icon={<FaTags />}
                text={t('allTags')}
              />
              <div style={{ position: 'absolute', bottom: '-150px' }}>
                <PillText iconUrl={iconUrl} text={siteConfig.name} />
              </div>
            </div>
          </Background>
        )

      default:
        console.log('[SocialCard] Rendering default root view')
        return (
          <Background baseUrl={baseUrl}>
            <TitleBrand iconUrl={iconUrl} />
          </Background>
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
