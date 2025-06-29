export interface LocaleTexts {
  // CategoryPage
  totalPostsCount: (count: number) => string
  previousPage: string
  nextPage: string
  noPosts: string
  noPostsDescription: string
  
  // Common
  loading: string
  error: string
  
  // Navigation
  home: string
  navigation: string
  
  // Search
  search: string
  searchPlaceholder: string
  searching: string
  noResults: string
  typeToSearch: string
}

const koTexts: LocaleTexts = {
  // CategoryPage
  totalPostsCount: (count: number) => `총 ${count}개의 글`,
  previousPage: '이전',
  nextPage: '다음',
  noPosts: '이 카테고리에는 아직 글이 없습니다.',
  noPostsDescription: '새로운 글이 추가되면 여기에 표시됩니다.',
  
  // Common
  loading: '로딩 중...',
  error: '오류가 발생했습니다',
  
  // Navigation
  home: '홈',
  navigation: '네비게이션',
  
  // Search
  search: '검색',
  searchPlaceholder: '검색...',
  searching: '검색 중...',
  noResults: '검색 결과가 없습니다',
  typeToSearch: '검색어를 입력하세요...'
}

const enTexts: LocaleTexts = {
  // CategoryPage
  totalPostsCount: (count: number) => `${count} post${count !== 1 ? 's' : ''} total`,
  previousPage: 'Previous',
  nextPage: 'Next',
  noPosts: 'No posts in this category yet.',
  noPostsDescription: 'New posts will appear here when added.',
  
  // Common
  loading: 'Loading...',
  error: 'An error occurred',
  
  // Navigation
  home: 'Home',
  navigation: 'Navigation',
  
  // Search
  search: 'Search',
  searchPlaceholder: 'Search...',
  searching: 'Searching...',
  noResults: 'No results found',
  typeToSearch: 'Type to search...'
}

const translations = {
  ko: koTexts,
  en: enTexts
} as const

export function getTexts(locale: string = 'ko'): LocaleTexts {
  if (locale === 'ko' || locale === 'en') {
    return translations[locale]
  }
  return translations.ko
}

export function useI18n(locale: string = 'ko') {
  return getTexts(locale)
} 