import { Component, type ReactNode } from "react";

export function AppFailure() {
  return (
    <main className="app-failure" role="alert">
      <p>MEIRO</p>
      <h1>Хуудас ачаалж чадсангүй.</h1>
      <p>Дахин ачаалаад оролдоно уу.</p>
      <button type="button" onClick={() => window.location.reload()}>
        Дахин ачаалах
      </button>
      <a href={import.meta.env.BASE_URL}>Нүүр хуудас</a>
    </main>
  );
}

export class AppErrorBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  // Do not send raw exceptions, component props, session data or URLs to telemetry.
  componentDidCatch() {}
  render() {
    return this.state.failed ? <AppFailure /> : this.props.children;
  }
}
