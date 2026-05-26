import React from 'react';
import { errorReporter } from '../services/errorReporterService';
import ErrorFallbackPage from './ErrorFallbackPage';

export default class ErrorBoundary extends React.Component {
  state = { hasError: false, err: null };
  static getDerivedStateFromError(err) { return { hasError: true, err }; }
  componentDidCatch(err, info) {
    try {
      errorReporter.reportRender(err, info?.componentStack, window.location.href);
    } catch { /* never throw from boundary */ }
  }
  reset = () => this.setState({ hasError: false, err: null });
  render() {
    if (!this.state.hasError) return this.props.children;
    return <ErrorFallbackPage error={this.state.err} onReload={() => window.location.reload()} onReset={this.reset} />;
  }
}
