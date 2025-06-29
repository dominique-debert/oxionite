import React, { useEffect } from 'react'

// Configuration: Maximum number of characters before truncation
const MAX_TOC_TEXT_LENGTH = 25

const TruncatedTOC: React.FC = () => {
  useEffect(() => {
    let scrollHandler: (() => void) | null = null

    const processToC = () => {
      // Find react-notion-x's TOC items
      const tocItems = document.querySelectorAll('.notion-table-of-contents-item')
      
      if (tocItems.length === 0) {
        return false
      }

      // Process text truncation only
      tocItems.forEach((item) => {
        const element = item as HTMLElement

        // Skip if already processed
        if (element.dataset.truncatedProcessed === 'true') {
          return
        }

        // Find text container and truncate if needed
        const textContainer = element.querySelector('.notion-table-of-contents-item-body') || 
                            element.querySelector('span') || 
                            element

        if (textContainer && textContainer.textContent) {
          const originalText = textContainer.textContent.trim()
          
          if (originalText.length > MAX_TOC_TEXT_LENGTH) {
            const truncatedText = originalText.slice(0, MAX_TOC_TEXT_LENGTH) + '...'
            textContainer.textContent = truncatedText
          }

          element.dataset.truncatedProcessed = 'true'
        }
      })

      // Setup simple scroll spy
      setupSimpleScrollSpy()
      return true
    }

    const setupSimpleScrollSpy = () => {
      const tocItems = document.querySelectorAll('.notion-table-of-contents-item')
      const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6')
      
      if (tocItems.length === 0 || headings.length === 0) {
        return
      }

      // Simple scroll handler
      scrollHandler = () => {
        const scrollY = window.scrollY
        const windowHeight = window.innerHeight
        let activeHeading: Element | null = null

        // Find which heading is currently in view (simple approach)
        headings.forEach((heading) => {
          const rect = heading.getBoundingClientRect()
          // Check if heading is near the top of the viewport
          if (rect.top <= 200 && rect.bottom >= 0) {
            activeHeading = heading
          }
        })

        // Remove all active classes
        tocItems.forEach((item) => {
          item.classList.remove('active')
        })

        // Add active class to matching TOC item
        if (activeHeading) {
          const headingId = (activeHeading as HTMLElement).id
          if (headingId) {
            tocItems.forEach((item) => {
              const tocLink = item.querySelector('a')
              if (tocLink && tocLink.getAttribute('href') === `#${headingId}`) {
                item.classList.add('active')
              }
            })
          }
        }
      }

      // Add throttled scroll listener
      let ticking = false
      const throttledScrollHandler = () => {
        if (!ticking) {
          requestAnimationFrame(() => {
            scrollHandler?.()
            ticking = false
          })
          ticking = true
        }
      }

      window.addEventListener('scroll', throttledScrollHandler, { passive: true })
      
      // Initial call
      scrollHandler()
    }

    // Try to process TOC with retries
    let attempts = 0
    const maxAttempts = 10

    const tryProcess = () => {
      const success = processToC()
      attempts++
      
      if (!success && attempts < maxAttempts) {
        setTimeout(tryProcess, 200)
      }
    }

    // Start processing
    setTimeout(tryProcess, 100)

    // Cleanup
    return () => {
      if (scrollHandler) {
        window.removeEventListener('scroll', scrollHandler)
      }
    }
  }, [])

  return null
}

export default TruncatedTOC 