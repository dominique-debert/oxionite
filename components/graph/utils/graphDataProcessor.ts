import type { SiteMap } from '@/lib/context/types';
import type { LocaleTagGraphData } from '@/lib/context/tag-graph';
import type { GraphData, GraphNode, GraphLink } from '../types/graph.types';
import { HOME_NODE_ID, ALL_TAGS_NODE_ID, GRAPH_CONFIG } from './graphConfig';
import siteConfig from 'site.config';

// Image cache for better performance
const imageCache = new Map<string, HTMLImageElement>();

export const preloadImage = (url: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    if (imageCache.has(url)) {
      resolve(imageCache.get(url)!);
      return;
    }

    const img = new Image();
    img.addEventListener('load', () => {
      imageCache.set(url, img);
      resolve(img);
    });
    img.addEventListener('error', reject);
    img.src = url;
  });
};

export const createPostGraphData = (
  siteMap: SiteMap,
  locale: string
): GraphData => {
  const nodes: GraphNode[] = [];
  const links: GraphLink[] = [];
  const processedPages = new Set<string>();

  if (!siteMap?.pageInfoMap) {
    return { nodes: [], links: [] };
  }

  // Create home node with favicon
  const homeImageUrl = '/icon.png';
  const homeNode: GraphNode = {
    id: HOME_NODE_ID,
    name: siteConfig.name,
    description: siteConfig.description,
    type: 'Root' as any,
    url: '/',
    color: '#8B5CF6',
    size: GRAPH_CONFIG.visual.HOME_NODE_SIZE,
    val: GRAPH_CONFIG.visual.HOME_NODE_SIZE,
    imageUrl: homeImageUrl,
  };
  
  // Preload home node image
  if (homeImageUrl) {
    preloadImage(homeImageUrl).then(img => {
      homeNode.img = img;
    }).catch(() => {
      // Fallback to favicon emoji if image fails to load
      console.warn('Failed to load home node image');
    });
  }
  
  nodes.push(homeNode);

  // Create database nodes with proper names and slugs from site.config.ts
  const dbConfigs = siteConfig.NotionDbList || [];
  const databaseNodes = new Map<string, GraphNode>();
  
  // Create database nodes for all databases in site.config.ts
  dbConfigs.forEach(dbConfig => {
    if (!databaseNodes.has(dbConfig.id)) {
      const dbName = dbConfig.name?.[locale] || 'Database';
      const dbSlug = dbConfig.slug;
      
      const dbNode: GraphNode = {
        id: dbConfig.id,
        name: dbName,
        slug: dbSlug,
        url: `/category/${dbSlug}`,
        type: 'Database' as any,
        color: '#FF6B6B', // Red color for database nodes
        size: GRAPH_CONFIG.visual.DB_NODE_SIZE,
        val: GRAPH_CONFIG.visual.DB_NODE_SIZE,
      };
      databaseNodes.set(dbConfig.id, dbNode);
      nodes.push(dbNode);
      
      // Link database to home
      links.push({
        source: HOME_NODE_ID,
        target: dbConfig.id,
        color: '#E5E7EB',
        width: 1.5,
      });
    }
  });

  // Create nodes for all pages
  Object.entries(siteMap.pageInfoMap).forEach(([pageId, pageInfo]) => {
    if (processedPages.has(pageId)) return;
    if (pageInfo.language !== locale) return;

    const imageUrl = pageInfo.coverImage || undefined;
    
    const node: GraphNode = {
      id: pageId,
      name: pageInfo.title || 'Untitled',
      slug: pageInfo.slug,
      url: pageInfo.slug ? `/${pageInfo.slug}` : '#',
      type: (pageInfo.type || 'Post') as any,
      color: pageInfo.type === 'Category' ? '#8B5CF6' : '#3B82F6',
      size: pageInfo.type === 'Category' 
        ? GRAPH_CONFIG.visual.CATEGORY_NODE_SIZE 
        : GRAPH_CONFIG.visual.POST_NODE_SIZE,
      imageUrl,
      val: pageInfo.type === 'Category' 
        ? GRAPH_CONFIG.visual.CATEGORY_NODE_SIZE 
        : GRAPH_CONFIG.visual.POST_NODE_SIZE,
    };

    // Preload cover images
    if (imageUrl) {
      preloadImage(imageUrl).then(img => {
        node.img = img;
      }).catch(() => {
        // Image failed to load, will use default styling
        console.warn(`Failed to load image for ${pageInfo.title}: ${imageUrl}`);
      });
    }

    nodes.push(node);
    processedPages.add(pageId);

    // Create links based on parent relationships - respecting hierarchy
    if (pageInfo.parentDbId && databaseNodes.has(pageInfo.parentDbId)) {
      // For pages with parentDbId, only top-level items connect to database
      if (!pageInfo.parentPageId) {
        // Top-level items in database connect to database node
        links.push({
          source: pageInfo.parentDbId,
          target: pageId,
          color: '#E5E7EB',
          width: 1,
        });
      } else if (siteMap.pageInfoMap[pageInfo.parentPageId]) {
        // Child items connect to their parent within the hierarchy
        links.push({
          source: pageInfo.parentPageId,
          target: pageId,
          color: '#E5E7EB',
          width: 1,
        });
      }
    } else if (pageInfo.parentPageId && siteMap.pageInfoMap[pageInfo.parentPageId]) {
      // Regular parent-child relationships for non-database items
      links.push({
        source: pageInfo.parentPageId,
        target: pageId,
        color: '#E5E7EB',
        width: 1,
      });
    } else if (pageId !== HOME_NODE_ID && !pageInfo.parentDbId) {
      // Link to home for standalone items
      links.push({
        source: HOME_NODE_ID,
        target: pageId,
        color: '#E5E7EB',
        width: 1,
      });
    }
  });

  return { nodes, links };
};

