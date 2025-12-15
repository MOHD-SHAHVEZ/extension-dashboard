// src/components/ErrorBoundary.jsx
import React from "react";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null, info: null };
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  componentDidCatch(error, info) {
    this.setState({ info });
    // optionally log to remote
    console.error("ErrorBoundary caught:", error, info);
  }
  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen flex items-center justify-center p-6">
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-3xl w-full">
            <h2 className="text-xl font-semibold text-red-600 mb-3">Something went wrong</h2>
            <pre className="text-xs bg-gray-100 p-3 rounded overflow-auto" style={{maxHeight: 300}}>
              {String(this.state.error && this.state.error.toString())}
              {"\n\n"}
              {this.state.info ? this.state.info.componentStack : ""}
            </pre>
            <div className="mt-4">
              <button onClick={() => window.location.reload()} className="px-4 py-2 bg-blue-600 text-white rounded">
                Reload
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
