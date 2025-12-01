import { Component, ErrorInfo, ReactNode } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
}

export class PostCardErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("PostCard error:", error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false });
    this.props.onReset?.();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8 mb-4 text-center" dir="rtl">
          <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-500" />
          </div>
          
          <h3 className="text-lg font-black text-gray-900 font-jakarta mb-2">
            שגיאה בטעינת הפוסט
          </h3>
          
          <p className="text-gray-500 font-jakarta text-sm mb-4">
            לא הצלחנו להציג את הפוסט הזה
          </p>

          <Button
            onClick={this.handleReset}
            variant="outline"
            className="font-jakarta font-bold rounded-2xl"
            size="sm"
          >
            <RefreshCw className="w-4 h-4 ml-2" />
            נסה שוב
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
