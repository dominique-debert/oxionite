/**
 * Graph Control API
 * High-level API for external control of graph instances
 * Provides a unified interface for URL-based focusing, hover interactions, and modal state management
 */

import type { GraphViewType } from '../types/graph.types';
import { GRAPH_CONFIG } from '../utils/graphConfig';
import type { SiteMap } from '@/lib/context/types';
import { parseUrlPathname } from '@/lib/context/url-parser';

export interface GraphControlMessage {
  type: 'fitToHome' | 'focusNode' | 'focusNodes' | 'changeView' | 'highlightNodes' | 'clearHighlight' | 'focusBySlug';
  instanceType: 'sidenav' | 'home';
  payload?: any;
  continuous?: boolean;
}

export interface FocusTarget {
  type: 'node' | 'nodes' | 'category' | 'tag' | 'post';
  id?: string;
  ids?: string[];
  tags?: string[];
}

export interface GraphControlOptions {
  duration?: number;
  padding?: number;
  highlightBorder?: boolean;
}

/**
 * High-level graph control API
 * Manages communication between external components (routing, UI) and graph instances
 */
class GraphControlAPI {
  private instanceState = new Map<string, any>();
  private listeners = new Map<string, Array<(message: any) => void>>();
  private focusIntervals = new Map<string, NodeJS.Timeout>();
  private pendingFitToHome = new Map<string, boolean>();
  private instanceStates = new Map<string, {
    currentView: GraphViewType;
    focusTarget: FocusTarget | null;
    isModalOpen: boolean;
  }>();
  private siteMap: SiteMap | null = null;
  private recordMap: any | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      (window as any).__graphControl = this;
    }
  }

  /**
   * Set the siteMap for accessing page information
   */
  setSiteMap(siteMap: SiteMap) {
    this.siteMap = siteMap;
  }

  /**
   * Set the recordMap for accessing detailed page data including tags
   */
  setRecordMap(recordMap: any) {
    this.recordMap = recordMap;
  }

  /**
   * Get tags for a page by slug using recordMap for accurate tag extraction from ISR cache
   */
  private getTagsBySlug(slug: string): string[] {
    if (!this.siteMap) {
      console.warn('[GraphControl] No siteMap available');
      return [];
    }

    // Debug: log siteMap structure
    console.log('[GraphControl] Debug - siteMap structure:', {
      hasPageInfoMap: !!this.siteMap.pageInfoMap,
      pageInfoKeys: this.siteMap.pageInfoMap ? Object.keys(this.siteMap.pageInfoMap).slice(0, 5) : [],
      samplePage: this.siteMap.pageInfoMap ? this.siteMap.pageInfoMap[Object.keys(this.siteMap.pageInfoMap)[0]] : null
    });

    // Find page by slug
    const pageInfo = Object.values(this.siteMap.pageInfoMap).find(
      (page) => page.slug === slug
    );

    if (!pageInfo) {
      console.warn(`[GraphControl] No page found for slug: ${slug}`);
      
      // Debug: show all available slugs
      const allSlugs = Object.values(this.siteMap.pageInfoMap).map(p => ({ slug: p.slug, title: p.title }));
      console.log('[GraphControl] Debug - All available slugs:', allSlugs);
      
      return [];
    }

    console.log(`[GraphControl] Debug - PageInfo for slug '${slug}':`, {
      pageId: pageInfo.pageId,
      title: pageInfo.title,
      tags: pageInfo.tags,
      hasRecordMap: !!this.recordMap,
      recordMapKeys: this.recordMap ? Object.keys(this.recordMap).slice(0, 10) : [],
      hasPageInRecordMap: this.recordMap ? !!this.recordMap[pageInfo.pageId] : false
    });

    // If we have recordMap, use it to get tags like PostHeader.tsx does
    if (this.recordMap && this.recordMap[pageInfo.pageId]) {
      const block = this.recordMap[pageInfo.pageId];
      console.log(`[GraphControl] Debug - recordMap block structure for page ${pageInfo.pageId}:`, {
        hasValue: !!block?.value,
        hasProperties: !!block?.value?.properties,
        keys: block ? Object.keys(block) : [],
        valueKeys: block?.value ? Object.keys(block.value) : []
      });
      
      if (block?.value?.properties) {
        const properties = block.value.properties;
        console.log(`[GraphControl] Debug - all properties for page ${pageInfo.pageId}:`, Object.keys(properties));
        
        // Check all possible tag property names
        const possibleTagKeys = ['Tags', 'tags', 'TAGS', 'Tag', 'tag'];
        let tagsProperty = null;
        let foundKey = null;
        
        for (const key of possibleTagKeys) {
          if (properties[key]) {
            tagsProperty = properties[key];
            foundKey = key;
            break;
          }
        }
        
        console.log(`[GraphControl] Debug - found tagsProperty using key '${foundKey}':`, tagsProperty);
        
        if (tagsProperty) {
          let tags: string[] = [];
          
          // Handle different Notion property formats
          if (Array.isArray(tagsProperty)) {
            tags = tagsProperty
              .filter((tag: any) => {
                if (typeof tag === 'string') return tag.trim().length > 0;
                if (tag && typeof tag === 'object') {
                  return tag.name && typeof tag.name === 'string' && tag.name.trim().length > 0;
                }
                return false;
              })
              .map((tag: any) => {
                if (typeof tag === 'string') return tag.trim();
                return tag.name.trim();
              });
          } else if (typeof tagsProperty === 'string' && tagsProperty.trim().length > 0) {
            tags = [tagsProperty.trim()];
          } else if (tagsProperty && typeof tagsProperty === 'object') {
            // Handle multi_select format (most common for Notion)
            if (tagsProperty.multi_select) {
              tags = tagsProperty.multi_select
                .map((tag: any) => tag.name || tag)
                .filter((tag: any) => typeof tag === 'string' && tag.trim().length > 0)
                .map((tag: any) => tag.trim());
            } else if (tagsProperty.name && typeof tagsProperty.name === 'string' && tagsProperty.name.trim().length > 0) {
              tags = [tagsProperty.name.trim()];
            } else if (tagsProperty.results) {
              // Handle relation format
              tags = tagsProperty.results
                .filter((tag: any) => tag.title && typeof tag.title === 'string' && tag.title.trim().length > 0)
                .map((tag: any) => tag.title.trim());
            }
          }
          
          console.log(`[GraphControl] Found tags via recordMap for slug '${slug}' (page: ${pageInfo.title}):`, tags);
          return tags;
        }
      }
    }

    // Fallback to pageInfo.tags if recordMap is not available
    const rawTags = pageInfo.tags || [];
    
    // Process tags similar to PostHeader.tsx logic
    let tags: string[] = [];
    
    if (Array.isArray(rawTags)) {
      tags = rawTags
        .filter((tag: unknown) => typeof tag === 'string' && (tag as string).trim().length > 0)
        .map((tag: unknown) => (tag as string).trim());
    } else if (typeof rawTags === 'string' && (rawTags as string).trim().length > 0) {
      tags = [(rawTags as string).trim()];
    } else if (rawTags && typeof rawTags === 'object') {
      // Handle multi_select format from Notion
      const tagObj = rawTags as Record<string, any>;
      if (tagObj.multi_select) {
        tags = tagObj.multi_select
          .map((tag: any) => tag.name || tag)
          .filter((tag: unknown) => typeof tag === 'string' && (tag as string).trim().length > 0)
          .map((tag: unknown) => (tag as string).trim());
      } else if (tagObj.name && typeof tagObj.name === 'string' && (tagObj.name as string).trim().length > 0) {
        tags = [(tagObj.name as string).trim()];
      }
    }

    console.log(`[GraphControl] Fallback to pageInfo.tags for slug '${slug}' (page: ${pageInfo.title}):`, tags);
    return tags;
  }

  /**
   * Send control message to specific graph instance
   */
  private sendMessage(message: GraphControlMessage) {
    console.log(`[GraphControl] Sending to ${message.instanceType}:`, message);
    const listeners = this.listeners.get(message.instanceType) || [];
    listeners.forEach(listener => listener(message));
  }

  /**
   * Register listener for specific instance
   */
  addListener(instanceType: string, callback: (message: GraphControlMessage) => void) {
    if (!this.listeners.has(instanceType)) {
      this.listeners.set(instanceType, []);
    }
    this.listeners.get(instanceType)!.push(callback);
  }

  /**
   * Remove listener for specific instance
   */
  removeListener(instanceType: string, callback: (message: GraphControlMessage) => void) {
    const listeners = this.listeners.get(instanceType);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index !== -1) {
        listeners.splice(index, 1);
      }
    }
  }

  /**
   * Update instance state
   */
  updateInstanceState(instanceType: string, state: Partial<{
    currentView: GraphViewType;
    focusTarget: FocusTarget | null;
    isModalOpen: boolean;
  }>) {
    const current = this.instanceStates.get(instanceType) || {
      currentView: 'post_view',
      focusTarget: null,
      isModalOpen: false,
    };
    
    this.instanceStates.set(instanceType, { ...current, ...state });
  }

  

  /**
   * Handle initial URL-based focus when graph first loads
   */
  handleUrlInitialFocus(pathname: string, instanceType: 'sidenav' | 'home' = 'sidenav') {
    console.log(`[GraphControl] Handling initial URL focus: ${pathname} for ${instanceType}`);
    
    const { segment, slug } = parseUrlPathname(pathname);
    
    if (!segment) {
      this.changeView('post_view', instanceType);
      this.scheduleFitToHome(instanceType);
      return;
    }

    // Store the initial focus request to be processed when graph is ready
    this.setInitialFocusRequest({ segment, slug, instanceType });
  }

  /**
   * Store initial focus request for processing when graph is ready
   */
  private setInitialFocusRequest(request: { segment: string; slug: string; instanceType: 'sidenav' | 'home' }) {
    if (typeof window !== 'undefined') {
      // Store in a temporary variable that can be accessed by GraphProvider
      if (!(window as any).__graphInitialFocus) {
        (window as any).__graphInitialFocus = {};
      }
      (window as any).__graphInitialFocus[request.instanceType] = request;
      console.log(`[GraphControl] Stored initial focus request for ${request.instanceType}:`, request);
    }
  }

  /**
   * Process initial focus request when graph is ready
   */
  processInitialFocusWhenReady(instanceType: 'sidenav' | 'home', graphReady: boolean) {
    console.log(`[GraphControl] Checking initial focus conditions: graphReady=${graphReady}, window=${typeof window}`);
    
    if (!graphReady || typeof window === 'undefined') {
      console.log(`[GraphControl] Skipping initial focus - conditions not met`);
      return;
    }

    const request = (window as any).__graphInitialFocus?.[instanceType];
    console.log(`[GraphControl] Checking for stored request in ${instanceType}:`, request);
    
    if (!request) {
      console.log(`[GraphControl] No initial focus request found for ${instanceType}`);
      return;
    }

    console.log(`[GraphControl] Processing initial focus request for ${instanceType}:`, request);
    
    // Remove the request to prevent duplicate processing
    delete (window as any).__graphInitialFocus[instanceType];

    // Handle based on segment only (view type independent)
    switch (request.segment) {
      case 'post':  
        console.log(`[GraphControl] Processing initial focus request for post: ${request.slug}`);
        this.changeViewAndFocusBySlug('post_view', request.slug, instanceType);
        this.highlightBySlug([request.slug], instanceType);
        break;
        
      case 'category':
        console.log(`[GraphControl] Processing initial focus request for category: ${request.slug}`);
        this.changeViewAndFocusBySlug('post_view', request.slug, instanceType);
        this.highlightBySlug([request.slug], instanceType);
        break;
        
      case 'tag':
        console.log(`[GraphControl] Processing initial focus request for tag: ${request.slug}`);
        this.changeViewAndFocusNode('tag_view', request.slug, instanceType);
        this.highlightByTag([request.slug], instanceType);
        break;
        
      case 'all-tags':
        console.log(`[GraphControl] Switching to tag view for all-tags`);
        this.changeView('tag_view', instanceType);
        this.scheduleFitToHome(instanceType);
        break;
        
      default:
        console.log(`[GraphControl] Unknown segment for initial focus: ${request.segment}`);
        this.changeView('post_view', instanceType);
        this.scheduleFitToHome(instanceType);
        break;
    }
  }

  /**
   * Schedule fitToHome to run after graph is ready
   */
  scheduleFitToHome(instanceType: 'sidenav' | 'home' = 'sidenav') {
    console.log(`[GraphControl] Scheduling fitToHome for ${instanceType}`);
    this.pendingFitToHome.set(instanceType, true);
  }

  /**
   * Process pending fitToHome operations when graph becomes ready
   */
  processPendingFitToHome(instanceType: 'sidenav' | 'home' = 'sidenav') {
    if (this.pendingFitToHome.get(instanceType)) {
      console.log(`[GraphControl] Executing pending fitToHome for ${instanceType}`);
      this.pendingFitToHome.set(instanceType, false);
      this.fitToHome(instanceType);
    }
  }

  /**
   * Handle URL-based routing
   */
  handleUrlCurrentFocus(pathname: string, instanceType: 'sidenav' | 'home' = 'sidenav', currentView?: GraphViewType, continuousFocus = false) {
    console.log(`[GraphControl] handleUrlCurrentFocus: ${pathname} for ${instanceType}, currentView: ${currentView}, continuousFocus: ${continuousFocus}`);
    
    const { segment, slug } = parseUrlPathname(pathname);
    
    if (!segment) {
      console.log(`[GraphControl] Root path - no focus`);
      return;
    }

    // Use provided currentView or fallback to instance state
    const effectiveCurrentView = currentView || this.instanceStates.get(instanceType)?.currentView || 'post_view';
    
    console.log(`[GraphControl] Segment: ${segment}, Slug: ${slug}, CurrentView: ${effectiveCurrentView}`);

    // Handle based on segment and view type
    switch (segment) {
      case 'post':
        if (effectiveCurrentView === 'post_view' && slug) {
          // Post segment with post_view: implement focus functionality
          this.changeViewAndFocusBySlug('post_view', slug, instanceType, undefined, continuousFocus);
          this.highlightBySlug([slug], instanceType);
        } else if (effectiveCurrentView === 'tag_view' && slug) {
          // Post segment with tag_view: extract tags and focus on them
          const tags = this.getTagsBySlug(slug);
          if (tags.length > 0) {
            console.log(`[GraphControl] Found tags for post ${slug}:`, tags);
            this.changeViewAndFocusNode('tag_view', tags, instanceType, undefined, continuousFocus);
            this.highlightByTag(tags, instanceType);
          } else {
            console.log(`[GraphControl] No tags found for post ${slug}`);
            this.changeView('tag_view', instanceType);
          }
        }
        break;
        
      case 'category':
        if (effectiveCurrentView === 'post_view') {
          // Category segment with post_view: TODO - implement later
          this.changeViewAndFocusBySlug('post_view', slug, instanceType, undefined, continuousFocus);
          this.highlightBySlug([slug], instanceType);
        } else if (effectiveCurrentView === 'tag_view') {
          // Do nothing
        }
        break;
        
      case 'tag':
        if (effectiveCurrentView === 'post_view') {
          // Do nothing
        } else if (effectiveCurrentView === 'tag_view' && slug) {
          this.changeViewAndFocusBySlug('tag_view', slug, instanceType, undefined, continuousFocus);
          this.highlightByTag([slug], instanceType);
        }
        break;
        
      default:
        console.log(`[GraphControl] Unknown segment: ${segment}`);
        break;
    }
  }

  /**
   * High-level control methods
   */
  fitToHome(instanceType: 'sidenav' | 'home' = 'sidenav', options?: GraphControlOptions) {
    this.sendMessage({
      type: 'fitToHome',
      instanceType,
      payload: options
    });
  }

  focusOnTarget(target: FocusTarget, instanceType: 'sidenav' | 'home' = 'sidenav', options?: GraphControlOptions) {
    switch (target.type) {
      case 'node':
      case 'post':
      case 'category':
        if (target.id) {
          this.focusBySlug(target.id, instanceType, options);
        }
        break;
      case 'tag':
        if (target.id) {
          this.focusNode(target.id, instanceType, options);
        }
        break;
      case 'nodes':
        if (target.ids) {
          this.focusNodes(target.ids, instanceType, options);
        }
        break;
    }
  }

  focusNode(nodeId: string, instanceType: 'sidenav' | 'home' = 'sidenav', options?: GraphControlOptions) {
    this.sendMessage({
      type: 'focusNode',
      instanceType,
      payload: { nodeId, options }
    });
  }

  focusBySlug(slug: string, instanceType: 'sidenav' | 'home' = 'sidenav', options?: GraphControlOptions) {
    this.sendMessage({
      type: 'focusBySlug',
      instanceType,
      payload: { slug, options }
    });
  }

  focusNodes(nodeIds: string[], instanceType: 'sidenav' | 'home' = 'sidenav', options?: GraphControlOptions) {
    this.sendMessage({
      type: 'focusNodes',
      instanceType,
      payload: { nodeIds, options }
    });
  }

  changeView(view: GraphViewType, instanceType: 'sidenav' | 'home' = 'sidenav') {
    console.log(`[GraphControl] changeView: ${instanceType} switching to ${view}`);
    
    this.updateInstanceState(instanceType, { 
      currentView: view,
    });
    this.sendMessage({
      type: 'changeView',
      instanceType,
      payload: { view }
    });
  }

  /**
   * Sequential operation: change view and then focus by slug(s) with continuous retry
   */
  changeViewAndFocusBySlug(view: GraphViewType, slug: string | string[], instanceType: 'sidenav' | 'home' = 'sidenav', options?: GraphControlOptions, continuous?: boolean) {
    const currentState = this.instanceStates.get(instanceType);
    const needsViewChange = !currentState || currentState.currentView !== view;
    
    if (needsViewChange) {
      console.log(`[needsViewChange] Changing view to ${view} for ${instanceType}`);
      this.changeView(view, instanceType);
    } else {
      console.log(`[needsViewChange] View ${view} already active for ${instanceType}`);
    }
    
    // Normalize slug to array
    const slugs = Array.isArray(slug) ? slug : [slug];

    console.log(`[GraphControl] changeViewAndFocusBySlug: ${instanceType} changing to ${view} and focusing on ${slugs} with options ${options} and continuous ${continuous}`);
    
    setTimeout(() => {
      if (slugs.length === 1) {
        // Single slug: use existing behavior
        this.sendMessage({
          type: 'focusBySlug',
          instanceType,
          payload: { slug: slugs[0], options, continuous: continuous ?? needsViewChange }
        });
      } else {
        // Multiple slugs: use focusBySlug with array for zoom-to-fit
        this.sendMessage({
          type: 'focusBySlug',
          instanceType,
          payload: { slugs, options: { ...options, continuous: continuous ?? needsViewChange } }
        });
      }
    }, needsViewChange ? 50 : 0);
  }



  /**
   * Sequential operation: change view and then focus node(s) with continuous retry
   */
  changeViewAndFocusNode(view: GraphViewType, nodeId: string | string[], instanceType: 'sidenav' | 'home' = 'sidenav', options?: GraphControlOptions, continuous?: boolean) {
    const currentState = this.instanceStates.get(instanceType);
    const needsViewChange = !currentState || currentState.currentView !== view;
    
    // Normalize nodeId to array
    const nodeIds = Array.isArray(nodeId) ? nodeId : [nodeId];
    
    if (needsViewChange) {
      console.log(`[GraphControl] Changing view to ${view} for ${instanceType}`);
      this.changeView(view, instanceType);
    }
    
    // Always use continuous retry when view type changes (regardless of same/different)
    setTimeout(() => {
      if (nodeIds.length === 1) {
        // Single node: use existing behavior
        this.sendMessage({
          type: 'focusNode',
          instanceType,
          payload: { nodeId: nodeIds[0], options, continuous: continuous ?? true }
        });
      } else {
        // Multiple nodes: use focusNodes for zoom-to-fit
        this.sendMessage({
          type: 'focusNodes',
          instanceType,
          payload: { nodeIds, options: { ...options, continuous: continuous ?? true } }
        });
      }
    }, needsViewChange ? 50 : 0);
  }

  /**
   * Handle modal open/close events
   */
  handleModalToggle(isOpen: boolean, instanceType: 'sidenav' | 'home' = 'sidenav') {
    this.updateInstanceState(instanceType, { isModalOpen: isOpen });
    
    // When modal opens/closes, maintain focus if available
    const state = this.instanceStates.get(instanceType);
    if (state?.focusTarget) {
      this.focusOnTarget(state.focusTarget, instanceType);
    } else {
      this.fitToHome(instanceType);
    }
  }


  /**
   * Highlight nodes by slug (for post view)
   */
  highlightBySlug(slugs: string[], instanceType: 'sidenav' | 'home' = 'sidenav') {
    console.log(`[GraphControl] Highlighting slugs:`, slugs);
    this.sendMessage({
      type: 'highlightNodes',
      instanceType,
      payload: {
        type: 'slug',
        values: slugs
      }
    });
  }

  /**
   * Highlight nodes by tag (for tag view)
   */
  highlightByTag(tags: string[], instanceType: 'sidenav' | 'home' = 'sidenav') {
    console.log(`[GraphControl] Highlighting tags:`, tags);
    this.sendMessage({
      type: 'highlightNodes',
      instanceType,
      payload: {
        type: 'tag',
        values: tags
      }
    });
  }

  /**
   * Clear all highlights
   */
  clearHighlight(instanceType: 'sidenav' | 'home' = 'sidenav') {
    console.log(`[GraphControl] Clearing highlights`);
    this.sendMessage({
      type: 'clearHighlight',
      instanceType,
      payload: {}
    });
  }

  /**
   * Get instance state for a specific instance type
   */
  getInstanceState(instanceType: string) {
    return this.instanceStates.get(instanceType);
  }

  /**
   * Debug helpers for development
   */
  debug() {
    console.log('[GraphControl] Current state:', {
      listeners: Array.from(this.listeners.keys()),
      instanceStates: Array.from(this.instanceStates.entries())
    });
  }
}

