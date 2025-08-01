import React from 'react';
import { useRouter } from 'next/router'
import localeConfig from '../site.locale.json';
import { useAppContext } from '@/lib/context/app-context';
import { TagButton } from './TagButton';
import Magnet from './react-bits/Magnet';
import styles from '@/styles/components/TagList.module.css';

export function TagList() {
  const { siteMap } = useAppContext();
  const router = useRouter();
  const locale = router.locale || localeConfig.defaultLocale;

  const allTags = React.useMemo(() => {
    if (!siteMap?.tagGraphData?.locales) {
      return [];
    }
    
    const currentLocaleData = siteMap.tagGraphData.locales[locale];
    const fallbackLocaleData = siteMap.tagGraphData.locales[localeConfig.defaultLocale];
    
    const tagCounts = currentLocaleData?.tagCounts || fallbackLocaleData?.tagCounts || {};
    const tags = Object.keys(tagCounts)
      .filter(tag => tag && tag.trim() !== '') // Filter out empty strings
      .sort((a, b) => {
        // Sort by count (desc) then by name (asc)
        const countA = tagCounts[a] || 0;
        const countB = tagCounts[b] || 0;
        if (countB !== countA) return countB - countA;
        return a.localeCompare(b);
      });
    
    return tags;
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
