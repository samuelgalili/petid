import { Component, ErrorInfo, ReactNode } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Props {
  children: ReactNode;
  fallbackMessage?: string;
  className?: string;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  showRetry?: boolean;
  compact?: boolean;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Local error boundary for individual components
 * Prevents errors from breaking the entire page
 */
export class ComponentErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[ComponentErrorBoundary] Error caught:", error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    const { hasError, error } = this.state;
    const { 
      children, 
      fallbackMessage = "משהו השתבש בטעינת הרכיב",
      className,
      showRetry = true,
      compact = false,
    } = this.props;

    if (!hasError) {
      return children;
    }

    if (compact) {
      return (
        <div className={cn(
          "flex items-center gap-2 p-3 bg-destructive/10 rounded-lg text-destructive text-sm",
          className
        )}>
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span className="truncate">{fallbackMessage}</span>
          {showRetry && (
            <Button
              variant="ghost"
              size="sm"
              onClick={this.handleRetry}
              className="h-6 px-2 text-xs"
            >
              <RefreshCw className="w-3 h-3" />
            </Button>
          )}
        </div>
      );
    }

    return (
      <div className={cn(
        "flex flex-col items-center justify-center p-6 bg-card rounded-xl border border-border text-center",
        className
      )}>
        <div className="w-12 h-12 bg-destructive/10 rounded-full flex items-center justify-center mb-4">
          <AlertCircle className="w-6 h-6 text-destructive" />
        </div>
        
        <h3 className="text-lg font-semibold text-foreground mb-2">
          {fallbackMessage}
        </h3>
        
        <p className="text-sm text-muted-foreground mb-4">
          נתקלנו בשגיאה. אנא נסו שוב.
        </p>

        {import.meta.env.DEV && error && (
          <div className="w-full bg-muted/50 rounded-lg p-3 mb-4 text-right">
            <p className="text-xs font-mono text-destructive break-words">
              {error.message}
            </p>
          </div>
        )}

        {showRetry && (
          <Button
            onClick={this.handleRetry}
            variant="outline"
            size="sm"
            className="gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            נסה שוב
          </Button>
        )}
      </div>
    );
  }
}

/**
 * HOC to wrap any component with error boundary
 */
export function withErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  options: Omit<Props, 'children'> = {}
) {
  return function WithErrorBoundary(props: P) {
    return (
      <ComponentErrorBoundary {...options}>
        <WrappedComponent {...props} />
      </ComponentErrorBoundary>
    );
  };
}

export default ComponentErrorBoundary;
