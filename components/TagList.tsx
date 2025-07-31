import React from 'react';
import { useRouter } from 'next/router';
import { useAppContext } from '@/lib/context/app-context';
import { TagButton } from './TagButton';
import Magnet from './react-bits/Magnet';
import styles from '@/styles/components/TagList.module.css';

export function TagList() {
  const { siteMap } = useAppContext();
  const router = useRouter();
  const locale = router.locale || 'en';

  const allTags = React.useMemo(() => {
    if (!siteMap?.tagGraphData?.locales) {
      return [];
    }
    
    // Try to get tags for current locale, fallback to English if not available
    const currentLocaleData = siteMap.tagGraphData.locales[locale];
    const fallbackLocaleData = siteMap.tagGraphData.locales['en'];
    
    const tagCounts = currentLocaleData?.tagCounts || fallbackLocaleData?.tagCounts || {};
    return Object.keys(tagCounts).sort((a, b) => a.localeCompare(b));
  }, [siteMap, locale]);

  if (allTags.length === 0) {
    return <div className={styles.noTags}>No tags found.</div>;
  }

  return (
    <div className={styles.tagListContainer}>
      {
        allTags.map(tag => (
          <Magnet
            key={tag}
            padding={3}
            disabled={false}
            magnetStrength={3}
            activeTransition="transform 0.3s ease-out"
            inactiveTransition="transform 0.5s ease-in-out"
            wrapperClassName=""
            innerClassName=""
            style={{}}
          >
            <TagButton tag={tag} />
          </Magnet>
        ))
      }
    </div>
  );
}
