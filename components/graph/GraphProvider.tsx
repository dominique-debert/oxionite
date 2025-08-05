import React, { createContext, useContext, ReactNode, useCallback, useEffect, useState } from 'react';
import type { GraphContextValue, GraphViewType } from './types/graph.types';
import { useGraphState } from './hooks/useGraphState';
import { useGraphData } from './hooks/useGraphData';
import { useGraphInstance } from './hooks/useGraphInstance';
import localeConfig from '../../site.locale.json';
import type { SiteMap } from '@/lib/context/types';
import { graphControl, calculateZoomLevel } from './utils/graph-control';
import { GRAPH_CONFIG } from './utils/graphConfig';

// Helper function to get canvas dimensions
const getCanvasDimensions = (graphInstance: any, currentView: GraphViewType) => {
  // Get actual canvas dimensions if available
  const actualWidth = graphInstance.width?.();
  const actualHeight = graphInstance.height?.();
  
  if (actualWidth && actualHeight) {
    return { width: actualWidth, height: actualHeight };
  }
  
  // Fallback to view-specific config
  switch (currentView) {
    case 'post_view':
    case 'tag_view':
      return { 
        width: GRAPH_CONFIG.responsive.sidenav.width, 
        height: GRAPH_CONFIG.responsive.sidenav.height 
      };
    default:
      return { 
        width: GRAPH_CONFIG.responsive.home.width, 
        height: GRAPH_CONFIG.responsive.home.height 
      };
  }
};

const GraphContext = createContext<GraphContextValue | undefined>(undefined);

export interface GraphProviderProps {
  children: ReactNode;
  siteMap?: SiteMap;
  recordMap?: any;
  locale?: string;
  instanceType?: 'sidenav' | 'home';
}

