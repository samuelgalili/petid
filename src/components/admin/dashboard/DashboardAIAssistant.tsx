import { useState, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Bot, 
  Send, 
  X, 
  MoreHorizontal,
  Search,
  BarChart2,
  AlertCircle,
  GitCompare,
  FileText,
  ThumbsUp,
  MessageCircle,
  Smile,
  ChevronDown,
  ChevronUp,
  Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  user?: {
    name: string;
    avatar?: string;
  };
}

interface QuickAction {
  icon: React.ElementType;
  label: string;
  action: string;
}

export const DashboardAIAssistant = () => {
  const [isOpen, setIsOpen] = useState(true);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Hello! How can I assist you today?',
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const quickActions: QuickAction[] = [
    { icon: Search, label: 'Analyze Sales', action: 'analyze sales data and provide insights' },
    { icon: AlertCircle, label: 'Fix Price Errors', action: 'identify and fix pricing errors in products' },
    { icon: GitCompare, label: 'Compare Competitors', action: 'compare our prices with competitors' },
    { icon: FileText, label: 'Generate Report', action: 'generate a comprehensive sales report' },
  ];

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim()) return;

    const userMessage: Message = {
      id: `user_${Date.now()}`,
      role: 'user',
      content,
      timestamp: new Date(),
      user: {
        name: 'Jonathan Doe',
      }
    };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('orchestrator-chat', {
        body: { 
          message: content,
          context: 'admin_dashboard',
        },
      });

      const assistantMessage: Message = {
        id: `assistant_${Date.now()}`,
        role: 'assistant',
        content: data?.response || 'I\'ve processed your request. Let me know if there\'s anything else you need!',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      const errorMessage: Message = {
        id: `error_${Date.now()}`,
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  if (!isOpen) {
    return (
      <Button 
        onClick={() => setIsOpen(true)}
        className="w-full justify-start gap-2 bg-slate-700/50 hover:bg-slate-700 text-white border-slate-600"
        variant="outline"
      >
        <Bot className="w-4 h-4" />
        Open AI Assistant
      </Button>
    );
  }

  return (
    <Card className="bg-slate-800/80 border-slate-700 text-white overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <span className="font-semibold">AI Assistant</span>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="w-8 h-8 text-slate-400 hover:text-white hover:bg-slate-700">
            <MoreHorizontal className="w-4 h-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className="w-8 h-8 text-slate-400 hover:text-white hover:bg-slate-700"
            onClick={() => setIsOpen(false)}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="h-[280px]">
        <div className="p-4 space-y-4">
          {messages.map((message) => (
            <div key={message.id} className="space-y-2">
              {message.role === 'assistant' ? (
                <div className="bg-slate-700/50 rounded-2xl p-4">
                  <p className="text-sm text-slate-200">{message.content}</p>
                  {message.id === '1' && (
                    <div className="grid grid-cols-2 gap-2 mt-3">
                      {quickActions.map((action, idx) => (
                        <Button
                          key={idx}
                          variant="outline"
                          size="sm"
                          className="justify-start gap-2 bg-slate-800/50 border-slate-600 text-slate-200 hover:bg-slate-700 hover:text-white text-xs h-9"
                          onClick={() => sendMessage(action.action)}
                        >
                          <action.icon className="w-3.5 h-3.5 text-sky-400" />
                          {action.label}
                        </Button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-start gap-3">
                  <Avatar className="w-8 h-8">
                    <AvatarFallback className="bg-slate-600 text-xs">JD</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{message.user?.name}</span>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="w-6 h-6 text-slate-500 hover:text-white">
                          <ChevronUp className="w-3 h-3" />
                        </Button>
                        <Button variant="ghost" size="icon" className="w-6 h-6 text-slate-500 hover:text-white">
                          <ChevronDown className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                    <p className="text-sm text-slate-300 mt-1">{message.content}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <Button variant="ghost" size="icon" className="w-6 h-6 text-slate-500 hover:text-white">
                        <ThumbsUp className="w-3 h-3" />
                      </Button>
                      <Button variant="ghost" size="icon" className="w-6 h-6 text-slate-500 hover:text-white">
                        <MessageCircle className="w-3 h-3" />
                      </Button>
                      <Button variant="ghost" size="icon" className="w-6 h-6 text-slate-500 hover:text-white">
                        <Smile className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
          {isLoading && (
            <div className="flex items-center gap-2 text-slate-400">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm">Thinking...</span>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="p-3 border-t border-slate-700">
        <div className="flex items-center gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a command..."
            className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-400 focus:border-sky-500"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage(input);
              }
            }}
          />
          <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white">
            <Smile className="w-5 h-5" />
          </Button>
          <Button 
            size="sm"
            className="bg-sky-500 hover:bg-sky-600 text-white"
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || isLoading}
          >
            Send
          </Button>
        </div>
      </div>
    </Card>
  );
};
