import React, { useEffect } from 'react'

// Configuration: Maximum number of characters before truncation
const MAX_TOC_TEXT_LENGTH = 25

// Configuration: Maximum height for Table of Contents (in viewport height units)
const MAX_TOC_HEIGHT = '60vh'

const TruncatedTOC: React.FC = () => {
  useEffect(() => {
    console.log('TruncatedTOC: useEffect started')

    // Inject CSS styles for consistent indentation
    const injectCSS = () => {
      const existingStyle = document.getElementById('toc-indentation-styles')
      if (existingStyle) {
        existingStyle.remove()
      }

      const style = document.createElement('style')
      style.id = 'toc-indentation-styles'
      style.textContent = `
        /* High specificity reset to override react-notion-x default styles */
        .notion-aside a.notion-table-of-contents-item,
        .notion-table-of-contents a.notion-table-of-contents-item,
        .notion-aside a,
        .notion-table-of-contents a {
          margin: 0 !important;
          padding: 0 !important;
          border: none !important;
          background: none !important;
          text-indent: 0 !important;
          display: block !important;
          box-sizing: border-box !important;
          line-height: 1.4 !important;
          margin-bottom: 2px !important;
        }

        /* Override any indent-level classes from react-notion-x */
        .notion-aside a.notion-table-of-contents-item[class*="indent-level"],
        .notion-table-of-contents a.notion-table-of-contents-item[class*="indent-level"] {
          padding-left: 0 !important;
          margin-left: 0 !important;
          text-indent: 0 !important;
        }

        /* Our specific indentation classes with high specificity */
        .notion-aside a.notion-table-of-contents-item.toc-level-1,
        .notion-table-of-contents a.notion-table-of-contents-item.toc-level-1,
        .notion-aside a.toc-level-1,
        .notion-table-of-contents a.toc-level-1 {
          padding-left: 0em !important;
          font-weight: 500 !important;
          font-size: 14px !important;
          margin-left: 0 !important;
          text-indent: 0 !important;
        }
        
        .notion-aside a.notion-table-of-contents-item.toc-level-2,
        .notion-table-of-contents a.notion-table-of-contents-item.toc-level-2,
        .notion-aside a.toc-level-2,
        .notion-table-of-contents a.toc-level-2 {
          padding-left: 1.5em !important;
          font-size: 13px !important;
          margin-left: 0 !important;
          text-indent: 0 !important;
        }
        
        .notion-aside a.notion-table-of-contents-item.toc-level-3,
        .notion-table-of-contents a.notion-table-of-contents-item.toc-level-3,
        .notion-aside a.toc-level-3,
        .notion-table-of-contents a.toc-level-3 {
          padding-left: 3em !important;
          font-size: 12px !important;
          margin-left: 0 !important;
          text-indent: 0 !important;
        }
        
        .notion-aside a.notion-table-of-contents-item.toc-level-4,
        .notion-table-of-contents a.notion-table-of-contents-item.toc-level-4,
        .notion-aside a.toc-level-4,
        .notion-table-of-contents a.toc-level-4 {
          padding-left: 4.5em !important;
          font-size: 12px !important;
          margin-left: 0 !important;
          text-indent: 0 !important;
        }
        
        .notion-aside a.notion-table-of-contents-item.toc-level-5,
        .notion-table-of-contents a.notion-table-of-contents-item.toc-level-5,
        .notion-aside a.toc-level-5,
        .notion-table-of-contents a.toc-level-5 {
          padding-left: 6em !important;
          font-size: 11px !important;
          margin-left: 0 !important;
          text-indent: 0 !important;
        }
        
        .notion-aside a.notion-table-of-contents-item.toc-level-6,
        .notion-table-of-contents a.notion-table-of-contents-item.toc-level-6,
        .notion-aside a.toc-level-6,
        .notion-table-of-contents a.toc-level-6 {
          padding-left: 7.5em !important;
          font-size: 11px !important;
          margin-left: 0 !important;
          text-indent: 0 !important;
        }

        /* Additional aggressive reset for any potential interfering styles */
        .notion-aside a.toc-level-1,
        .notion-aside a.toc-level-2,
        .notion-aside a.toc-level-3,
        .notion-aside a.toc-level-4,
        .notion-aside a.toc-level-5,
        .notion-aside a.toc-level-6 {
          position: relative !important;
          left: 0 !important;
          right: 0 !important;
          transform: none !important;
          translate: none !important;
        }
      `
      document.head.appendChild(style)
      console.log('✓ High specificity CSS styles injected')
    }

    // Helper function to determine heading level from target element
    const getHeadingLevel = (element: Element): number => {
      let currentElement: Element | null = element
      
      // Check up to 5 parent levels
      for (let i = 0; i < 5 && currentElement; i++) {
        console.log(`  Checking element ${i}:`, currentElement.tagName, currentElement.className)
        
        // Check for notion heading classes first
        const classList = currentElement.classList
        for (let j = 1; j <= 6; j++) {
          if (classList.contains(`notion-h${j}`)) {
            console.log(`  Found notion-h${j} class -> Level ${j}`)
            return j
          }
        }
        
        // Check if it's an H1-H6 tag
        if (currentElement.tagName && typeof currentElement.tagName === 'string') {
          const tagName: string = currentElement.tagName
          const match = tagName.match(/^H[1-6]$/)
          if (match) {
            const level = parseInt(tagName.charAt(1))
            console.log(`  Found heading tag: ${tagName} -> Level ${level}`)
            return level
          }
        }
        
        currentElement = currentElement.parentElement
      }
      
      console.log(`  No heading level found, defaulting to Level 1`)
      return 1
    }

    // Apply max height to TOC aside element
    const applyMaxHeight = () => {
      const asideElement = document.querySelector('.notion-aside') as HTMLElement
      if (asideElement) {
        asideElement.style.maxHeight = MAX_TOC_HEIGHT
        asideElement.style.overflowY = 'auto'
        asideElement.style.paddingRight = '8px'
      }
    }

    const processToC = () => {
      console.log('processToC: Starting')

      // Use a more specific selector to avoid grabbing other links in the aside
      const links = document.querySelectorAll('.notion-table-of-contents a.notion-table-of-contents-item')
      if (links.length === 0) {
        console.warn('No TOC links found with selector. Retrying with a less specific one.')
        // Fallback for different structures
        const fallbackLinks = document.querySelectorAll('.notion-aside a')
        if (fallbackLinks.length === 0) {
          console.error('TOC links not found even with fallback selector.')
          return
        }
        console.log(`Found ${fallbackLinks.length} TOC links using fallback selector: .notion-aside a`)
        // The rest of the function will use `fallbackLinks` if links is empty.
        // This is a conceptual note; the implementation below will handle it.
      } else {
        console.log(`Found ${links.length} TOC links using selector: .notion-table-of-contents a.notion-table-of-contents-item`)
      }
      
      const linksToProcess = links.length > 0 ? links : document.querySelectorAll('.notion-aside a')

      linksToProcess.forEach((rawElement, index) => {
        // Cast the generic Element to a more specific HTMLElement
        const element = rawElement as HTMLElement

        // Check a flag on the anchor element itself
        if (element.dataset.tocProcessedFinal === 'true') {
          // console.log(`Skipping already processed link: ${element.textContent}`)
          return
        }

        console.log(`\n=== Processing Link ${index} ===`)

        // CRITICAL FIX: Preserve the inner <span> by targeting it directly
        // react-notion-x often uses a structure like <a><span>text</span></a>
        // Modifying `a.textContent` destroys the span and its styles.
        const textHolder = element.querySelector('span') || element
        
        // Store original text on the anchor tag, but get it from the text holder
        if (!element.dataset.originalText) {
          element.dataset.originalText = textHolder.textContent?.trim() || ''
        }
        const originalText = element.dataset.originalText

        console.log(`Original text: "${originalText}"`)
        console.log(`Current text: "${textHolder.textContent?.trim()}"`)
        console.log(`Href: "${element.getAttribute('href')}"`)

        // Phase 1: Calculate heading level (read-only)
        const headingLevel = getHeadingLevel(element)
        console.log(`"${originalText}" -> Level ${headingLevel}`)

        // Phase 2: Apply styles via CSS classes (write)
        // Clear any previous level classes to handle potential re-renders
        for (let i = 1; i <= 6; i++) {
          element.classList.remove(`toc-level-${i}`)
        }
        // Add the correct class
        if (headingLevel > 0) {
          const levelClass = `toc-level-${headingLevel}`
          element.classList.add(levelClass)
          console.log(`Applied CSS class: ${levelClass}`)
        }

        // Phase 3: Truncate text if necessary (write)
        // This is now safe because we are targeting the textHolder, not the anchor.
        if (originalText.length > MAX_TOC_TEXT_LENGTH) {
          const truncatedText = originalText.slice(0, MAX_TOC_TEXT_LENGTH) + '...'
          textHolder.textContent = truncatedText
          console.log(`Text truncated: "${originalText}" -> "${truncatedText}"`)
        } else {
          // Ensure the text is the original, untruncated version
          textHolder.textContent = originalText
          console.log('Text not truncated (within limit)')
        }
        
        console.log(`✓ Applied level ${headingLevel} styles to "${originalText}"`)
        console.log(`Final display text: "${textHolder.textContent}"`)
        console.log(`Final CSS classes: "${element.className}"`)

        // Set a final flag to prevent any reprocessing
        element.dataset.tocProcessedFinal = 'true'
      })

      console.log('processToC: Completed')
    }

    // Simple delayed execution to ensure DOM is ready
    const initializeToC = () => {
      // Inject CSS first
      injectCSS()
      applyMaxHeight()
      
      // Try multiple times with increasing delays to catch dynamically loaded content
      setTimeout(() => processToC(), 100)
      setTimeout(() => processToC(), 500)
      setTimeout(() => processToC(), 1000)
    }

    initializeToC()

    // Cleanup function
    return () => {
      console.log('TruncatedTOC: Cleanup completed')
      const existingStyle = document.getElementById('toc-indentation-styles')
      if (existingStyle) {
        existingStyle.remove()
      }
    }
  }, [])

  return null
}

export default TruncatedTOC 