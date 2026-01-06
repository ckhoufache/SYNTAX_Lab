import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error in component:", error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="w-full h-full flex flex-col items-center justify-center bg-red-50/50 text-center p-8 overflow-y-auto">
          <div className="bg-white p-8 rounded-2xl shadow-xl border border-red-100 max-w-lg w-full">
            <div className="bg-red-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertTriangle className="w-8 h-8 text-red-600"/>
            </div>
            <h2 className="text-xl font-black text-slate-800 mb-2">Darstellungsfehler</h2>
            <p className="text-sm text-slate-500 mb-6">
              Ein Teil der Anwendung konnte nicht geladen werden.
            </p>
            
            <div className="bg-slate-900 p-4 rounded-xl text-left mb-6 overflow-auto max-h-40 custom-scrollbar">
              <code className="text-[10px] font-mono text-red-300 whitespace-pre-wrap break-all">
                {this.state.error?.message || "Unbekannter Fehler"}
              </code>
            </div>

            <button 
              onClick={this.handleReset}
              className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-xl text-sm font-bold transition-all flex items-center gap-2 mx-auto justify-center w-full shadow-lg shadow-red-200"
            >
              <RefreshCw className="w-4 h-4"/> Erneut versuchen
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}