import React, { useEffect } from 'react'

// Configuration: Maximum number of characters before truncation
const MAX_TOC_TEXT_LENGTH = 25

const TruncatedTOC: React.FC = () => {
  useEffect(() => {
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

          element.dataset.truncatedProcessed = 'true'
        }
      })

      return true
    }

    // Try to process TOC with retries
    let attempts = 0
    const maxAttempts = 10

    const tryProcess = () => {
      const success = processToC()
      attempts++
      
      if (!success && attempts < maxAttempts) {
        setTimeout(tryProcess, 300)
      }
    }

    // Start processing after delay to let react-notion-x render
    setTimeout(tryProcess, 200)

    // Also try when page is fully loaded
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', tryProcess)
    }

    // Cleanup
    return () => {
      document.removeEventListener('DOMContentLoaded', tryProcess)
    }
  }, [])

  return null
}

export default TruncatedTOC 