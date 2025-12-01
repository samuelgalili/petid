import { Component, ErrorInfo, ReactNode } from "react";
import { AlertCircle, RefreshCw, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    this.props.onReset?.();
  };

  private handleGoHome = () => {
    window.location.href = "/home";
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-muted flex items-center justify-center p-4" dir="rtl">
          <div className="bg-card rounded-3xl shadow-xl p-8 max-w-md w-full text-center">
            <div className="w-20 h-20 bg-error/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="w-10 h-10 text-error" />
            </div>
            
            <h2 className="text-2xl font-extrabold text-foreground font-jakarta mb-3">
              אופס! משהו השתבש
            </h2>
            
            <p className="text-muted-foreground font-jakarta mb-6 leading-relaxed">
              נתקלנו בשגיאה בלתי צפויה. אנחנו עובדים על זה!
            </p>

            {process.env.NODE_ENV === "development" && this.state.error && (
              <div className="bg-error/5 border border-error/20 rounded-xl p-4 mb-6 text-right">
                <p className="text-xs font-mono text-error break-words">
                  {this.state.error.message}
                </p>
              </div>
            )}

            <div className="flex flex-col gap-3">
              <Button
                onClick={this.handleReset}
                className="w-full bg-primary hover:bg-primary-dark text-primary-foreground font-jakarta font-bold py-3 rounded-2xl shadow-md"
              >
                <RefreshCw className="w-5 h-5 ml-2" />
                נסה שוב
              </Button>
              
              <Button
                onClick={this.handleGoHome}
                variant="outline"
                className="w-full font-jakarta font-bold py-3 rounded-2xl"
              >
                <Home className="w-5 h-5 ml-2" />
                חזור לעמוד הבית
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
