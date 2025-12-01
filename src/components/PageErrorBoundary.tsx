import { Component, ErrorInfo, ReactNode } from "react";
import { AlertCircle, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
  pageName?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class PageErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(`Error in ${this.props.pageName || "Page"}:`, error, errorInfo);
  }

  private handleBack = () => {
    window.history.back();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-muted flex items-center justify-center p-4" dir="rtl">
          <div className="bg-card rounded-3xl shadow-xl p-6 max-w-sm w-full">
            <div className="w-16 h-16 bg-warning/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-warning" />
            </div>
            
            <h3 className="text-xl font-extrabold text-foreground font-jakarta mb-2 text-center">
              שגיאה בטעינת העמוד
            </h3>
            
            <p className="text-muted-foreground font-jakarta mb-4 text-center text-sm">
              {this.props.pageName ? `לא הצלחנו לטעון את ${this.props.pageName}` : "לא הצלחנו לטעון את העמוד"}
            </p>

            {process.env.NODE_ENV === "development" && this.state.error && (
              <div className="bg-warning/5 border border-warning/20 rounded-xl p-3 mb-4 text-right">
                <p className="text-xs font-mono text-warning break-words">
                  {this.state.error.message}
                </p>
              </div>
            )}

            <Button
              onClick={this.handleBack}
              className="w-full bg-primary hover:bg-primary-dark text-primary-foreground font-jakarta font-bold py-3 rounded-2xl shadow-md"
            >
              <ArrowRight className="w-5 h-5 ml-2" />
              חזור אחורה
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
