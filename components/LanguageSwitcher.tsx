import * as React from 'react'
import { useRouter } from 'next/router'
import { IoChevronDown } from '@react-icons/all-files/io5/IoChevronDown'

export function LanguageSwitcher() {
  const router = useRouter()
  const [isOpen, setIsOpen] = React.useState(false)
  const dropdownRef = React.useRef<HTMLDivElement>(null)

  const { locale, locales, asPath } = router

  // Language labels mapping
  const languageLabels: Record<string, string> = {
    ko: '한국어',
    en: 'English'
  }

  // Current language display (short form)
  const currentLanguageShort = locale?.toUpperCase() || 'KO'

  // Handle language change
  const handleLanguageChange = (newLocale: string) => {
    router.push(asPath, asPath, { locale: newLocale })
    setIsOpen(false)
  }

  // Close dropdown when clicking outside
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  return (
    <div 
      ref={dropdownRef}
      style={{ position: 'relative', display: 'inline-block' }}
    >
      <button
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: '8px 12px',
          borderRadius: '6px',
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          transition: 'background-color 0.2s ease',
          fontSize: '14px',
          fontWeight: 500,
          color: 'var(--fg-color)',
          backgroundColor: isOpen ? 'var(--bg-color-1)' : 'transparent'
        }}
        onClick={() => setIsOpen(!isOpen)}
        onMouseEnter={(e) => {
          if (!isOpen) {
            e.currentTarget.style.backgroundColor = 'var(--bg-color-1)'
          }
        }}
        onMouseLeave={(e) => {
          if (!isOpen) {
            e.currentTarget.style.backgroundColor = 'transparent'
          }
        }}
      >
        <span>{currentLanguageShort}</span>
        <IoChevronDown 
          style={{ 
            fontSize: '12px',
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s ease'
          }} 
        />
      </button>

      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            right: 0,
            marginTop: '4px',
            backgroundColor: 'var(--bg-color)',
            border: '1px solid var(--border-color)',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
            minWidth: '120px',
            zIndex: 1000,
            overflow: 'hidden'
          }}
        >
          {locales?.map((availableLocale) => (
            <button
              key={availableLocale}
              onClick={() => handleLanguageChange(availableLocale)}
              style={{
                width: '100%',
                padding: '12px 16px',
                border: 'none',
                backgroundColor: locale === availableLocale ? 'var(--bg-color-1)' : 'transparent',
                color: 'var(--fg-color)',
                fontSize: '14px',
                textAlign: 'left',
                cursor: 'pointer',
                transition: 'background-color 0.2s ease',
                fontWeight: locale === availableLocale ? 600 : 400
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--bg-color-1)'
              }}
              onMouseLeave={(e) => {
                if (locale !== availableLocale) {
                  e.currentTarget.style.backgroundColor = 'transparent'
                }
              }}
            >
              {languageLabels[availableLocale] || availableLocale}
            </button>
          ))}
        </div>
      )}
    </div>
  )
} 