export const GraphProvider: React.FC<GraphProviderProps> = ({ 
  children, 
  siteMap, 
  recordMap,
  locale = localeConfig.defaultLocale,
  instanceType = 'sidenav'
}) => {
  // Set siteMap and recordMap in graphControl when available
  useEffect(() => {
    if (siteMap) {
      graphControl.setSiteMap(siteMap);
    }
    if (recordMap) {
      graphControl.setRecordMap(recordMap);
    }
  }, [siteMap, recordMap]);

  const { state, actions: stateActions } = useGraphState();
  const graphData = useGraphData(siteMap, locale);
  const { instance, actions: instanceActions } = useGraphInstance();

  const saveCurrentZoom = useCallback(() => {
    const zoomState = instanceActions.getZoomState();
    if (zoomState) {
      stateActions.setZoomStateForView(state.currentView, zoomState);
    }
  }, [instanceActions, stateActions, state.currentView]);

  const applyCurrentZoom = useCallback((fitView = false) => {
    const savedZoom = state.zoomState[state.currentView];
    if (savedZoom && !fitView) {
      instanceActions.setZoomState(savedZoom.zoom, savedZoom.center);
    } else {
      instanceActions.zoomToFit();
    }
  }, [instanceActions, state.zoomState, state.currentView]);

  // Track continuous focus operations
  const [continuousFocus, setContinuousFocus] = useState<{
    type: 'slug' | 'node';
    target: string;
    options?: any;
  } | null>(null);

  // Debug wrapper for continuous focus
  const setContinuousFocusDebug = useCallback((focus: any) => {
    console.log(`[GraphProvider] setContinuousFocus called with:`, focus);
    setContinuousFocus(focus);
  }, []);

  // Create slug-to-id mapping based on specified view type
  const createSlugToIdMapping = useCallback((viewType?: GraphViewType): Map<string, string> => {
    const mapping = new Map<string, string>();
    const targetView = viewType || state.currentView;
    
    console.log(`[GraphProvider] Creating slug mapping for view:`, targetView);
    
    if (targetView === 'post_view' && graphData.data.postGraph) {
      graphData.data.postGraph.nodes.forEach(node => {
        if (node.slug) {
          mapping.set(node.slug, node.id);
        }
      });
      console.log(`[GraphProvider] Post view mapping:`, Array.from(mapping.keys()));
    } else if (targetView === 'tag_view' && graphData.data.tagGraph) {
      graphData.data.tagGraph.nodes.forEach(node => {
        if (node.slug) {
          mapping.set(node.slug, node.id);
        }
      });
      console.log(`[GraphProvider] Tag view mapping:`, Array.from(mapping.keys()));
    }
    
    return mapping;
  }, [graphData.data.postGraph, graphData.data.tagGraph, state.currentView]);

  // Graph control API listener
  useEffect(() => {
    const currentInstanceType = instanceType || 'sidenav';
    
    // Queue for pending focus operations
    let pendingFocusQueue: Array<{
      type: string;
      payload?: any;
      options?: any;
      targetView?: string;
    }> = [];
    

    
    // Process pending focus operations when data is ready
    const processPendingFocus = () => {
      if (graphData.isLoading) {
        return; // Wait for data to be ready
      }
      
      // Check if we have data for the current view
      const hasPostData = graphData.data.postGraph && graphData.data.postGraph.nodes.length > 0;
      const hasTagData = graphData.data.tagGraph && graphData.data.tagGraph.nodes.length > 0;
      
      if (state.currentView === 'post_view' && !hasPostData) {
        return; // Wait for post data
      }
      
      if (state.currentView === 'tag_view' && !hasTagData) {
        return; // Wait for tag data
      }
      
      while (pendingFocusQueue.length > 0) {
        const operation = pendingFocusQueue.shift();
        if (!operation) continue;
        
        // Skip if this operation is for a different view
        if (operation.targetView && operation.targetView !== state.currentView) {
          continue;
        }
        
        switch (operation.type) {
          case 'focusBySlug':
            const slugToIdMapping = createSlugToIdMapping(operation.targetView as GraphViewType);
            const slugs = operation.payload?.slugs || (operation.payload ? [operation.payload] : []);
            
            const nodeIds = slugs
              .map((slug: string) => slugToIdMapping.get(slug))
              .filter((id: string | undefined): id is string => id !== undefined);
            
            if (nodeIds.length === 0) {
              console.warn(`[GraphProvider ${currentInstanceType}] Queued slugs not found:`, slugs);
              return;
            }

            if (nodeIds.length === 1) {
              console.log(`[GraphProvider ${currentInstanceType}] Processing queued focusBySlug:`, slugs[0], '->', nodeIds[0]);
              instanceActions.zoomToNode(
                nodeIds[0],
                operation.options?.duration,
                operation.options?.padding
              );
            } else {
              console.log(`[GraphProvider ${currentInstanceType}] Processing queued multi-slug focus:`, slugs, '->', nodeIds);
              // For multiple nodes, we need to handle this differently
              // This will be processed by the main focusNodes case when the queue is executed
              // For now, we'll just log it and let it be handled by the main logic
              console.log(`[GraphProvider ${currentInstanceType}] Multi-slug focus queued for:`, nodeIds);
            }
            break;
            
          case 'focusNode':
            console.log(`[GraphProvider ${currentInstanceType}] Processing queued focusNode:`, operation.payload);
            instanceActions.zoomToNode(
              operation.payload,
              operation.options?.duration,
              operation.options?.padding
            );
            break;
            
          case 'focusNodes':
            console.log(`[GraphProvider ${currentInstanceType}] Processing queued focusNodes:`, operation.payload);
            const queuedNodeIds = operation.payload;
            if (queuedNodeIds && Array.isArray(queuedNodeIds) && queuedNodeIds.length > 0) {
                const currentGraphData = state.currentView === 'post_view' ? graphData.data.postGraph : graphData.data.tagGraph;
                if (!currentGraphData || !currentGraphData.nodes) {
                  console.warn(`[GraphProvider ${currentInstanceType}] No graph data available for queued multi-node focus`);
                  return;
                }

                const targetNodes = currentGraphData.nodes.filter((node: any) => queuedNodeIds.includes(node.id));

                if (targetNodes.length === 0) {
                  console.warn(`[GraphProvider ${currentInstanceType}] No matching nodes found for queued node IDs:`, queuedNodeIds);
                  return;
                }

                if (targetNodes.length === 1) {
                  instanceActions.zoomToNode(
                    targetNodes[0].id,
                    operation.options?.duration,
                    operation.options?.padding
                  );
                } else {
                  const xCoords = targetNodes.map((node: any) => node.x);
                  const yCoords = targetNodes.map((node: any) => node.y);
                  const minX = Math.min(...xCoords);
                  const maxX = Math.max(...xCoords);
                  const minY = Math.min(...yCoords);
                  const maxY = Math.max(...yCoords);

                  const centerX = (minX + maxX) / 2;
                  const centerY = (minY + maxY) / 2;

                  const graphInstance = instance.graphRef.current;
                  if (!graphInstance) {
                    console.warn(`[GraphProvider ${currentInstanceType}] Graph instance not available for queued focus`);
                    return;
                  }

                  const { width: canvasWidth, height: canvasHeight } = getCanvasDimensions(graphInstance, state.currentView);
                  const padding = operation.options?.padding || GRAPH_CONFIG.zoom.DEFAULT_PADDING;
                  
                  console.log('[GraphProvider] Calculating zoom for queued focus:', {
                    canvasWidth,
                    canvasHeight,
                    bounds: { minX, maxX, minY, maxY },
                    padding
                  });
                  
                  const zoomLevel = calculateZoomLevel(
                    { minX, maxX, minY, maxY },
                    canvasWidth,
                    canvasHeight,
                    padding
                  );

                  if (typeof graphInstance.centerAt === 'function' && typeof graphInstance.zoom === 'function') {
                    const duration = operation.options?.duration || 400;
                    graphInstance.centerAt(centerX, centerY, duration);
                    graphInstance.zoom(zoomLevel, duration);
                  } else {
                    const nodeIdSet = new Set(queuedNodeIds);
                    graphInstance.zoomToFit(
                      operation.options?.duration,
                      operation.options?.padding,
                      (node: any) => nodeIdSet.has(node.id)
                    );
                  }
                }
            }
            break;
            
          case 'focusBySlugs':
            console.log(`[GraphProvider ${currentInstanceType}] Processing queued focusBySlugs:`, operation.payload);
            // focusBySlugs is handled by the main focusNodes case when queue is processed
            break;
        }
      }
    };
    
    const handleControlMessage = (message: any) => {
      console.log(`[GraphProvider ${currentInstanceType}] Received control message:`, message);
      
      if (message.instanceType === currentInstanceType) {
        switch (message.type) {
          
          case 'fitToHome':
            console.log(`[GraphProvider ${currentInstanceType}] Executing fitToHome`);
            instanceActions.zoomToFit(
              message.payload?.options?.duration,
              message.payload?.options?.padding
            );
            break;
          case 'focusNode':
            if (graphData.isLoading) {
              console.log(`[GraphProvider ${currentInstanceType}] Queueing focusNode:`, message.payload?.nodeId);
              pendingFocusQueue.push({
                type: 'focusNode',
                payload: message.payload?.nodeId,
                options: message.payload?.options,
                targetView: state.currentView
              });
            } else {
              console.log(`[GraphProvider ${currentInstanceType}] Executing focusNode:`, message.payload?.nodeId);
              if (message.payload?.nodeId) {
                instanceActions.zoomToNode(
                  message.payload.nodeId,
                  message.payload?.options?.duration,
                  message.payload?.options?.padding
                );
              }
            }
            break;

          case 'focusNodes':
            if (graphData.isLoading) {
              console.log(`[GraphProvider ${currentInstanceType}] Queueing focusNodes:`, message.payload?.nodeIds);
              pendingFocusQueue.push({
                type: 'focusNodes',
                payload: message.payload?.nodeIds,
                options: message.payload?.options,
                targetView: state.currentView
              });
            } else {
              console.log(`[GraphProvider ${currentInstanceType}] Executing focusNodes:`, message.payload?.nodeIds);
              const nodeIds = message.payload?.nodeIds;
              if (nodeIds && Array.isArray(nodeIds) && nodeIds.length > 0) {
                const currentGraphData = state.currentView === 'post_view' ? graphData.data.postGraph : graphData.data.tagGraph;
                if (!currentGraphData || !currentGraphData.nodes) {
                  console.warn(`[GraphProvider ${currentInstanceType}] No graph data available for multi-node focus`);
                  return;
                }

                const targetNodes = currentGraphData.nodes.filter((node: any) => nodeIds.includes(node.id));

                if (targetNodes.length === 0) {
                  console.warn(`[GraphProvider ${currentInstanceType}] No matching nodes found for provided node IDs:`, nodeIds);
                  return;
                }

                if (targetNodes.length === 1) {
                  instanceActions.zoomToNode(
                    targetNodes[0].id,
                    message.payload?.options?.duration,
                    message.payload?.options?.padding
                  );
                } else {
                  const xCoords = targetNodes.map((node: any) => node.x);
                  const yCoords = targetNodes.map((node: any) => node.y);
                  const minX = Math.min(...xCoords);
                  const maxX = Math.max(...xCoords);
                  const minY = Math.min(...yCoords);
                  const maxY = Math.max(...yCoords);

                  const centerX = (minX + maxX) / 2;
                  const centerY = (minY + maxY) / 2;

                  const graphInstance = instance.graphRef.current;
                  if (!graphInstance) {
                    console.warn(`[GraphProvider ${currentInstanceType}] Graph instance not available`);
                    return;
                  }

                  const { width: canvasWidth, height: canvasHeight } = getCanvasDimensions(graphInstance, state.currentView);
                  const padding = message.payload?.options?.padding || GRAPH_CONFIG.zoom.DEFAULT_PADDING;
                  
                  const zoomLevel = calculateZoomLevel(
                    { minX, maxX, minY, maxY },
                    canvasWidth,
                    canvasHeight,
                    padding
                  );

                  if (typeof graphInstance.centerAt === 'function' && typeof graphInstance.zoom === 'function') {
                    const duration = message.payload?.options?.duration || 400;
                    graphInstance.centerAt(centerX, centerY, duration);
                    graphInstance.zoom(zoomLevel, duration);
                  } else {
                    const nodeIdSet = new Set(nodeIds);
                    graphInstance.zoomToFit(
                      message.payload?.options?.duration,
                      message.payload?.options?.padding,
                      (node: any) => nodeIdSet.has(node.id)
                    );
                  }
                }
                
                if (message.payload?.continuous) {
                  setContinuousFocusDebug({
                    type: 'nodes',
                    target: nodeIds,
                    options: message.payload.options
                  });
                }
              }
            }
            break;
            
          case 'focusBySlug':
            if (graphData.isLoading) {
              const slugs = message.payload?.slugs || (message.payload?.slug ? [message.payload.slug] : []);
              console.log(`[GraphProvider ${currentInstanceType}] Queueing focusBySlug:`, slugs);
              pendingFocusQueue.push({
                type: 'focusBySlug',
                payload: { slugs, options: message.payload?.options },
                options: message.payload?.options,
                targetView: state.currentView
              });
            } else {
              console.log(`[GraphProvider ${currentInstanceType}] Executing focusBySlug:`, message.payload?.slug || message.payload?.slugs);
              
              // Handle both single slug (string) and multiple slugs (array)
              const slugs = message.payload?.slugs || (message.payload?.slug ? [message.payload.slug] : []);
              
              if (slugs && slugs.length > 0) {
                const slugToIdMapping = createSlugToIdMapping();
                const nodeIds = slugs
                  .map((slug: string) => slugToIdMapping.get(slug))
                  .filter((id: string | undefined): id is string => id !== undefined);
                
                if (nodeIds.length === 0) {
                  console.warn(`[GraphProvider ${currentInstanceType}] No nodes found for slugs:`, slugs);
                  console.log(`[GraphProvider ${currentInstanceType}] Available slugs:`, Array.from(slugToIdMapping.keys()));
                  return;
                }

                if (nodeIds.length === 1) {
                  // Single node: use zoomToNode
                  console.log(`[GraphProvider ${currentInstanceType}] Found node ID for slug:`, slugs[0], '->', nodeIds[0]);
                  instanceActions.zoomToNode(
                    nodeIds[0],
                    message.payload?.options?.duration,
                    message.payload?.options?.padding
                  );
                } else {
                  // Multiple nodes: use multi-node zooming
                  console.log(`[GraphProvider ${currentInstanceType}] Found node IDs for slugs:`, slugs, '->', nodeIds);
                  
                  const currentGraphData = state.currentView === 'post_view' ? graphData.data.postGraph : graphData.data.tagGraph;
                  if (!currentGraphData || !currentGraphData.nodes) {
                    console.warn(`[GraphProvider ${currentInstanceType}] No graph data available for multi-slug focus`);
                    return;
                  }

                  // Find the actual nodes from the provided node IDs
                  const targetNodes = currentGraphData.nodes.filter((node: any) => 
                    nodeIds.includes(node.id)
                  );

                  if (targetNodes.length === 0) {
                    console.warn(`[GraphProvider ${currentInstanceType}] No matching nodes found for provided node IDs:`, nodeIds);
                    return;
                  }

                  // Multiple nodes: calculate bounding box
                  const xCoords = targetNodes.map((node: any) => node.x);
                  const yCoords = targetNodes.map((node: any) => node.y);
                  
                  const minX = Math.min(...xCoords);
                  const maxX = Math.max(...xCoords);
                  const minY = Math.min(...yCoords);
                  const maxY = Math.max(...yCoords);

                  // Calculate center and dimensions
                  const centerX = (minX + maxX) / 2;
                  const centerY = (minY + maxY) / 2;

                  const graphInstance = instance.graphRef.current;
                  if (!graphInstance) {
                    console.warn(`[GraphProvider ${currentInstanceType}] Graph instance not available`);
                    return;
                  }

                  const { width: canvasWidth, height: canvasHeight } = getCanvasDimensions(graphInstance, state.currentView);
                  const padding = message.payload?.options?.padding || GRAPH_CONFIG.zoom.DEFAULT_PADDING;
                  
                  const zoomLevel = calculateZoomLevel(
                    { minX, maxX, minY, maxY },
                    canvasWidth,
                    canvasHeight,
                    padding
                  );

                  // Apply the calculated zoom and center
                  if (typeof graphInstance.centerAt === 'function' && typeof graphInstance.zoom === 'function') {
                    const duration = message.payload?.options?.duration || 400;
                    graphInstance.centerAt(centerX, centerY, duration);
                    graphInstance.zoom(zoomLevel, duration);
                  } else {
                    // Fallback to zoomToFit with filter
                    const nodeIdSet = new Set(nodeIds);
                    graphInstance.zoomToFit(
                      message.payload?.options?.duration,
                      message.payload?.options?.padding,
                      (node: any) => nodeIdSet.has(node.id)
                    );
                  }
                
                // Handle continuous focusing
                if (message.payload?.continuous) {
                  setContinuousFocusDebug({
                    type: 'nodes',
                    target: message.payload.nodeIds,
                    options: message.payload.options
                  });
                }
              }
            }
          }
          break;
            
          case 'focusBySlugs':
            if (graphData.isLoading) {
              console.log(`[GraphProvider ${currentInstanceType}] Queueing focusBySlugs:`, message.payload?.slugs);
              pendingFocusQueue.push({
                type: 'focusBySlugs',
                payload: message.payload?.slugs,
                options: message.payload?.options,
                targetView: state.currentView
              });
            } else {
              console.log(`[GraphProvider ${currentInstanceType}] Executing focusBySlugs:`, message.payload?.slugs);
              if (message.payload?.slugs && Array.isArray(message.payload.slugs)) {
                const slugToIdMapping = createSlugToIdMapping();
                const nodeIds = message.payload.slugs
                  .map((slug: string) => slugToIdMapping.get(slug))
                  .filter((id: string | undefined): id is string => id !== undefined);
                
                if (nodeIds.length > 0) {
                  console.log(`[GraphProvider ${currentInstanceType}] Found node IDs for slugs:`, message.payload.slugs, '->', nodeIds);
                  
                  const currentGraphData = state.currentView === 'post_view' ? graphData.data.postGraph : graphData.data.tagGraph;
                  if (!currentGraphData || !currentGraphData.nodes) {
                    console.warn(`[GraphProvider ${currentInstanceType}] No graph data available for multi-slug focus`);
                    return;
                  }

                  // Find the actual nodes from the provided node IDs
                  const targetNodes = currentGraphData.nodes.filter((node: any) => 
                    nodeIds.includes(node.id)
                  );

                  if (targetNodes.length === 0) {
                    console.warn(`[GraphProvider ${currentInstanceType}] No matching nodes found for provided node IDs:`, nodeIds);
                    return;
                  }

                  if (targetNodes.length === 1) {
                    // Single node: use zoomToNode
                    instanceActions.zoomToNode(
                      targetNodes[0].id,
                      message.payload?.options?.duration,
                      message.payload?.options?.padding
                    );
                  } else {
                    // Multiple nodes: calculate bounding box
                    const xCoords = targetNodes.map((node: any) => node.x);
                    const yCoords = targetNodes.map((node: any) => node.y);
                    
                    const minX = Math.min(...xCoords);
                    const maxX = Math.max(...xCoords);
                    const minY = Math.min(...yCoords);
                    const maxY = Math.max(...yCoords);

                    // Calculate center and dimensions
                    const centerX = (minX + maxX) / 2;
                    const centerY = (minY + maxY) / 2;

                    const graphInstance = instance.graphRef.current;
                    if (!graphInstance) {
                      console.warn(`[GraphProvider ${currentInstanceType}] Graph instance not available`);
                      return;
                    }

                    const { width: canvasWidth, height: canvasHeight } = getCanvasDimensions(graphInstance, state.currentView);
                    const padding = message.payload?.options?.padding || GRAPH_CONFIG.zoom.DEFAULT_PADDING;
                    
                    const zoomLevel = calculateZoomLevel(
                      { minX, maxX, minY, maxY },
                      canvasWidth,
                      canvasHeight,
                      padding
                    );

                    // Apply the calculated zoom and center
                    if (typeof graphInstance.centerAt === 'function' && typeof graphInstance.zoom === 'function') {
                      const duration = message.payload?.options?.duration || 400;
                      graphInstance.centerAt(centerX, centerY, duration);
                      graphInstance.zoom(zoomLevel, duration);
                    } else {
                      // Fallback to zoomToFit with filter
                      const nodeIdSet = new Set(nodeIds);
                      graphInstance.zoomToFit(
                        message.payload?.options?.duration,
                        message.payload?.options?.padding,
                        (node: any) => nodeIdSet.has(node.id)
                      );
                    }
                  }
                  
                  // Handle continuous focusing
                  if (message.payload?.continuous) {
                    setContinuousFocusDebug({
                      type: 'slugs',
                      target: message.payload.slugs,
                      options: message.payload.options
                    });
                  }
                } else {
                  console.warn(`[GraphProvider ${currentInstanceType}] No nodes found for slugs:`, message.payload.slugs);
                }
              }
            }
            break;

          case 'highlightNodes':
            console.log(`[GraphProvider ${currentInstanceType}] Executing highlightNodes:`, message.payload);
            if (message.payload?.type === 'slug') {
              stateActions.setHighlightSlugs(message.payload.values || []);
            } else if (message.payload?.type === 'tag') {
              stateActions.setHighlightTags(message.payload.values || []);
            }
            break;

          case 'clearHighlight':
            console.log(`[GraphProvider ${currentInstanceType}] Executing clearHighlight`);
            stateActions.clearHighlight();
            break;
            
          case 'changeView':
            console.log(`[GraphProvider ${currentInstanceType}] Executing changeView:`, message.payload?.view);
            if (message.payload?.view) {
              stateActions.setCurrentView(message.payload.view);
              // Don't clear pending operations - let them process with new view
            }
            break;
        }
      }
    };

    // Process pending operations when data is loaded
    processPendingFocus();
    
    graphControl.addListener(currentInstanceType, handleControlMessage);
    
    return () => {
      graphControl.removeListener(currentInstanceType, handleControlMessage);
    };
  }, [instanceActions, stateActions, graphData.data.postGraph, graphData.isLoading, state.currentView]);

  // Process initial focus when graph is ready
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    
    const checkReadiness = () => {
      // Check if graph is ready - need both data and instance
      const hasPostData = graphData.data.postGraph && graphData.data.postGraph.nodes.length > 0;
      const hasTagData = graphData.data.tagGraph && graphData.data.tagGraph.nodes.length > 0;
      const hasGraphInstance = instance.graphRef.current !== null;
      const graphReady = !graphData.isLoading && hasGraphInstance &&
        ((state.currentView === 'post_view' && hasPostData) || 
         (state.currentView === 'tag_view' && hasTagData));
      
      console.log(`[GraphProvider ${instanceType}] Graph readiness check:`, {
        isLoading: graphData.isLoading,
        hasPostData,
        hasTagData,
        hasGraphInstance,
        currentView: state.currentView,
        graphReady
      });
      
      if (graphReady) {
        console.log(`[GraphProvider ${instanceType}] Graph is ready, processing initial focus...`);
        // Add a small delay to ensure graph is fully initialized
        timeoutId = setTimeout(() => {
          graphControl.processInitialFocusWhenReady(instanceType, true);
        }, 100);
      }
    };
    
    checkReadiness();
    
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [graphData.isLoading, graphData.data.postGraph, graphData.data.tagGraph, state.currentView, instanceType, instance.graphRef.current]);

  // Handle continuous focusing retry
  useEffect(() => {
    if (continuousFocus && !graphData.isLoading) {
      let retryCount = 0;
      const maxRetries = GRAPH_CONFIG.performance.focusTry;
      const retryInterval = GRAPH_CONFIG.performance.focusFrequency;
      
      console.log(`[GraphProvider] Starting continuous focus with maxRetries=${maxRetries}, interval=${retryInterval}ms`);
      console.log(`[GraphProvider] Continuous focus target:`, continuousFocus);
      
      // Store current values in refs to prevent stale closures
      const currentContinuousFocus = continuousFocus;
      const currentInstanceActions = instanceActions;
      const currentCreateSlugToIdMapping = createSlugToIdMapping;
      
      const startTime = Date.now();
      
      const intervalId = setInterval(() => {
        try {
          retryCount++;
          const elapsed = Date.now() - startTime;
          console.log(`[GraphProvider] Attempt ${retryCount}/${maxRetries} (${elapsed}ms elapsed):`, currentContinuousFocus);
          
          let nodeId: string | undefined;
          
          if (currentContinuousFocus.type === 'slug') {
            const slugToIdMapping = currentCreateSlugToIdMapping();
            nodeId = slugToIdMapping.get(currentContinuousFocus.target);
            console.log(`[GraphProvider] Slug mapping for ${currentContinuousFocus.target}:`, nodeId);
          } else if (currentContinuousFocus.type === 'node') {
            nodeId = currentContinuousFocus.target;
          }
          
          if (nodeId) {
            console.log(`[GraphProvider] Found node ${nodeId}, attempting zoom...`);
            currentInstanceActions.zoomToNode(nodeId, currentContinuousFocus.options?.duration, currentContinuousFocus.options?.padding);
          } else {
            console.log(`[GraphProvider] Node not found, will retry...`);
          }
          
          // Continue retrying until max retries reached
          if (retryCount >= maxRetries) {
            const totalElapsed = Date.now() - startTime;
            console.log(`[GraphProvider] Max retries (${maxRetries}) reached after ${totalElapsed}ms, stopping continuous focus`);
            setContinuousFocusDebug(null);
            clearInterval(intervalId);
          }
        } catch (error) {
          console.warn(`[GraphProvider] Error in continuous focus:`, error);
          setContinuousFocusDebug(null);
          clearInterval(intervalId);
        }
      }, retryInterval);

      return () => {
        const totalElapsed = Date.now() - startTime;
        console.log(`[GraphProvider] Cleaning up continuous focus interval after ${retryCount} attempts (${totalElapsed}ms elapsed)`);
        clearInterval(intervalId);
      };
    }
  }, [continuousFocus, graphData.isLoading]); // Only depend on the trigger conditions

  const contextValue: GraphContextValue = {
    state,
    actions: {
      ...stateActions,
      ...instanceActions,
      saveCurrentZoom,
      applyCurrentZoom,
    },
    data: {
      siteMap: siteMap!,
      postGraphData: graphData.data.postGraph,
      tagGraphData: graphData.data.tagGraph,
    },
    instance,
  };

  return (
    <GraphContext.Provider value={contextValue}>
      {children}
    </GraphContext.Provider>
  );
};

export const useGraphContext = () => {
  const context = useContext(GraphContext);
  if (!context) {
    throw new Error('useGraphContext must be used within a GraphProvider');
  }
  return context;
};