/**
 * Calculate optimal zoom level to fit multiple nodes within canvas bounds
 * @param bounds - Bounding box containing minX, maxX, minY, maxY coordinates
 * @param canvasWidth - Canvas width in pixels
 * @param canvasHeight - Canvas height in pixels
 * @param padding - Padding around the bounding box in pixels
 * @returns Optimal zoom level
 */
export function calculateZoomLevel(
  bounds: { minX: number; maxX: number; minY: number; maxY: number },
  canvasWidth: number,
  canvasHeight: number,
  paddingInPixels: number = GRAPH_CONFIG.zoom.DEFAULT_PADDING
): number {
  const { minX, maxX, minY, maxY } = bounds;

  const width = maxX - minX;
  const height = maxY - minY;

  console.log('[calculateZoomLevel] Debug info:', {
    bounds: { minX, maxX, minY, maxY },
    width,
    height,
    canvasWidth,
    canvasHeight,
    paddingInPixels
  });

  // 모든 노드가 한 점에 있는 경우 (너비/높이가 0)
  if (width === 0 && height === 0) {
    console.log('[calculateZoomLevel] Zero bounds, returning zoom=5');
    return 5; // 적절한 기본 줌 레벨 반환
  }

  const targetCanvasWidth = canvasWidth * GRAPH_CONFIG.zoom.MULTIPLE_ZOOM_RATIO;
  const targetCanvasHeight = canvasHeight * GRAPH_CONFIG.zoom.MULTIPLE_ZOOM_RATIO;

  console.log('[calculateZoomLevel] Target canvas dimensions:', {
    targetCanvasWidth,
    targetCanvasHeight,
    MULTIPLE_ZOOM_RATIO: GRAPH_CONFIG.zoom.MULTIPLE_ZOOM_RATIO
  });

  // 1. 패딩이 없다고 가정하고, 노드 바운딩 박스를 목표 캔버스 영역에 맞추기 위한 '기본 줌 레벨'을 계산합니다.
  // 이 줌 레벨이 '그래프 좌표 단위'와 '픽셀' 사이의 변환 비율이 됩니다.
  const zoomXWithoutPadding = targetCanvasWidth / (width || 1);
  const zoomYWithoutPadding = targetCanvasHeight / (height || 1);

  console.log('[calculateZoomLevel] Zoom without padding:', {
    zoomXWithoutPadding,
    zoomYWithoutPadding
  });

  // 두 축 모두 화면 안에 들어와야 하므로 더 작은 줌 레벨을 선택합니다.
  const baseZoom = Math.min(zoomXWithoutPadding, zoomYWithoutPadding);

  console.log('[calculateZoomLevel] Base zoom:', baseZoom);

  // 2. 원하는 '픽셀' 단위의 패딩을 '그래프 좌표' 단위로 변환합니다.
  // 예를 들어 baseZoom이 5라면, 1 그래프 단위 = 5 픽셀입니다.
  // 따라서 20px 패딩은 20/5 = 4 그래프 단위가 됩니다.
  const paddingInGraphUnits = paddingInPixels / baseZoom;

  console.log('[calculateZoomLevel] Padding conversion:', {
    paddingInPixels,
    baseZoom,
    paddingInGraphUnits
  });

  // 3. 변환된 그래프 단위 패딩을 적용하여 유효 너비/높이를 계산합니다.
  const effectiveWidth = width + (paddingInGraphUnits * 2);
  const effectiveHeight = height + (paddingInGraphUnits * 2);

  console.log('[calculateZoomLevel] Effective dimensions:', {
    effectiveWidth,
    effectiveHeight
  });

  // 4. 최종 줌 레벨을 다시 계산합니다. 
  const finalZoomX = targetCanvasWidth / effectiveWidth;
  const finalZoomY = targetCanvasHeight / effectiveHeight;

  const finalZoom = Math.min(finalZoomX, finalZoomY);

  console.log('[calculateZoomLevel] Final calculation:', {
    finalZoomX,
    finalZoomY,
    finalZoom,
    clampedZoom: Math.max(0.1, Math.min(finalZoom, 10))
  });

  return Math.max(0.1, Math.min(finalZoom, 10));
}

export const graphControl = new GraphControlAPI();
