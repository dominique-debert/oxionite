import * as React from 'react'
import { useRouter } from 'next/router'
import { IoChevronDown } from '@react-icons/all-files/io5/IoChevronDown'

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

  const handleLanguageChange = (newLocale: string) => {
    router.push(asPath, asPath, { locale: newLocale })
    setIsOpen(false)
  }

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
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
            <a key={availableLocale} onClick={() => handleLanguageChange(availableLocale)}>
              {languageLabels[availableLocale] || availableLocale}
            </a>
          ))}
        </div>
      )}
    </div>
  )
} 