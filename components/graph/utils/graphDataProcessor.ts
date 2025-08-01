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
  const homeImageUrl = '/favicon.ico';
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

  // Create nodes for all pages
  Object.entries(siteMap.pageInfoMap).forEach(([pageId, pageInfo]) => {
    if (processedPages.has(pageId)) return;
    if (pageInfo.language !== locale) return;

    const imageUrl = pageInfo.coverImage || pageInfo.image || undefined;
    
    const node: GraphNode = {
      id: pageId,
      name: pageInfo.title || 'Untitled',
      url: pageInfo.slug ? `/${pageInfo.slug}` : '#',
      type: (pageInfo.type || 'Post') as any,
      color: pageInfo.type === 'Category' ? '#8B5CF6' : '#3B82F6',
      size: pageInfo.type === 'Category' 
        ? GRAPH_CONFIG.visual.CATEGORY_NODE_SIZE 
        : GRAPH_CONFIG.visual.POST_NODE_SIZE,
      imageUrl: imageUrl,
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

    // Create links based on parent relationships
    if (pageInfo.parentPageId && siteMap.pageInfoMap[pageInfo.parentPageId]) {
      links.push({
        source: pageInfo.parentPageId,
        target: pageId,
        color: '#E5E7EB',
        width: 1,
      });
    } else if (pageId !== HOME_NODE_ID) {
      // Link to home if no parent
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

  const tagCounts = tagGraphData.tagCounts || {};
  const totalTags = Object.keys(tagCounts).length;

  // Create the 'All Tags' node
  const allTagsNode: GraphNode = {
    id: ALL_TAGS_NODE_ID,
    name: t('allTags'),
    type: 'Root' as any,
    url: `/${locale}/tags`,
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
