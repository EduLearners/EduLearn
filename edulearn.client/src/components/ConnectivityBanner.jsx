import { useNetworkStatus } from '../hooks/useNetworkStatus';

export default function ConnectivityBanner() {
  const { online } = useNetworkStatus();
  if (online) return null;
  return (
    <div className="alert alert-warning text-center mb-0 rounded-0" role="status" data-testid="connectivity-banner">
      You are offline. Changes will be queued and sent when you reconnect.
    </div>
  );
}
