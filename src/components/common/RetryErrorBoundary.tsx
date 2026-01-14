import { Component, ErrorInfo, ReactNode } from "react";
import { motion } from "framer-motion";
import { AlertCircle, RefreshCw, Home, WifiOff, ServerCrash } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
  maxRetries?: number;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  retryCount: number;
  errorType: 'network' | 'server' | 'unknown';
}

/**
 * Enhanced Error Boundary with retry capability
 */
export class RetryErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    retryCount: 0,
    errorType: 'unknown',
  };

  private maxRetries: number;

  constructor(props: Props) {
    super(props);
    this.maxRetries = props.maxRetries ?? 3;
  }

  public static getDerivedStateFromError(error: Error): Partial<State> {
    const errorType = detectErrorType(error);
    return { hasError: true, error, errorType };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Error caught by boundary:", error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  private handleRetry = () => {
    if (this.state.retryCount < this.maxRetries) {
      this.setState(prev => ({
        hasError: false,
        error: null,
        retryCount: prev.retryCount + 1,
      }));
    }
  };

  private handleGoHome = () => {
    window.location.href = "/";
  };

  private handleRefresh = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      const canRetry = this.state.retryCount < this.maxRetries;
      const { errorType } = this.state;

      return (
        <div className="min-h-[50vh] flex items-center justify-center p-4" dir="rtl">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-card rounded-2xl shadow-lg p-6 max-w-md w-full text-center"
          >
            <ErrorIcon type={errorType} />
            
            <h2 className="text-xl font-bold text-foreground mb-2">
              {getErrorTitle(errorType)}
            </h2>
            
            <p className="text-muted-foreground mb-4">
              {getErrorDescription(errorType)}
            </p>

            {this.state.retryCount > 0 && (
              <p className="text-sm text-muted-foreground mb-4">
                ניסיון {this.state.retryCount} מתוך {this.maxRetries}
              </p>
            )}

            {process.env.NODE_ENV === "development" && this.state.error && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 mb-4 text-right">
                <p className="text-xs font-mono text-destructive break-words">
                  {this.state.error.message}
                </p>
              </div>
            )}

            <div className="flex flex-col gap-2">
              {canRetry && (
                <Button onClick={this.handleRetry} className="w-full">
                  <RefreshCw className="w-4 h-4 ml-2" />
                  נסה שוב
                </Button>
              )}
              
              <Button
                onClick={this.handleRefresh}
                variant={canRetry ? "outline" : "default"}
                className="w-full"
              >
                <RefreshCw className="w-4 h-4 ml-2" />
                רענן את הדף
              </Button>
              
              <Button
                onClick={this.handleGoHome}
                variant="ghost"
                className="w-full"
              >
                <Home className="w-4 h-4 ml-2" />
                חזור לעמוד הבית
              </Button>
            </div>
          </motion.div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Helper components and functions
function ErrorIcon({ type }: { type: 'network' | 'server' | 'unknown' }) {
  const icons = {
    network: WifiOff,
    server: ServerCrash,
    unknown: AlertCircle,
  };
  const Icon = icons[type];
  
  const colors = {
    network: 'bg-warning/10 text-warning',
    server: 'bg-destructive/10 text-destructive',
    unknown: 'bg-muted text-muted-foreground',
  };

  return (
    <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${colors[type]}`}>
      <Icon className="w-8 h-8" />
    </div>
  );
}

function detectErrorType(error: Error): 'network' | 'server' | 'unknown' {
  const message = error.message.toLowerCase();
  
  if (message.includes('network') || message.includes('fetch') || message.includes('offline')) {
    return 'network';
  }
  if (message.includes('500') || message.includes('server') || message.includes('503')) {
    return 'server';
  }
  return 'unknown';
}

function getErrorTitle(type: 'network' | 'server' | 'unknown'): string {
  const titles = {
    network: 'בעיית חיבור',
    server: 'שגיאת שרת',
    unknown: 'משהו השתבש',
  };
  return titles[type];
}

function getErrorDescription(type: 'network' | 'server' | 'unknown'): string {
  const descriptions = {
    network: 'נראה שיש בעיה בחיבור לאינטרנט. בדוק את החיבור ונסה שוב.',
    server: 'השרת נתקל בבעיה. נסה שוב בעוד מספר רגעים.',
    unknown: 'נתקלנו בשגיאה לא צפויה. אנחנו עובדים על פתרון.',
  };
  return descriptions[type];
}

export default RetryErrorBoundary;
