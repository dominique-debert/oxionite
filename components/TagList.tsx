import React from 'react';
import { useAppContext } from '@/lib/context/app-context';
import { TagButton } from './TagButton';
import Magnet from './react-bits/Magnet';
import styles from '@/styles/components/TagList.module.css';

export function TagList() {
  const { siteMap, pageInfo } = useAppContext();
  const locale = pageInfo?.language || 'en';

  const allTags = React.useMemo(() => {
    if (!siteMap?.tagGraphData?.locales?.[locale]) {
      return [];
    }
    const tagCounts = siteMap.tagGraphData.locales[locale].tagCounts;
    return Object.keys(tagCounts).sort((a, b) => a.localeCompare(b));
  }, [siteMap, locale]);

  if (allTags.length === 0) {
    return <div className={styles.noTags}>No tags found.</div>;
  }

  return (
    <div className={styles.tagListContainer}>
      {
        allTags.map(tag => (
          <Magnet key={tag} padding={3}>
            <TagButton tag={tag} />
          </Magnet>
        ))
      }
    </div>
  );
}
