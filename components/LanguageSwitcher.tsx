import { IoChevronDown } from '@react-icons/all-files/io5/IoChevronDown'
import { useRouter } from 'next/router'
import * as React from 'react'

export function LanguageSwitcher() {
  const router = useRouter()
  const [isOpen, setIsOpen] = React.useState(false)
  const dropdownRef = React.useRef<HTMLDivElement>(null)

  const { locale, locales, asPath } = router

  const languageLabels: Record<string, string> = {
    ko: '한국어',
    en: 'English'
  }

  const currentLanguageShort = locale?.toUpperCase() || 'KO'

  const handleLanguageChange = React.useCallback((newLocale: string) => {
    router.push(asPath, asPath, { locale: newLocale })
    setIsOpen(false)
  }, [router, asPath])

  const handleClickOutside = React.useCallback((event: MouseEvent) => {
    if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
      setIsOpen(false)
    }
  }, [])

  React.useEffect(() => {
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen, handleClickOutside])

  return (
    <div ref={dropdownRef} className="glass-item" style={{ position: 'relative' }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', color: 'inherit' }}
      >
        <span>{currentLanguageShort}</span>
        <IoChevronDown style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease' }} />
      </button>

      {isOpen && (
        <div className="language-switcher-menu">
          {locales?.map((availableLocale) => (
            <button key={availableLocale} onClick={() => handleLanguageChange(availableLocale)} className="language-switcher-button">
              {languageLabels[availableLocale] || availableLocale}
            </button>
          ))}
        </div>
      )}
    </div>
  )
} 