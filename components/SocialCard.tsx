import React from 'react'
import { MdOutlineAccountTree, MdKeyboardArrowRight } from 'react-icons/md'
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
  
  console.log('[Background Component] image processing:', {
    originalImageUrl: imageUrl,
    baseUrl,
    finalImageUrl,
    isRelative: imageUrl?.startsWith('/'),
    hasBaseUrl: !!baseUrl,
    defaultBackground: !imageUrl
  });
  
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
  baseUrl?: string;
}> = ({ iconUrl, text, isImageCircle = false, fontSize = '36px', padding = '16px 24px', baseUrl }) => {
  // Convert relative image URLs to absolute URLs for server-side rendering
  const finalIconUrl = iconUrl && iconUrl.startsWith('/') && baseUrl 
    ? `${baseUrl}${iconUrl}` 
    : iconUrl;

  console.log('[PillText] Image URL processing:', {
    originalIconUrl: iconUrl,
    baseUrl,
    finalIconUrl,
    isRelative: iconUrl?.startsWith('/'),
    hasBaseUrl: !!baseUrl
  });

  return (
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
      {finalIconUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={finalIconUrl}
          alt="Icon"
          width={isImageCircle ? 42 : 54}
          height={isImageCircle ? 42 : 54}
          style={{
            borderRadius: isImageCircle ? '999px' : '0',
            objectFit: 'cover',
          }}
        />
      )}
      <span>{text}</span>
    </div>
  );
}



const SocialBreadcrumb: React.FC<{ breadcrumb: string[]; baseUrl?: string }> = ({ breadcrumb, baseUrl }) => {
  const maxItemLength = 20
  const maxVisibleItems = 3
  
  console.log('[SocialBreadcrumb] baseUrl:', baseUrl, 'breadcrumb:', breadcrumb);
  
  if (!breadcrumb || breadcrumb.length === 0) {
    const iconUrl = `${baseUrl}/icon.png`;
    console.log('[SocialBreadcrumb] Home icon URL:', iconUrl);
    
    return (
      <div style={{
        ...COMMON_STYLES.glass,
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '12px 16px',
        fontSize: '24px',
        fontWeight: 'bold',
        color: 'rgba(255, 255, 255, 0.9)',
        flexWrap: 'nowrap'
      }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={iconUrl} alt="Site Icon" width={36} height={36} style={{ objectFit: 'cover' }} />
        <span>{siteConfig.name}</span>
      </div>
    )
  }

  const items = breadcrumb.length > maxVisibleItems
    ? [...breadcrumb.slice(0, 1), '...', ...breadcrumb.slice(-2)]
    : breadcrumb

  return (
    <div style={{
      ...COMMON_STYLES.glass,
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      padding: '8px 24px',
      paddingLeft: '16px',
      fontSize: '24px',
      fontWeight: 'bold',
      color: 'rgba(255, 255, 255, 0.9)',
      flexWrap: 'nowrap',
      maxWidth: '100%',
      overflow: 'hidden'
    }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`${baseUrl || ''}/icon.png`} alt="Site Icon" width={36} height={36} style={{ objectFit: 'cover' }} />
      <span>{siteConfig.name}</span>
      
      {items.map((item, index) => {
        if (item === '...') {
          return (
            <React.Fragment key={index}>
              <MdKeyboardArrowRight style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '20px' }} />
              <span style={{ color: 'rgba(255, 255, 255, 0.9)' }}>...</span>
            </React.Fragment>
          )
        }
        
        const displayText = item.length > maxItemLength 
          ? item.slice(0, maxItemLength - 3) + '...'
          : item

        return (
          <React.Fragment key={index}>
            <MdKeyboardArrowRight style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '20px' }} />
            <span style={{ 
              color: 'rgba(255, 255, 255, 0.9)',
              fontWeight: index === items.length - 1 ? '600' : '400',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              maxWidth: '120px'
            }}>
              {displayText}
            </span>
          </React.Fragment>
        )
      })}
    </div>
  )
}

