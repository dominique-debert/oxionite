import React, { createContext, useContext, ReactNode, useCallback, useEffect } from 'react';
import type { GraphContextValue, GraphViewType } from './types/graph.types';
import { useGraphState } from './hooks/useGraphState';
import { useGraphData } from './hooks/useGraphData';
import { useGraphInstance } from './hooks/useGraphInstance';
import localeConfig from '../../site.locale.json';
import type { SiteMap } from '@/lib/context/types';
import { graphControl } from './utils/graph-control';

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
    
    // Create slug-to-id mapping based on specified view type
    const createSlugToIdMapping = (viewType?: GraphViewType): Map<string, string> => {
      const mapping = new Map<string, string>();
      const targetView = viewType || state.currentView;
      
      console.log(`[GraphProvider ${instanceType}] Creating slug mapping for view:`, targetView);
      
      if (targetView === 'post_view' && graphData.data.postGraph) {
        graphData.data.postGraph.nodes.forEach(node => {
          if (node.slug) {
            mapping.set(node.slug, node.id);
          }
        });
        console.log(`[GraphProvider ${instanceType}] Post view mapping:`, Array.from(mapping.keys()));
      } else if (targetView === 'tag_view' && graphData.data.tagGraph) {
        graphData.data.tagGraph.nodes.forEach(node => {
          if (node.slug) {
            mapping.set(node.slug, node.id);
          }
        });
        console.log(`[GraphProvider ${instanceType}] Tag view mapping:`, Array.from(mapping.keys()));
      }
      
      return mapping;
    };
    
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