'use client'

import React, { useState, useCallback, useRef, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { IoChevronDown } from '@react-icons/all-files/io5/IoChevronDown'
import { IoChevronForward } from '@react-icons/all-files/io5/IoChevronForward'
import type { PageInfo } from '@/lib/types'
import { isSearchEnabled } from '@/lib/config'
import siteConfig from '../site.config'

interface CategoryTreeProps {
  items: PageInfo[]
  level?: number
  block?: any // For search functionality
}

interface CategoryItemProps {
  item: PageInfo
  level: number
}

interface SearchResult {
  id: string
  title: string
  url: string
  snippet?: string
}

// Utility function to count posts recursively
const countPostsRecursively = (item: PageInfo): number => {
  let count = 0
  
  // If this item is a post, count it
  if (item.type === 'Post') {
    count = 1
  }
  
  // Recursively count posts in children
  if (item.children && item.children.length > 0) {
    count += item.children.reduce((total, child) => {
      return total + countPostsRecursively(child)
    }, 0)
  }
  
  return count
}

// Custom Search Component
const CustomSearch: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  const openModal = useCallback(() => {
    setIsOpen(true)
    setTimeout(() => {
      inputRef.current?.focus()
    }, 100)
  }, [])

  const closeModal = useCallback(() => {
    setIsOpen(false)
    setQuery('')
    setResults([])
  }, [])

  const handleSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([])
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch('/api/search-notion', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          query: searchQuery,
          ancestorId: siteConfig.rootNotionPageId,
          filters: {
            isDeletedOnly: false,
            excludeTemplates: true,
            isNavigableOnly: false,
            requireEditPermissions: false
          },
          limit: 20
        })
      })

      if (response.ok) {
        const data = await response.json() as any
        console.log('Search results raw data:', data)
        console.log('Search results array:', data.results)
        
        // Let's check what each result looks like
        if (data.results && data.results.length > 0) {
          console.log('First result structure:', data.results[0])
          console.log('RecordMap blocks:', data.recordMap?.block)
        }
        
        // Transform results to our format using recordMap data
        const transformedResults: SearchResult[] = data.results?.map((result: any) => {
          const blockId = result.id
          const block = data.recordMap?.block?.[blockId]?.value
          
          console.log(`Block ${blockId}:`, block)
          
          // Get title from block properties or use highlight text
          let title = 'Untitled'
          if (block?.properties?.title?.[0]?.[0]) {
            title = block.properties.title[0][0]
          } else if (result.highlight?.text) {
            title = result.highlight.text
          }
          
          // Generate proper URL based on block type and ID
          let url = `/${blockId.replace(/-/g, '')}`
          
          return {
            id: blockId,
            title: title,
            url: url,
            snippet: result.highlight?.text || ''
          }
        }) || []
        
        console.log('Transformed results:', transformedResults)
        setResults(transformedResults)
      }
    } catch (error) {
      console.error('Search error:', error)
      setResults([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setQuery(value)
    handleSearch(value)
  }, [handleSearch])

  const handleResultClick = useCallback((url: string) => {
    closeModal()
    router.push(url)
  }, [closeModal, router])

  // Close modal on escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeModal()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown)
      return () => document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, closeModal])

  return (
    <>
      {/* Search Button - styled like react-notion-x Search */}
      <div 
        className="breadcrumb button"
        onClick={openModal}
        style={{
          cursor: 'pointer',
          padding: '8px 12px',
          border: '1px solid var(--fg-color-1)',
          borderRadius: '6px',
          backgroundColor: 'var(--bg-color)',
          display: 'flex',
          alignItems: 'center',
          fontSize: '14px',
          color: 'var(--fg-color)',
          marginBottom: '16px',
          transition: 'all 0.2s ease'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = 'var(--bg-color-1)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'var(--bg-color)'
        }}
      >
        <svg
          style={{ marginRight: '8px', opacity: 0.7 }}
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="11" cy="11" r="8"></circle>
          <path d="m21 21-4.35-4.35"></path>
        </svg>
        Search
      </div>

      {/* Search Modal */}
      {isOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'center',
            paddingTop: '10vh'
          }}
          onClick={closeModal}
        >
          <div
            style={{
              backgroundColor: 'var(--bg-color)',
              borderRadius: '12px',
              width: '90%',
              maxWidth: '600px',
              maxHeight: '70vh',
              overflow: 'hidden',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.2)',
              border: '1px solid var(--fg-color-1)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Search Input */}
            <div style={{ padding: '20px 20px 16px 20px', borderBottom: '1px solid var(--fg-color-1)' }}>
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={handleInputChange}
                placeholder="Search..."
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  fontSize: '16px',
                  border: '1px solid var(--fg-color-1)',
                  borderRadius: '8px',
                  backgroundColor: 'var(--bg-color)',
                  color: 'var(--fg-color)',
                  outline: 'none'
                }}
              />
            </div>

            {/* Search Results */}
            <div
              style={{
                maxHeight: '400px',
                overflowY: 'auto',
                padding: '8px 0'
              }}
            >
              {isLoading && (
                <div style={{ padding: '20px', textAlign: 'center', color: 'var(--fg-color-2)' }}>
                  Searching...
                </div>
              )}

              {!isLoading && query && results.length === 0 && (
                <div style={{ padding: '20px', textAlign: 'center', color: 'var(--fg-color-2)' }}>
                  No results found
                </div>
              )}

              {!isLoading && results.map((result) => (
                <div
                  key={result.id}
                  style={{
                    padding: '12px 20px',
                    cursor: 'pointer',
                    borderBottom: '1px solid var(--fg-color-0)',
                    transition: 'background-color 0.2s ease'
                  }}
                  onClick={() => handleResultClick(result.url)}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--bg-color-1)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent'
                  }}
                >
                  <div style={{ fontWeight: '500', color: 'var(--fg-color)', marginBottom: '4px' }}>
                    {result.title}
                  </div>
                  {result.snippet && (
                    <div style={{ fontSize: '14px', color: 'var(--fg-color-2)', lineHeight: '1.4' }}>
                      {result.snippet}
                    </div>
                  )}
                </div>
              ))}

              {!query && (
                <div style={{ padding: '20px', textAlign: 'center', color: 'var(--fg-color-2)' }}>
                  Type to search...
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}

const CategoryItem: React.FC<CategoryItemProps> = ({ item, level }) => {
  const [isExpanded, setIsExpanded] = useState(false) // Start collapsed to avoid hydration mismatch
  const [hasMounted, setHasMounted] = useState(false)
  const hasChildren = item.children && item.children.length > 0
  const isCategory = item.type === 'Category'
  const router = useRouter()
  
  // Expand all categories after component mounts to avoid hydration issues
  useEffect(() => {
    setHasMounted(true)
    if (hasChildren) {
      setIsExpanded(true)
    }
  }, [hasChildren])
  
  // Get current locale or default to 'en'
  const locale = router.locale || 'en'
  
  // Generate URL: /locale/slug
  const pageUrl = `/${locale}/${item.slug}`

  // Count posts in this category (only for categories)
  const postCount = isCategory ? countPostsRecursively(item) : 0

  const toggleExpanded = () => {
    if (hasChildren) {
      setIsExpanded(!isExpanded)
    }
  }

  return (
    <div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          paddingTop: '6px',
          paddingBottom: '6px',
          paddingRight: '8px',
          paddingLeft: `${level * 20 + 8}px`, // Level-based indentation + base padding
          cursor: hasChildren ? 'pointer' : 'default',
          borderRadius: '4px',
          transition: 'background-color 0.2s ease'
        }}
        onClick={toggleExpanded}
        onMouseEnter={(e) => {
          if (hasChildren) {
            e.currentTarget.style.backgroundColor = 'var(--bg-color-1)'
          }
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'transparent'
        }}
      >
        {hasChildren && (
          <span 
            style={{ 
              marginRight: '8px', 
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              color: 'var(--fg-color-icon)',
              transition: 'transform 0.2s ease'
            }}
          >
                         {isExpanded ? <IoChevronDown /> : <IoChevronForward />}
          </span>
        )}
        
        {isCategory ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span 
              style={{ 
                color: 'var(--fg-color)',
                fontWeight: hasChildren ? '600' : '500',
                fontSize: '14px',
                lineHeight: '1.4'
              }}
            >
              {item.title}
            </span>
            {postCount > 0 && (
              <span 
                style={{ 
                  color: 'var(--fg-color-2)',
                  fontSize: '12px',
                  fontWeight: '400',
                  backgroundColor: 'var(--bg-color-1)',
                  padding: '2px 6px',
                  borderRadius: '10px',
                  minWidth: '18px',
                  textAlign: 'center'
                }}
              >
                {postCount}
              </span>
            )}
          </div>
        ) : (
          <Link 
            href={pageUrl} 
            style={{ 
              textDecoration: 'none', 
              color: 'var(--fg-color-2)',
              fontSize: '14px',
              lineHeight: '1.4',
              transition: 'color 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = 'var(--fg-color)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'var(--fg-color-2)'
            }}
          >
            {item.title}
          </Link>
        )}
      </div>

      {isExpanded && hasChildren && (
        <CategoryTree items={item.children} level={(level || 0) + 1} />
      )}
    </div>
  )
}

export const CategoryTree: React.FC<CategoryTreeProps> = ({ 
  items, 
  level = 0, 
  block 
}) => {
  return (
    <div>
      {/* Custom Search - only show at top level */}
      {level === 0 && isSearchEnabled && (
        <CustomSearch />
      )}

      {/* Category Items */}
      {items?.map((item) => (
        <CategoryItem key={item.pageId} item={item} level={level} />
      ))}
    </div>
  )
} 