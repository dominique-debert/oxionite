import React from 'react';

export interface PageRoute {
  pageId: string;
  title: string;
  parentId?: string;
}

export interface PageRouteContextType {
  // Current route path from root to current page
  routePath: PageRoute[];
  // Current root slug (the post/home page with PageInfo)
  rootSlug: string;
  // Add a page to the route
  addToRoute: (pageId: string, title: string, parentId?: string) => void;
  // Get full URL path for a page
  getFullPath: (pageId: string) => string;
  // Clear route and start fresh
  clearRoute: () => void;
  // Set root route
  setRootRoute: (slug: string, pageId: string, title: string) => void;
}

const PageRouteContext = React.createContext<PageRouteContextType | undefined>(undefined);

export const usePageRoute = () => {
  const context = React.useContext(PageRouteContext);
  if (!context) {
    throw new Error('usePageRoute must be used within PageRouteProvider');
  }
  return context;
};

interface PageRouteProviderProps {
  children: React.ReactNode;
}

export const PageRouteProvider: React.FC<PageRouteProviderProps> = ({ children }) => {
  const [routePath, setRoutePath] = React.useState<PageRoute[]>([]);
  const [rootSlug, setRootSlug] = React.useState<string>('');

  const addToRoute = React.useCallback((pageId: string, title: string, parentId?: string) => {
    setRoutePath(prev => {
      // Find if this page already exists in the route
      const existingIndex = prev.findIndex(p => p.pageId === pageId);
      if (existingIndex !== -1) {
        // Truncate to this page (remove children)
        return prev.slice(0, existingIndex + 1);
      }
      
      // Find parent in existing route
      const parentIndex = prev.findIndex(p => p.pageId === parentId);
      if (parentIndex !== -1) {
        // Add as child of found parent
        return [...prev.slice(0, parentIndex + 1), { pageId, title, parentId }];
      }
      
      // If no parent found, add to end
      return [...prev, { pageId, title, parentId }];
    });
  }, []);

  const getFullPath = React.useCallback((targetPageId: string): string => {
    if (!routePath || routePath.length === 0) return '';
    
    const targetPage = routePath.find(p => p.pageId === targetPageId);
    if (!targetPage) return '';
    
    // Build path from root to target
    const pathParts: string[] = [];
    
    // Add root slug
    pathParts.push(rootSlug);
    
    // Add all pages in route path
    routePath.forEach((part) => {
      if (part.pageId === targetPageId) {
        const safeTitle = part.title.replace(/[^a-zA-Z0-9가-힣\s]/g, '').replace(/\s+/g, '-').toLowerCase();
        pathParts.push(`${safeTitle}-${part.pageId}`);
      }
    });
    
    return `/post/${pathParts.join('/')}`;
  }, [routePath, rootSlug]);

  const clearRoute = React.useCallback(() => {
    setRoutePath([]);
    setRootSlug('');
  }, []);

  const setRootRoute = React.useCallback((slug: string, pageId: string, title: string) => {
    setRootSlug(slug);
    setRoutePath([{ pageId, title }]);
  }, []);

  const value: PageRouteContextType = {
    routePath,
    rootSlug,
    addToRoute,
    getFullPath,
    clearRoute,
    setRootRoute,
  };

  return React.createElement(PageRouteContext.Provider, { value }, children);
};
