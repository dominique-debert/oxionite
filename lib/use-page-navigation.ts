import { useRouter } from 'next/router';
import { useEffect } from 'react';
import { getBlockTitle } from 'notion-utils';
import { usePageRoute } from './page-context';
import type { SiteMap } from './types';

interface UsePageNavigationProps {
  siteMap?: SiteMap;
  pageId?: string;
  recordMap?: any;
}

export function usePageNavigation({ siteMap, pageId: currentPageId, recordMap }: UsePageNavigationProps) {
  const router = useRouter();
  const { setRootRoute, addToRoute, clearRoute } = usePageRoute();

  useEffect(() => {
    const slug = router.query.slug as string[] | undefined;
    clearRoute();

    if (slug && slug.length > 0 && siteMap) {
      const rootSlug = slug[0];
      const subpageParts = slug.slice(1);

      const rootPage = Object.values(siteMap.pageInfoMap).find(
        (p) => p.slug === rootSlug && (p.type === 'Post' || p.type === 'Home')
      );

      if (rootPage) {
        const rootPageId = rootPage.pageId;
        setRootRoute(rootSlug, rootPageId, rootPage.title);

        let parentId = rootPageId;
        // Process subpages from the URL
        for (const part of subpageParts) {
          const uuidMatch = part.match(/([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})$/i);
          const pageId = uuidMatch ? uuidMatch[1] : part;

          if (pageId) {
            const pageInfo = siteMap.pageInfoMap?.[pageId];
            let title = pageInfo?.title;

            // For the very last page in the path, if we don't have a title from the siteMap,
            // try to get it from the current page's recordMap.
            if (!title && pageId === currentPageId) {
              const block = recordMap?.block?.[pageId]?.value;
              if (block) {
                title = getBlockTitle(block, recordMap);
              }
            }

            addToRoute(pageId, title || 'Untitled', parentId);
            parentId = pageId; // The current page becomes the parent for the next iteration
          }
        }
      }
    }
  }, [router.query.slug, siteMap, recordMap, currentPageId, setRootRoute, addToRoute, clearRoute]);
}