const TitleBrand: React.FC<{ iconUrl: string; baseUrl?: string }> = ({ iconUrl, baseUrl }) => {
  // Ensure we use absolute URLs for server-side rendering
  let finalIconUrl = iconUrl;
  // Only convert if it's still a relative URL and we have a baseUrl
  if (iconUrl.startsWith('/') && baseUrl) {
    finalIconUrl = `${baseUrl}${iconUrl}`;
  } else if (iconUrl.startsWith('http')) {
    // Already absolute, use as-is
    finalIconUrl = iconUrl;
  }
  
  console.log('[TitleBrand] icon processing:', {
    originalIconUrl: iconUrl,
    baseUrl,
    finalIconUrl,
    isRelative: iconUrl?.startsWith('/'),
    hasBaseUrl: !!baseUrl
  });
  
  return (
    <div style={{
      ...COMMON_STYLES.glass,
      ...COMMON_STYLES.title,
    }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={finalIconUrl}
        alt="Site Icon"
        width={144}
        height={144}
        style={{ objectFit: 'cover' }}
      />
      <span>{siteConfig.name}</span>
    </div>
  );
}

const TitleIcon: React.FC<{ icon: React.ReactNode; text: string }> = ({ icon, text }) => {
  const getFontSize = (textLength: number) => {
    if (textLength <= 10) return '96px';
    if (textLength <= 15) return '80px';
    if (textLength <= 20) return '72px';
    if (textLength <= 25) return '64px';
    if (textLength <= 30) return '56px';
    if (textLength <= 35) return '48px';
    return '42px';
  };

  const getDisplayText = (text: string) => {
    const maxLength = 40;
    return text.length > maxLength ? text.slice(0, maxLength) + '...' : text;
  };

  const fontSize = getFontSize(text.length);
  const displayText = getDisplayText(text);

  return (
    <div style={{
      ...COMMON_STYLES.glass,
      ...COMMON_STYLES.title,
    }}>
      <span style={{ display: 'flex', alignItems: 'center', fontSize: '72px', color: 'rgba(255, 255, 255, 0.9)' }}>{icon}</span>
      <span style={{
        fontSize,
        maxWidth: '800px',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      }}>
        {displayText}
      </span>
    </div>
  );
};

const TitlePost: React.FC<{ title: string }> = ({ title }) => (
  <div style={{
    ...COMMON_STYLES.glass,
    width: '1040px',
    minHeight: '300px',
    padding: '48px',
    fontSize: '60px',
    fontWeight: 'bold',
    color: 'rgba(255, 255, 255, 0.9)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-start',
    textAlign: 'left',
    borderRadius: '24px',
  }}>
    <div style={{ 
      width: '100%', 
      wordWrap: 'break-word',
      display: '-webkit-box',
      WebkitLineClamp: 3,
      WebkitBoxOrient: 'vertical',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      lineHeight: '1.2',
      maxHeight: '216px', // 60px * 1.2 * 3 = 216px for 3 full lines
    }}>
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
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
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
        return { type: 'post', slug: parsed.slug, subpage: parsed.subpage, isSubpage: parsed.isSubpage, locale: parsed.locale }
      } else if (parsed.isCategory) {
        return { type: 'category', slug: parsed.slug, subpage: parsed.subpage, isSubpage: parsed.isSubpage, locale: parsed.locale }
      } else if (parsed.isTag) {
        return { type: 'tag', tag: parsed.slug, locale: parsed.locale }
      } else if (parsed.isAllTags) {
        return { type: 'all-tags', locale: parsed.locale }
      } else {
        return { type: '404', locale: parsed.locale }
      }
    } catch (err) {
      console.error('[SocialCard] Error parsing URL:', err)
      return { type: 'root' }
    }
  }

  const parsed = parseUrl(url)

  // Translation function with hardcoded values to avoid Node.js dependencies
  const t = (key: string, locale?: string): string => {
    const targetLocale = locale || parsed.locale || localeConfig.defaultLocale;
    
    // Check if locale exists in localeList
    const isValidLocale = localeConfig.localeList.includes(targetLocale);
    const finalLocale = isValidLocale ? targetLocale : localeConfig.defaultLocale;
    
    // Hardcoded translations to avoid Node.js dependencies
    const translations: Record<string, Record<string, string>> = {
      'en': {
        'allTags': 'All Tags',
        'recentPosts': 'Recent Posts',
        'categories': 'Categories',
        'tags': 'Tags'
      },
      'ko': {
        'allTags': '모든 태그',
        'recentPosts': '최근 게시물',
        'categories': '카테고리',
        'tags': '태그'
      }
    };
    
    return translations[finalLocale]?.[key] || translations.en?.[key] || key;
  }

  const renderContent = () => {
    console.log('[SocialCard] Rendering with props:', { url, imageUrl, baseUrl })
    console.log('[SocialCard] Parsed result:', parsed)
    console.log('[SocialCard] siteMap available:', !!siteMap, 'pageInfoMap available:', !!siteMap?.pageInfoMap)
    

    // Always use absolute URL for icon.png to work with Puppeteer
  const iconUrl = `${baseUrl}/icon.png`;

    console.log('[SocialCard] iconUrl:', iconUrl)
    console.log('[SocialCard] Provided imageUrl:', imageUrl)

    switch (parsed.type) {
      case 'root':
        console.log('[SocialCard] Rendering root view')
        console.log('[SocialCard] No cover image available for root view')
        return (
          <Background baseUrl={baseUrl}>
            <TitleBrand iconUrl={iconUrl} baseUrl={baseUrl} />
          </Background>
        )

      case 'post': {
        console.log('[SocialCard] Rendering post view:', parsed.slug, 'isSubpage:', parsed.isSubpage)
        const currentLocale = parsed.locale || localeConfig.defaultLocale
        let postTitle = 'Post'
        let postCoverImage: string | undefined

        console.log('[SocialCard] Post case - currentLocale:', currentLocale, 'slug:', parsed.slug)
        console.log('[SocialCard] Post case - searching for page with type Post or Home')

        if (siteMap && siteMap.pageInfoMap) {
          const allPages = Object.values(siteMap.pageInfoMap)
          console.log('[SocialCard] Post case - total pages:', allPages.length)
          
          // For subpages, use the subpage segment to find the actual page
          const targetSlug = parsed.isSubpage ? parsed.subpage : parsed.slug;
          
          const matchingPages = allPages.filter(
            (p: PageInfo) => (p.type === 'Post' || p.type === 'Home') && p.slug === targetSlug && p.language === currentLocale
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

        // Handle subpages by using the page ID directly
        if (parsed.isSubpage) {
          console.log('[SocialCard] Subpage case - processing subpage:', parsed.subpage)
          
          // Extract Notion page ID from the slug (format: lower-case-title-notion-page-id)
          const pageIdMatch = parsed.subpage.match(/([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})$/i);
          
          if (pageIdMatch) {
            const pageId = pageIdMatch[1];
            console.log('[SocialCard] Subpage case - extracted page ID:', pageId)
            
            // For subpages, look up the page info using the page ID
            // The API now provides actual page data for subpages
            const subpageInfo = siteMap?.pageInfoMap?.[pageId];
            
            if (subpageInfo) {
              postTitle = subpageInfo.title || 'Untitled';
              postCoverImage = subpageInfo.coverImage || undefined;
              console.log('[SocialCard] Subpage case - found actual page data:', {title: postTitle, coverImage: postCoverImage})
            } else {
              // Fallback: use the slug as title
              const slugTitle = parsed.subpage.replace(/-[a-f0-9-]{36}$/i, '').replace(/-/g, ' ');
              postTitle = slugTitle || 'Untitled';
              console.log('[SocialCard] Subpage case - using slug title as fallback:', postTitle)
            }
          } else {
            // Fallback: use the slug as title
            const slugTitle = parsed.subpage.replace(/-[a-f0-9-]{36}$/i, '').replace(/-/g, ' ');
            postTitle = slugTitle || 'Untitled';
            console.log('[SocialCard] Subpage case - using slug title:', postTitle)
          }
          
          console.log('[SocialCard] Subpage case - final title:', postTitle, 'coverImage:', postCoverImage)
          
          // For subpages, create a simple breadcrumb structure
          const breadcrumb = ['...', postTitle];
          
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
                {/* Top row with breadcrumb */}
                <div style={{ 
                  position: 'absolute', 
                  top: '60px', 
                  left: '80px', 
                  right: '80px', 
                  display: 'flex', 
                  justifyContent: 'center', 
                  alignItems: 'center',
                  zIndex: 10
                }}>
                  <SocialBreadcrumb breadcrumb={breadcrumb} baseUrl={baseUrl} />
                </div>

                {/* Main title */}
                <TitlePost title={postTitle} />
              </div>
            </Background>
          );
        }

        // Handle regular posts (non-subpages)
        const pageInfo = siteMap?.pageInfoMap ? Object.values(siteMap.pageInfoMap).find(
          (p: PageInfo) => (p.type === 'Post' || p.type === 'Home') && p.slug === parsed.slug && p.language === currentLocale
        ) : null;

        console.log('[SocialCard] pageInfo:', pageInfo);
        console.log('[SocialCard] pageInfo tags:', pageInfo?.tags);

        // Handle authors array from pageInfo for regular posts
        const authors = pageInfo?.authors || [];
        const firstAuthor = authors[0] || 'Author';
        const additionalAuthorsCount = authors.length > 1 ? authors.length - 1 : 0;
        
        // Find first author's avatar from siteConfig with exact case matching
        const firstAuthorConfig = siteConfig.authors?.find((a: any) => a.name === firstAuthor);
        let authorAvatar = firstAuthorConfig?.avatar_dir;
        // Ensure avatar URL is absolute for server-side rendering
        if (authorAvatar && authorAvatar.startsWith('/') && baseUrl) {
          authorAvatar = `${baseUrl}${authorAvatar}`;
        }

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
                <SocialBreadcrumb breadcrumb={pageInfo?.breadcrumb || []} baseUrl={baseUrl} />
              
                {/* Author */}
                {authors.length > 0 && (
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <PillText 
                      iconUrl={authorAvatar} 
                      text={firstAuthor} 
                      fontSize="24px" 
                      padding={authorAvatar ? "6px 24px 6px 6px" : "12px 24px"}
                      isImageCircle={true}
                      baseUrl={baseUrl}
                    />
                    {additionalAuthorsCount > 0 && (
                      <PillText 
                        text={`+${additionalAuthorsCount}`} 
                        fontSize="24px" 
                        padding="12px 24px"
                        baseUrl={baseUrl}
                      />
                    )}
                  </div>
                )}
                
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

                {/* Tags */}
                {pageInfo?.tags && pageInfo.tags.some((tag: string) => tag && tag.trim() !== '') && (
                  <div style={{ 
                    display: 'flex', 
                    gap: '12px', 
                    flexWrap: 'wrap',
                    maxWidth: 'calc(100% - 160px)'
                  }}>
                    {pageInfo.tags
                      .filter((tag: string) => tag && tag.trim() !== '')
                      .slice(0, 3)
                      .map((tag: string, index: number) => {
                        const maxTagLength = 10
                        const displayTag = tag.length > maxTagLength 
                          ? tag.slice(0, maxTagLength - 3) + '...'
                          : tag
                        return (
                          <PillText 
                            key={index} 
                            text={`#${displayTag}`} 
                            fontSize="24px" 
                            padding="12px 24px" 
                            baseUrl={baseUrl}
                          />
                        )
                      })}
                    {pageInfo.tags.filter((tag: string) => tag && tag.trim() !== '').length > 3 && (
                      <PillText 
                        text={`+${pageInfo.tags.filter((tag: string) => tag && tag.trim() !== '').length - 3}`} 
                        fontSize="24px" 
                        padding="12px 24px" 
                        baseUrl={baseUrl}
                      />
                    )}
                  </div>
                )}
                
                {/* Date */}
                {pageInfo?.date && (
                  <PillText 
                    text={new Date(pageInfo.date).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })} 
                    fontSize="24px" 
                    padding="12px 24px" 
                    baseUrl={baseUrl}
                  />
                )}
              </div>
            </div>
          </Background>
        )
      }
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
                <PillText iconUrl={iconUrl} text={siteConfig.name} baseUrl={baseUrl} />
              </div>
            </div>
          </Background>
        )
      }

      case 'tag': {
        console.log('[SocialCard] Rendering tag view:', parsed.tag)
        
        // For tag pages, always use default background
        console.log('[SocialCard] Tag case - using default background')
        
        // Decode URL-encoded tag
        const decodedTag = parsed.tag ? decodeURIComponent(parsed.tag) : 'Tag';
        
        return (
          <Background baseUrl={baseUrl}>
            <div style={{ position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              <TitleIcon
                icon={<FaTag />}
                text={`#${decodedTag}`}
              />
              <div style={{ position: 'absolute', bottom: '-150px' }}>
                <PillText iconUrl={iconUrl} text={siteConfig.name} baseUrl={baseUrl} />
              </div>
            </div>
          </Background>
        )
      }

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
                <PillText iconUrl={iconUrl} text={siteConfig.name} baseUrl={baseUrl} />
              </div>
            </div>
          </Background>
        )

      default:
        console.log('[SocialCard] Rendering default root view')
        return (
          <Background baseUrl={baseUrl}>
            <TitleBrand iconUrl={iconUrl} baseUrl={baseUrl} />
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
