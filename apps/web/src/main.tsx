import './styles.css';
import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createRouter, RouterProvider } from '@tanstack/react-router';
import { AppwriteException } from 'appwrite';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { realtime } from './lib/appwrite';
import { isSignedOutError, sessionHint } from './lib/session';
import { routeTree } from './routeTree.gen';

// When a request shows that the session ended (for example, the user signed
// out in another tab), clear everything and go back to the sign-in page.
// Route guards handle this themselves while the router is loading.
function onError(err: unknown) {
  if (!isSignedOutError(err) || router.state.isLoading) return;
  if (router.state.location.pathname === '/sign-in') return;
  sessionHint.clear();
  void realtime.disconnect();
  queryClient.clear();
  void router.navigate({ to: '/sign-in', search: { redirect: router.state.location.href } });
}

const queryClient = new QueryClient({
  queryCache: new QueryCache({ onError }),
  mutationCache: new MutationCache({ onError }),
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      retry: (count, err) =>
        count < 2 && !(err instanceof AppwriteException && err.code >= 400 && err.code < 500),
    },
  },
});

const router = createRouter({
  routeTree,
  context: { queryClient },
  defaultPreload: 'intent',
  defaultPreloadStaleTime: 0,
  defaultPendingMs: 300,
  defaultPendingMinMs: 300,
  scrollRestoration: true,
});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>,
);
