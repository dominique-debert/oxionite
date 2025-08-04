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
      type: 'focusBySlug' | 'focusNode';
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
            const nodeId = slugToIdMapping.get(operation.payload);
            
            if (nodeId) {
              console.log(`[GraphProvider ${instanceType}] Processing queued focusBySlug:`, operation.payload, '->', nodeId);
              instanceActions.zoomToNode(
                nodeId,
                operation.options?.duration,
                operation.options?.padding
              );
            } else {
              console.warn(`[GraphProvider ${instanceType}] Queued slug not found:`, operation.payload);
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
                
                // Handle continuous focusing
                if (message.payload?.continuous) {
                  setContinuousFocusDebug({
                    type: 'node',
                    target: message.payload.nodeId,
                    options: message.payload.options
                  });
                }
              }
            }
            break;
          case 'focusBySlug':
            if (graphData.isLoading) {
              console.log(`[GraphProvider ${instanceType}] Queueing focusBySlug:`, message.payload?.slug);
              pendingFocusQueue.push({
                type: 'focusBySlug',
                payload: message.payload?.slug,
                options: message.payload?.options,
                targetView: state.currentView
              });
            } else {
              console.log(`[GraphProvider ${instanceType}] Executing focusBySlug:`, message.payload?.slug);
              if (message.payload?.slug) {
                const slugToIdMapping = createSlugToIdMapping();
                const nodeId = slugToIdMapping.get(message.payload.slug);
                
                if (nodeId) {
                  console.log(`[GraphProvider ${instanceType}] Found node ID for slug:`, message.payload.slug, '->', nodeId);
                  instanceActions.zoomToNode(
                    nodeId,
                    message.payload?.options?.duration,
                    message.payload?.options?.padding
                  );
                  
                  // Handle continuous focusing
                  if (message.payload?.continuous) {
                    setContinuousFocusDebug({
                      type: 'slug',
                      target: message.payload.slug,
                      options: message.payload.options
                    });
                  }
                } else {
                  console.warn(`[GraphProvider ${instanceType}] No node found for slug:`, message.payload.slug);
                  console.log(`[GraphProvider ${instanceType}] Available slugs:`, Array.from(slugToIdMapping.keys()));
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