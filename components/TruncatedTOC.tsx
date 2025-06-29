import React, { useEffect } from 'react'
import { useRouter } from 'next/router'

// Configuration: Maximum number of characters before truncation
const MAX_TOC_TEXT_LENGTH = 25

const TruncatedTOC: React.FC = () => {
  const router = useRouter()

  useEffect(() => {
    // Add CSS to hide TOC initially
    const styleId = 'toc-hide-style'
    let styleEl = document.getElementById(styleId)
    
    if (!styleEl) {
      styleEl = document.createElement('style')
      styleEl.id = styleId
      styleEl.textContent = `
        .notion-table-of-contents-item {
          visibility: hidden !important;
        }
        .notion-table-of-contents-item.toc-processed {
          visibility: visible !important;
        }
      `
      document.head.appendChild(styleEl)
    }

    const processToC = () => {
      const tocItems = document.querySelectorAll('.notion-table-of-contents-item:not(.toc-processed)')
      
      if (tocItems.length === 0) {
        return false
      }

      // Process all items at once
      tocItems.forEach((item) => {
        const element = item as HTMLElement

        // Try multiple selectors to find the text content
        let textContainer = element.querySelector('.notion-table-of-contents-item-body')
        if (!textContainer) {
          textContainer = element.querySelector('a')
        }
        if (!textContainer) {
          textContainer = element
        }

        if (textContainer && textContainer.textContent) {
          const originalText = textContainer.textContent.trim()
          
          if (originalText.length > MAX_TOC_TEXT_LENGTH) {
            const truncatedText = originalText.slice(0, MAX_TOC_TEXT_LENGTH) + '...'
            textContainer.textContent = truncatedText
          }
        }

        // Mark as processed and make visible
        element.classList.add('toc-processed')
      })

      return true
    }

    // Use MutationObserver to watch for TOC being added to DOM
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === 'childList') {
          for (const node of mutation.addedNodes) {
            if (node.nodeType === Node.ELEMENT_NODE) {
              const element = node as Element
              // Check if this node or its children contain TOC items
              if (element.querySelector?.('.notion-table-of-contents-item') || 
                  element.classList?.contains('notion-table-of-contents-item')) {
                processToC()
                return
              }
            }
          }
        }
      }
    })

    // Start observing
    observer.observe(document.body, {
      childList: true,
      subtree: true
    })

    // Also try immediately in case TOC is already there
    requestAnimationFrame(() => {
      processToC()
    })

    // Cleanup
    return () => {
      observer.disconnect()
      
      // Remove the style and show all TOC items
      const style = document.getElementById(styleId)
      if (style) {
        style.remove()
      }
      
      // Remove processed classes
      const processedItems = document.querySelectorAll('.toc-processed')
      processedItems.forEach(item => {
        item.classList.remove('toc-processed')
      })
    }
  }, [router.locale]) // Re-run when language changes

  return null
}

export default TruncatedTOC 