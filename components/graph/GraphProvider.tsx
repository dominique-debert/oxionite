import React, { createContext, useContext, ReactNode, useCallback, useEffect, useState } from 'react';
import type { GraphContextValue, GraphViewType } from './types/graph.types';
import { useGraphState } from './hooks/useGraphState';
import { useGraphData } from './hooks/useGraphData';
import { useGraphInstance } from './hooks/useGraphInstance';
import localeConfig from '../../site.locale.json';
import type { SiteMap } from '@/lib/context/types';
import { graphControl } from './utils/graph-control';
import { GRAPH_CONFIG } from './utils/graphConfig';

const GraphContext = createContext<GraphContextValue | undefined>(undefined);

export interface GraphProviderProps {
  children: ReactNode;
  siteMap?: SiteMap;
  locale?: string;
}

export const GraphProvider: React.FC<GraphProviderProps> = ({ 
  children, 
  siteMap, 
  locale = localeConfig.defaultLocale 
}) => {
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
    // Determine instance type based on context usage
    // This should be enhanced to detect actual instance type from props
    const instanceType = 'sidenav';
    
    // Queue for pending focus operations
    let pendingFocusQueue: Array<{
      type: 'focusBySlug' | 'focusNode' | 'focusNodes' | 'focusBySlugs';
      payload: any;
      options?: any;
      targetView?: GraphViewType;
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
            const slugToIdMapping = createSlugToIdMapping(operation.targetView);
            const slugs = operation.payload?.slugs || (operation.payload ? [operation.payload] : []);
            
            const nodeIds = slugs
              .map((slug: string) => slugToIdMapping.get(slug))
              .filter((id: string | undefined): id is string => id !== undefined);
            
            if (nodeIds.length === 0) {
              console.warn(`[GraphProvider ${instanceType}] Queued slugs not found:`, slugs);
              return;
            }

            if (nodeIds.length === 1) {
              console.log(`[GraphProvider ${instanceType}] Processing queued focusBySlug:`, slugs[0], '->', nodeIds[0]);
              instanceActions.zoomToNode(
                nodeIds[0],
                operation.options?.duration,
                operation.options?.padding
              );
            } else {
              console.log(`[GraphProvider ${instanceType}] Processing queued multi-slug focus:`, slugs, '->', nodeIds);
              // For multiple nodes, we need to handle this differently
              // This will be processed by the main focusNodes case when the queue is executed
              // For now, we'll just log it and let it be handled by the main logic
              console.log(`[GraphProvider ${instanceType}] Multi-slug focus queued for:`, nodeIds);
            }
            break;
            
          case 'focusNode':
            console.log(`[GraphProvider ${instanceType}] Processing queued focusNode:`, operation.payload);
            instanceActions.zoomToNode(
              operation.payload,
              operation.options?.duration,
              operation.options?.padding
            );
            break;
            
          case 'focusNodes':
            console.log(`[GraphProvider ${instanceType}] Processing queued focusNodes:`, operation.payload);
            // Multi-node zooming is handled directly in the focusNodes case
            // No action needed here as it will be processed when the queue is executed
            break;
            
          case 'focusBySlugs':
            console.log(`[GraphProvider ${instanceType}] Processing queued focusBySlugs:`, operation.payload);
            // focusBySlugs is handled by the main focusNodes case when queue is processed
            break;
        }
      }
    };
    
    const handleControlMessage = (message: any) => {
      console.log(`[GraphProvider ${instanceType}] Received control message:`, message);
      
      if (message.instanceType === instanceType) {
        switch (message.type) {
          
          case 'fitToHome':
            console.log(`[GraphProvider ${instanceType}] Executing fitToHome`);
            instanceActions.zoomToFit(
              message.payload?.options?.duration,
              message.payload?.options?.padding
            );
            break;
          case 'focusNode':
            if (graphData.isLoading) {
              console.log(`[GraphProvider ${instanceType}] Queueing focusNode:`, message.payload?.nodeId);
              pendingFocusQueue.push({
                type: 'focusNode',
                payload: message.payload?.nodeId,
                options: message.payload?.options,
                targetView: state.currentView
              });
            } else {
              console.log(`[GraphProvider ${instanceType}] Executing focusNode:`, message.payload?.nodeId);
              if (message.payload?.nodeId) {
                instanceActions.zoomToNode(
                  message.payload.nodeId,
                  message.payload?.options?.duration,
                  message.payload?.options?.padding
                );
              }
            }
            break;
            
          case 'focusBySlug':
            if (graphData.isLoading) {
              const slugs = message.payload?.slugs || (message.payload?.slug ? [message.payload.slug] : []);
              console.log(`[GraphProvider ${instanceType}] Queueing focusBySlug:`, slugs);
              pendingFocusQueue.push({
                type: 'focusBySlug',
                payload: { slugs, options: message.payload?.options },
                options: message.payload?.options,
                targetView: state.currentView
              });
            } else {
              console.log(`[GraphProvider ${instanceType}] Executing focusBySlug:`, message.payload?.slug || message.payload?.slugs);
              
              // Handle both single slug (string) and multiple slugs (array)
              const slugs = message.payload?.slugs || (message.payload?.slug ? [message.payload.slug] : []);
              
              if (slugs && slugs.length > 0) {
                const slugToIdMapping = createSlugToIdMapping();
                const nodeIds = slugs
                  .map((slug: string) => slugToIdMapping.get(slug))
                  .filter((id: string | undefined): id is string => id !== undefined);
                
                if (nodeIds.length === 0) {
                  console.warn(`[GraphProvider ${instanceType}] No nodes found for slugs:`, slugs);
                  console.log(`[GraphProvider ${instanceType}] Available slugs:`, Array.from(slugToIdMapping.keys()));
                  return;
                }

                if (nodeIds.length === 1) {
                  // Single node: use zoomToNode
                  console.log(`[GraphProvider ${instanceType}] Found node ID for slug:`, slugs[0], '->', nodeIds[0]);
                  instanceActions.zoomToNode(
                    nodeIds[0],
                    message.payload?.options?.duration,
                    message.payload?.options?.padding
                  );
                } else {
                  // Multiple nodes: use multi-node zooming
                  console.log(`[GraphProvider ${instanceType}] Found node IDs for slugs:`, slugs, '->', nodeIds);
                  
                  const currentGraphData = state.currentView === 'post_view' ? graphData.data.postGraph : graphData.data.tagGraph;
                  if (!currentGraphData || !currentGraphData.nodes) {
                    console.warn(`[GraphProvider ${instanceType}] No graph data available for multi-slug focus`);
                    return;
                  }

                  // Find the actual nodes from the provided node IDs
                  const targetNodes = currentGraphData.nodes.filter((node: any) => 
                    nodeIds.includes(node.id)
                  );

                  if (targetNodes.length === 0) {
                    console.warn(`[GraphProvider ${instanceType}] No matching nodes found for provided node IDs:`, nodeIds);
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
                  const width = maxX - minX;
                  const height = maxY - minY;

                  // Calculate appropriate zoom level based on the bounding box
                  const graphInstance = instance.graphRef.current;
                  if (!graphInstance) {
                    console.warn(`[GraphProvider ${instanceType}] Graph instance not available`);
                    return;
                  }

                  const canvasWidth = graphInstance.width?.() || 800;
                  const canvasHeight = graphInstance.height?.() || 600;
                  
                  const padding = message.payload?.options?.padding || 50;
                  const effectiveWidth = width + (padding * 2);
                  const effectiveHeight = height + (padding * 2);
                  
                  const zoomX = canvasWidth / effectiveWidth;
                  const zoomY = canvasHeight / effectiveHeight;
                  const zoomLevel = Math.min(zoomX, zoomY, 3); // Cap zoom at 3x

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
                if (message.payload?.continuous && slugs.length === 1) {
                  setContinuousFocusDebug({
                    type: 'slug',
                    target: slugs[0],
                    options: message.payload.options
                  });
                }
              }
            }
            break;
          case 'focusNodes':
            if (graphData.isLoading) {
              console.log(`[GraphProvider ${instanceType}] Queueing focusNodes:`, message.payload?.nodeIds);
              pendingFocusQueue.push({
                type: 'focusNodes',
                payload: message.payload?.nodeIds,
                options: message.payload?.options,
                targetView: state.currentView
              });
            } else {
              console.log(`[GraphProvider ${instanceType}] Executing focusNodes:`, message.payload?.nodeIds);
              if (message.payload?.nodeIds && Array.isArray(message.payload.nodeIds)) {
                const currentGraphData = state.currentView === 'post_view' ? graphData.data.postGraph : graphData.data.tagGraph;
                
                if (!currentGraphData || !currentGraphData.nodes) {
                  console.warn(`[GraphProvider ${instanceType}] No graph data available for focusNodes`);
                  return;
                }

                // Find the actual nodes from the provided node IDs
                const targetNodes = currentGraphData.nodes.filter((node: any) => 
                  message.payload.nodeIds.includes(node.id)
                );

                if (targetNodes.length === 0) {
                  console.warn(`[GraphProvider ${instanceType}] No matching nodes found for provided node IDs:`, message.payload.nodeIds);
                  return;
                }

                if (targetNodes.length === 1) {
                  // Single node: use existing zoomToNode behavior
                  instanceActions.zoomToNode(
                    targetNodes[0].id,
                    message.payload?.options?.duration,
                    message.payload?.options?.padding
                  );
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
                const width = maxX - minX;
                const height = maxY - minY;

                // Calculate appropriate zoom level based on the bounding box
                const graphInstance = instance.graphRef.current;
                if (!graphInstance) {
                  console.warn(`[GraphProvider ${instanceType}] Graph instance not available`);
                  return;
                }

                const canvasWidth = graphInstance.width?.() || 800;
                const canvasHeight = graphInstance.height?.() || 600;
                
                const padding = message.payload?.options?.padding || 50;
                const effectiveWidth = width + (padding * 2);
                const effectiveHeight = height + (padding * 2);
                
                const zoomX = canvasWidth / effectiveWidth;
                const zoomY = canvasHeight / effectiveHeight;
                const zoomLevel = Math.min(zoomX, zoomY, 3); // Cap zoom at 3x

                // Apply the calculated zoom and center
                if (typeof graphInstance.centerAt === 'function' && typeof graphInstance.zoom === 'function') {
                  const duration = message.payload?.options?.duration || 400;
                  graphInstance.centerAt(centerX, centerY, duration);
                  graphInstance.zoom(zoomLevel, duration);
                } else {
                  // Fallback to zoomToFit with filter
                  const nodeIdSet = new Set(message.payload.nodeIds);
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
            break;
            
          case 'focusBySlugs':
            if (graphData.isLoading) {
              console.log(`[GraphProvider ${instanceType}] Queueing focusBySlugs:`, message.payload?.slugs);
              pendingFocusQueue.push({
                type: 'focusBySlugs',
                payload: message.payload?.slugs,
                options: message.payload?.options,
                targetView: state.currentView
              });
            } else {
              console.log(`[GraphProvider ${instanceType}] Executing focusBySlugs:`, message.payload?.slugs);
              if (message.payload?.slugs && Array.isArray(message.payload.slugs)) {
                const slugToIdMapping = createSlugToIdMapping();
                const nodeIds = message.payload.slugs
                  .map((slug: string) => slugToIdMapping.get(slug))
                  .filter((id: string | undefined): id is string => id !== undefined);
                
                if (nodeIds.length > 0) {
                  console.log(`[GraphProvider ${instanceType}] Found node IDs for slugs:`, message.payload.slugs, '->', nodeIds);
                  // Multi-node zooming is handled directly in the focusNodes case above
                  
                  // Handle continuous focusing
                  if (message.payload?.continuous) {
                    setContinuousFocusDebug({
                      type: 'slugs',
                      target: message.payload.slugs,
                      options: message.payload.options
                    });
                  }
                } else {
                  console.warn(`[GraphProvider ${instanceType}] No nodes found for slugs:`, message.payload.slugs);
                }
              }
            }
            break;
            
          case 'changeView':
            console.log(`[GraphProvider ${instanceType}] Executing changeView:`, message.payload?.view);
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
    
    graphControl.addListener(instanceType, handleControlMessage);
    
    return () => {
      graphControl.removeListener(instanceType, handleControlMessage);
    };
  }, [instanceActions, stateActions, graphData.data.postGraph, graphData.isLoading, state.currentView]);

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