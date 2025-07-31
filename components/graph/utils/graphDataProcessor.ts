import type { SiteMap } from '@/lib/types';
import type { TagGraphData } from '@/lib/tag-graph';
import type { GraphData, GraphNode, GraphLink } from '../types/graph.types';
import { HOME_NODE_ID, GRAPH_CONFIG } from './graphConfig';
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

  // Create home node
  const homeNode: GraphNode = {
    id: HOME_NODE_ID,
    name: siteConfig.name,
    description: siteConfig.description,
    type: 'Root' as any,
    url: '/',
    color: '#8B5CF6',
    size: GRAPH_CONFIG.visual.HOME_NODE_SIZE,
    val: GRAPH_CONFIG.visual.HOME_NODE_SIZE,
  };
  nodes.push(homeNode);

  // Create nodes for all pages
  Object.entries(siteMap.pageInfoMap).forEach(([pageId, pageInfo]) => {
    if (processedPages.has(pageId)) return;
    if (pageInfo.language !== locale) return;

    const node: GraphNode = {
      id: pageId,
      name: pageInfo.title || 'Untitled',
      url: pageInfo.slug ? `/${pageInfo.slug}` : '#',
      type: (pageInfo.type || 'Post') as any,
      color: pageInfo.type === 'Category' ? '#8B5CF6' : '#3B82F6',
      size: pageInfo.type === 'Category' 
        ? GRAPH_CONFIG.visual.CATEGORY_NODE_SIZE 
        : GRAPH_CONFIG.visual.POST_NODE_SIZE,
      imageUrl: pageInfo.image || undefined,
      val: pageInfo.type === 'Category' 
        ? GRAPH_CONFIG.visual.CATEGORY_NODE_SIZE 
        : GRAPH_CONFIG.visual.POST_NODE_SIZE,
    };

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

export const createTagGraphData = (tagGraphData: TagGraphData | undefined): GraphData => {
  if (!tagGraphData) return { nodes: [], links: [] };

  const nodes: GraphNode[] = [];
  const links: GraphLink[] = [];

  // Create tag nodes
  Object.entries(tagGraphData.tagCounts || {}).forEach(([tag, count]) => {
    nodes.push({
      id: tag,
      name: tag,
      url: `/tag/${encodeURIComponent(tag)}`,
      type: 'Tag' as any,
      color: '#10B981',
      size: GRAPH_CONFIG.visual.TAG_NODE_SIZE,
      count: count || 0,
      val: GRAPH_CONFIG.visual.TAG_NODE_SIZE,
    });
  });

  // Create tag relationships
  Object.entries(tagGraphData.tagRelationships || {}).forEach(([tag, relatedTags]) => {
    relatedTags.forEach(relatedTag => {
      if (nodes.some(n => n.id === tag) && nodes.some(n => n.id === relatedTag)) {
        links.push({
          source: tag,
          target: relatedTag,
          color: '#D1D5DB',
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
