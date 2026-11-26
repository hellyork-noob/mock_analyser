import React from "react";
export default class AppErrorBoundary extends React.Component<{
    children: React.ReactNode;
}, {
    failed: boolean;
}> {
    state = { failed: false };
    static getDerivedStateFromError() {
        return { failed: true };
    }
    componentDidCatch(error: Error, info: React.ErrorInfo) {
        console.error("Advance Analyzer rendering error", error, info);
    }
    render() {
        if (!this.state.failed)
            return this.props.children;
        return (<main className="aa-recovery" role="alert">
        <section className="aa-recovery-card">
          <h2>This view couldn't be displayed</h2>
          <p>
            Your stored records have not been cleared. Reload to try again, or
            open the Analytics page.
          </p>
          <div className="aa-recovery-actions">
            <button type="button" onClick={() => location.reload()}>
              Reload app
            </button>
            <button type="button" onClick={() => {
                localStorage.setItem("aa_v2_clean_view", "Analytics");
                location.reload();
            }}>
              Open Analytics
            </button>
          </div>
        </section>
      </main>);
    }
}
