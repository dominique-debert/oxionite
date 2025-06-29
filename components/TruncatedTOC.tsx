import React, { useEffect } from 'react'

// Configuration: Maximum number of characters before truncation
const MAX_TOC_TEXT_LENGTH = 25

const TruncatedTOC: React.FC = () => {
  useEffect(() => {
    const processToC = () => {
      // Find all TOC links using the react-notion-x class
      const links = document.querySelectorAll('.notion-table-of-contents-item')
      
      links.forEach((rawElement) => {
        const element = rawElement as HTMLElement

        if (element.dataset.tocProcessed === 'true') return

        // Get text content - react-notion-x usually wraps text in spans
        const textHolder = element.querySelector('span') || element
        if (!element.dataset.originalText) {
          element.dataset.originalText = textHolder.textContent?.trim() || ''
        }
        const originalText = element.dataset.originalText

        // Truncate text if needed
        if (originalText.length > MAX_TOC_TEXT_LENGTH) {
          textHolder.textContent = originalText.slice(0, MAX_TOC_TEXT_LENGTH) + '...'
        } else {
          textHolder.textContent = originalText
        }

        element.dataset.tocProcessed = 'true'
      })
    }

    // Run multiple times to catch dynamically loaded content
    setTimeout(() => processToC(), 100)
    setTimeout(() => processToC(), 500)
    setTimeout(() => processToC(), 1000)
  }, [])

  return null
}

export default TruncatedTOC 