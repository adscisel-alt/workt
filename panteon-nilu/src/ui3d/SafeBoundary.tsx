// Granica błędów sceny: gdy coś się nie wczyta (plik, sieć, blokada po stronie hosta, brak WebGL),
// pokazuje zastępstwo zamiast wysypać całą grę.
import { Component, type ReactNode } from 'react';

interface Props {
  fallback: ReactNode;
  onError?(error: unknown): void;
  children: ReactNode;
}

export class SafeBoundary extends Component<Props, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: unknown) {
    console.warn('Panteon Nilu 3D:', error);
    this.props.onError?.(error);
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}
