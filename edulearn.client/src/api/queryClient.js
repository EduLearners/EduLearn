// queryClient.js
// React Query client — shared singleton used across all useQuery/useMutation hooks.
// Configured with sensible defaults for an LMS:
//   - staleTime 60s: data stays fresh for 1 minute without refetching
//   - retry 1:      only retry failed requests once (avoids hammering a down API)
//   - refetchOnWindowFocus false: don't blast the API every tab switch

import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime:            60 * 1000,
            retry:                1,
            refetchOnWindowFocus: false,
        },
        mutations: {
            retry: 0,
        },
    },
});
