/**
 * Graph Control API
 * High-level API for external control of graph instances
 * Provides a unified interface for URL-based focusing, hover interactions, and modal state management
 */

import type { GraphViewType } from '../types/graph.types';
import { GRAPH_CONFIG } from '../utils/graphConfig';

export interface GraphControlMessage {
  type: 'fitToHome' | 'focusNode' | 'focusNodes' | 'changeView' | 'highlightNodes' | 'clearHighlight' | 'focusBySlug';
  instanceType: 'sidenav' | 'home';
  payload?: any;
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
  private instanceState: Map<string, any> = new Map();
  private listeners: Map<string, Array<(message: any) => void>> = new Map();
  private focusIntervals: Map<string, NodeJS.Timeout> = new Map();
  private instanceStates: Map<string, {
    currentView: GraphViewType;
    focusTarget: FocusTarget | null;
    isModalOpen: boolean;
  }> = new Map();

  constructor() {
    if (typeof window !== 'undefined') {
      (window as any).__graphControl = this;
    }
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
      if (index > -1) {
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
   * Handle URL-based routing
   */
  handleUrlRouting(pathname: string, instanceType: 'sidenav' | 'home' = 'sidenav') {
    console.log(`[GraphControl] Handling URL: ${pathname} for ${instanceType}`);
    
    // Parse URL path without creating URL object to avoid hostname issues
    const segments = pathname.split('/').filter(Boolean);
    
    let targetView: GraphViewType = 'post_view';
    let focusTarget: FocusTarget | null = null;
    let currentSegment = '';

    // Smart approach: Look for actual routing patterns
    // Find the first occurrence of our known route types and use everything after
    const routeTypes = ['post', 'category', 'tag', 'all-tags'];
    let startIndex = 0;
    
    for (let i = 0; i < segments.length; i++) {
      if (routeTypes.includes(segments[i])) {
        startIndex = i;
        break;
      }
    }
    
    const relevantSegments = segments.slice(startIndex);

    if (relevantSegments.length === 0) {
      // Root path: / or /{locale}/ - no focus
      focusTarget = null;
      currentSegment = 'home';
    } else if (relevantSegments[0] === 'post' && relevantSegments[1]) {
      // /post/{slug} or /post/{slug}/{subpage}
      targetView = 'post_view';
      focusTarget = { type: 'post', id: relevantSegments[1] };
      currentSegment = `post/${relevantSegments[1]}`;
    } else if (relevantSegments[0] === 'category' && relevantSegments[1]) {
      // /category/{slug}
      targetView = 'post_view';
      focusTarget = { type: 'category', id: relevantSegments[1] };
      currentSegment = `category/${relevantSegments[1]}`;
    } else if (relevantSegments[0] === 'tag' && relevantSegments[1]) {
      // /tag/{tag}
      targetView = 'tag_view';
      focusTarget = { type: 'tag', id: relevantSegments[1] };
      currentSegment = `tag/${relevantSegments[1]}`;
    } else if (relevantSegments[0] === 'all-tags') {
      // /all-tags - no focus
      targetView = 'tag_view';
      focusTarget = null;
      currentSegment = 'all-tags';
    }

    console.log(`[GraphControl] Current segment: ${currentSegment}`);

    // Send appropriate messages
    if (focusTarget && focusTarget.id) {
      const { type, id } = focusTarget;
      
      if (type === 'post' || type === 'category') {
        // Use changeViewAndFocusBySlug for post and category targets
        this.changeViewAndFocusBySlug(targetView, id, instanceType);
      } else if (type === 'tag') {
        // Use changeViewAndFocusNode for tag targets
        this.changeViewAndFocusNode(targetView, id, instanceType);
      }
    } else {
      // No focus target, just change view if needed
      if (targetView !== this.instanceStates.get(instanceType)?.currentView) {
        this.changeView(targetView, instanceType);
      }
      this.fitToHome(instanceType);
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
    this.updateInstanceState(instanceType, { currentView: view });
    this.sendMessage({
      type: 'changeView',
      instanceType,
      payload: { view }
    });
  }

  /**
   * Sequential operation: change view and then focus by slug(s) with continuous retry
   */
  changeViewAndFocusBySlug(view: GraphViewType, slug: string | string[], instanceType: 'sidenav' | 'home' = 'sidenav', options?: GraphControlOptions) {
    const currentState = this.instanceStates.get(instanceType);
    const needsViewChange = !currentState || currentState.currentView !== view;
    
    // Normalize slug to array
    const slugs = Array.isArray(slug) ? slug : [slug];
    
    if (needsViewChange) {
      this.changeView(view, instanceType);
      
      // Let GraphProvider handle the 50 retry attempts internally
      setTimeout(() => {
        if (slugs.length === 1) {
          // Single slug: use existing behavior
          this.sendMessage({
            type: 'focusBySlug',
            instanceType,
            payload: { slug: slugs[0], options, continuous: true }
          });
        } else {
          // Multiple slugs: use focusBySlugs for zoom-to-fit
          this.sendMessage({
            type: 'focusBySlug',
            instanceType,
            payload: { slugs, options: { ...options, continuous: true } }
          });
        }
      }, 50);
    } else {
      // View type is already correct, focus directly without continuous retry
      if (slugs.length === 1) {
        this.focusBySlug(slugs[0], instanceType, options);
      } else {
        // Multiple slugs: use focusBySlug with slugs array
        this.sendMessage({
          type: 'focusBySlug',
          instanceType,
          payload: { slugs, options }
        });
      }
    }
  }



  /**
   * Sequential operation: change view and then focus node(s) with continuous retry
   */
  changeViewAndFocusNode(view: GraphViewType, nodeId: string | string[], instanceType: 'sidenav' | 'home' = 'sidenav', options?: GraphControlOptions) {
    const currentState = this.instanceStates.get(instanceType);
    const needsViewChange = !currentState || currentState.currentView !== view;
    
    // Normalize nodeId to array
    const nodeIds = Array.isArray(nodeId) ? nodeId : [nodeId];
    
    if (needsViewChange) {
      this.changeView(view, instanceType);
      
      // Let GraphProvider handle the 50 retry attempts internally
      setTimeout(() => {
        if (nodeIds.length === 1) {
          // Single node: use existing behavior
          this.sendMessage({
            type: 'focusNode',
            instanceType,
            payload: { nodeId: nodeIds[0], options, continuous: true }
          });
        } else {
          // Multiple nodes: use focusNodes for zoom-to-fit
          this.sendMessage({
            type: 'focusNodes',
            instanceType,
            payload: { nodeIds, options: { ...options, continuous: true } }
          });
        }
      }, 50);
    } else {
      // View type is already correct, focus directly without continuous retry
      if (nodeIds.length === 1) {
        this.focusNode(nodeIds[0], instanceType, options);
      } else {
        this.focusNodes(nodeIds, instanceType, options);
      }
    }
  }

  highlightNodes(nodeIds: string[], instanceType: 'sidenav' | 'home' = 'sidenav') {
    this.sendMessage({
      type: 'highlightNodes',
      instanceType,
      payload: { nodeIds }
    });
  }

  clearHighlight(instanceType: 'sidenav' | 'home' = 'sidenav') {
    this.sendMessage({
      type: 'clearHighlight',
      instanceType
    });
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
   * Handle hover interactions from CategoryTree and TagButton
   */
  handleHover(hoverData: {
    type: 'category' | 'tag' | 'post';
    id: string;
    instanceType: 'sidenav' | 'home';
  }) {
    const { type, id, instanceType } = hoverData;
    
    if (type === 'category' || type === 'post') {
      this.changeView('post_view', instanceType);
      this.focusNode(id, instanceType);
    } else if (type === 'tag') {
      this.changeView('tag_view', instanceType);
      this.focusNode(id, instanceType);
    }
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
