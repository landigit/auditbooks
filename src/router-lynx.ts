import { ref } from 'vue-lynx';

export interface Route {
  name: string;
  params?: Record<string, any>;
  fullPath: string;
}

const historyStack = ref<Route[]>([
  { name: 'DatabaseSelector', fullPath: '/DatabaseSelector' },
]);

export const currentRoute = ref<Route>({
  name: 'DatabaseSelector',
  fullPath: '/DatabaseSelector',
});

interface RoutePattern {
  path: string;
  name: string;
}

const routeDefinitions: RoutePattern[] = [
  { path: '/', name: 'Desk' },
  { path: '/get-started', name: 'GetStarted' },
  { path: '/edit/:schemaName/:name', name: 'CommonForm' },
  { path: '/list/:schemaName/:pageTitle?', name: 'ListView' },
  { path: '/print/:schemaName/:name', name: 'PrintView' },
  { path: '/report-print/:reportName', name: 'ReportPrintView' },
  { path: '/report/:reportClassName', name: 'Report' },
  { path: '/chart-of-accounts', name: 'Chart Of Accounts' },
  { path: '/import-wizard', name: 'Import Wizard' },
  { path: '/template-builder/:name', name: 'Template Builder' },
  { path: '/customize-form', name: 'Customize Form' },
  { path: '/settings', name: 'Settings' },
  { path: '/pos', name: 'Point of Sale' },
  { path: '/calendar', name: 'Calendar' },
  { path: '/help/:path*', name: 'Help' },
];

function matchPathPattern(
  pattern: string,
  path: string
): Record<string, any> | null {
  const patternSegments = pattern.split('/').filter(Boolean);
  const pathSegments = path.split('/').filter(Boolean);

  const params: Record<string, any> = {};

  if (patternSegments.length === 0 && pathSegments.length === 0) {
    return params;
  }

  let patIdx = 0;
  let pathIdx = 0;

  while (patIdx < patternSegments.length && pathIdx < pathSegments.length) {
    const patSeg = patternSegments[patIdx];
    const pathSeg = pathSegments[pathIdx];

    if (patSeg.startsWith(':')) {
      if (patSeg.endsWith('*')) {
        const paramName = patSeg.slice(1, -1);
        params[paramName] = pathSegments.slice(pathIdx).join('/');
        return params;
      } else if (patSeg.endsWith('?')) {
        const paramName = patSeg.slice(1, -1);
        params[paramName] = pathSeg;
        patIdx++;
        pathIdx++;
      } else {
        const paramName = patSeg.slice(1);
        params[paramName] = pathSeg;
        patIdx++;
        pathIdx++;
      }
    } else {
      if (patSeg !== pathSeg) {
        return null;
      }
      patIdx++;
      pathIdx++;
    }
  }

  while (patIdx < patternSegments.length) {
    const patSeg = patternSegments[patIdx];
    if (
      patSeg.startsWith(':') &&
      (patSeg.endsWith('?') || patSeg.endsWith('*'))
    ) {
      const paramName = patSeg.slice(1, -1);
      params[paramName] = '';
      patIdx++;
    } else {
      return null;
    }
  }

  if (pathIdx < pathSegments.length) {
    return null;
  }

  return params;
}

function resolvePath(name: string, params: Record<string, any>): string {
  const def = routeDefinitions.find((d) => d.name === name);
  if (!def) {
    return '/' + name;
  }

  const patternSegments = def.path.split('/');
  const resolvedSegments: string[] = [];
  const unusedParams = { ...params };

  for (const seg of patternSegments) {
    if (!seg) {
      resolvedSegments.push('');
      continue;
    }

    if (seg.startsWith(':')) {
      let isWildcard = false;
      let isOptional = false;
      let paramName = seg.slice(1);

      if (paramName.endsWith('*')) {
        isWildcard = true;
        paramName = paramName.slice(0, -1);
      } else if (paramName.endsWith('?')) {
        isOptional = true;
        paramName = paramName.slice(0, -1);
      }

      const val = unusedParams[paramName];
      delete unusedParams[paramName];

      if (val !== undefined && val !== null) {
        resolvedSegments.push(String(val));
      } else if (!isOptional && !isWildcard) {
        resolvedSegments.push('');
      }
    } else {
      resolvedSegments.push(seg);
    }
  }

  let path = resolvedSegments.join('/');
  if (path.endsWith('/')) {
    path = path.slice(0, -1);
  }
  if (!path) {
    path = '/';
  }

  const queryParts: string[] = [];
  for (const [key, val] of Object.entries(unusedParams)) {
    if (val !== undefined && val !== null) {
      queryParts.push(
        `${encodeURIComponent(key)}=${encodeURIComponent(String(val))}`
      );
    }
  }

  if (queryParts.length > 0) {
    path += '?' + queryParts.join('&');
  }

  return path;
}

function parsePath(path: string): Route {
  const [pathname, queryString] = path.split('?');
  const query: Record<string, any> = {};
  if (queryString) {
    const parts = queryString.split('&');
    for (const part of parts) {
      const [key, val] = part.split('=');
      if (key) {
        try {
          query[decodeURIComponent(key)] = decodeURIComponent(val || '');
        } catch {
          query[key] = val || '';
        }
      }
    }
  }

  for (const def of routeDefinitions) {
    const params = matchPathPattern(def.path, pathname);
    if (params !== null) {
      return {
        name: def.name,
        params: { ...params, ...query },
        fullPath: path,
      };
    }
  }

  // Fallback to primary segment name if no match
  const segments = pathname.split('/').filter(Boolean);
  const primary = segments[0] || 'Desk';
  return {
    name: primary,
    params: query,
    fullPath: path,
  };
}

function parseRoute(target: any): Route {
  if (typeof target === 'string') {
    return parsePath(target);
  }
  if (typeof target === 'object' && target !== null) {
    if (target.path) {
      let path = target.path;
      if (target.query) {
        const queryParams = new URLSearchParams(target.query).toString();
        if (queryParams) path += '?' + queryParams;
      }
      const parsed = parsePath(path);
      if (target.params) {
        parsed.params = { ...parsed.params, ...target.params };
      }
      return parsed;
    }
    if (target.name) {
      const params = target.params || target.query || {};
      const fullPath = resolvePath(target.name, params);
      return {
        name: target.name,
        params,
        fullPath,
      };
    }
    if (target.query) {
      const newParams = { ...currentRoute.value.params, ...target.query };
      const fullPath = resolvePath(currentRoute.value.name, newParams);
      return {
        name: currentRoute.value.name,
        params: newParams,
        fullPath,
      };
    }
  }
  return { name: 'Desk', fullPath: '/' };
}

export const router = {
  currentRoute,
  push(target: any) {
    const route = parseRoute(target);
    historyStack.value.push(route);
    currentRoute.value = route;
    console.log(`[Router] Navigated to: ${route.name}`, route.params);
  },
  back() {
    if (historyStack.value.length > 1) {
      historyStack.value.pop();
      const prevRoute = historyStack.value[historyStack.value.length - 1];
      currentRoute.value = prevRoute;
      console.log(`[Router] Back to: ${prevRoute.name}`);
    }
  },
  replace(target: any) {
    const route = parseRoute(target);
    historyStack.value[historyStack.value.length - 1] = route;
    currentRoute.value = route;
    console.log(`[Router] Replaced with: ${route.name}`, route.params);
  },
};

export default router;