export const createTagGraphData = (
  tagGraphData: LocaleTagGraphData | undefined,
  t: (key: string) => string,
  locale: string
): GraphData => {
  if (!tagGraphData) return { nodes: [], links: [] };

  const nodes: GraphNode[] = [];
  const links: GraphLink[] = [];

  // Filter out empty tags before processing
  const validTagCounts = Object.fromEntries(
    Object.entries(tagGraphData.tagCounts || {}).filter(([tag]) => tag !== '')
  );
  const tagCounts = validTagCounts;
  const totalTags = Object.keys(tagCounts).length;

  // Create the 'All Tags' node
  // Use the translated string for the 'All Tags' node name
  const allTagsNodeName = t('allTags');

  const allTagsNode: GraphNode = {
    id: ALL_TAGS_NODE_ID,
    name: allTagsNodeName,
    type: 'Root' as any,
    url: `/${locale}/all-tags`,
    color: '#059669', // A darker shade for the main node
    val: totalTags, // Size based on the number of unique tags
    count: totalTags,
  };
  nodes.push(allTagsNode);

  // Create individual tag nodes
  Object.entries(tagCounts).forEach(([tag, count]) => {
    const tagNode: GraphNode = {
      id: tag,
      name: tag,
      url: `/${locale}/tag/${encodeURIComponent(tag)}`,
      type: 'Tag' as any,
      color: '#10B981',
      val: count, // Size based on the number of posts with this tag
      count: count || 0,
    };
    nodes.push(tagNode);

    // Link each tag to the 'All Tags' node
    links.push({
      source: ALL_TAGS_NODE_ID,
      target: tag,
      color: '#D1D5DB',
      width: 0.5,
    });
  });

  // Create links for tag relationships (co-occurrences)
  Object.entries(tagGraphData.tagRelationships || {}).forEach(([tag, relatedTags]) => {
    relatedTags.forEach(relatedTag => {
      // Ensure both nodes exist before creating a link
      if (tagCounts[tag] && tagCounts[relatedTag]) {
        links.push({
          source: tag,
          target: relatedTag,
          color: '#9CA3AF',
          width: 1,
        });
      }
    });
  });

  return { nodes, links };
};

export const cleanupImageCache = () => {
  imageCache.clear();
};

// Memoization cache for processed data
const dataCache = new Map<string, GraphData>();

export const getCachedGraphData = (
  key: string,
  generator: () => GraphData
): GraphData => {
  if (dataCache.has(key)) {
    return dataCache.get(key)!;
  }
  
  const data = generator();
  dataCache.set(key, data);
  return data;
};

export const invalidateDataCache = () => {
  dataCache.clear();
};
