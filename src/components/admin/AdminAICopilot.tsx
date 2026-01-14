import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Bot, Send, Sparkles, Lightbulb, X, ChevronRight, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  suggestions?: string[];
  timestamp: Date;
}

interface AIInsight {
  id: string;
  type: 'tip' | 'alert' | 'suggestion';
  title: string;
  description: string;
  action?: { label: string; href: string };
}

export const AdminAICopilot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'שלום! אני העוזר החכם שלך. איך אוכל לעזור היום?',
      suggestions: ['הצג סיכום יומי', 'מה ההזמנות הממתינות?', 'איזה מוצרים במלאי נמוך?'],
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [insights, setInsights] = useState<AIInsight[]>([
    {
      id: '1',
      type: 'alert',
      title: 'מלאי נמוך',
      description: '5 מוצרים עם מלאי קריטי',
      action: { label: 'צפה', href: '/admin/inventory?filter=low' },
    },
    {
      id: '2',
      type: 'suggestion',
      title: 'הזמנות ממתינות',
      description: '12 הזמנות ממתינות לאישור',
      action: { label: 'טפל', href: '/admin/orders?status=pending' },
    },
    {
      id: '3',
      type: 'tip',
      title: 'עדכון מחירים',
      description: 'מחירי 8 מוצרים לא עודכנו מעל 30 יום',
      action: { label: 'עדכן', href: '/admin/pricing' },
    },
  ]);

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim()) return;

    const userMessage: Message = {
      id: `user_${Date.now()}`,
      role: 'user',
      content,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // Call AI endpoint
      const { data, error } = await supabase.functions.invoke('orchestrator-chat', {
        body: { 
          message: content,
          context: 'admin_copilot',
        },
      });

      const assistantMessage: Message = {
        id: `assistant_${Date.now()}`,
        role: 'assistant',
        content: data?.response || 'מצטער, לא הצלחתי לעבד את הבקשה. נסה שוב.',
        suggestions: data?.suggestions,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      const errorMessage: Message = {
        id: `error_${Date.now()}`,
        role: 'assistant',
        content: 'אירעה שגיאה. אנא נסה שוב מאוחר יותר.',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleSuggestionClick = (suggestion: string) => {
    sendMessage(suggestion);
  };

  return (
    <>
      {/* Floating Button */}
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 left-6 z-50 w-14 h-14 rounded-full shadow-lg bg-gradient-to-br from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
        size="icon"
      >
        <Bot className="w-6 h-6" />
      </Button>

      {/* Copilot Sheet */}
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetContent side="left" className="w-[400px] sm:w-[450px] p-0 flex flex-col" dir="rtl">
          <SheetHeader className="px-4 py-3 border-b bg-gradient-to-l from-primary/10 to-transparent">
            <SheetTitle className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-primary/10">
                <Sparkles className="w-5 h-5 text-primary" />
              </div>
              <span>AI Copilot</span>
            </SheetTitle>
          </SheetHeader>

          {/* Insights Section */}
          {insights.length > 0 && (
            <div className="px-4 py-3 border-b bg-muted/30">
              <div className="flex items-center gap-2 mb-2">
                <Lightbulb className="w-4 h-4 text-yellow-500" />
                <span className="text-sm font-medium">תובנות חכמות</span>
              </div>
              <div className="space-y-2">
                {insights.slice(0, 3).map(insight => (
                  <div
                    key={insight.id}
                    className={cn(
                      "p-2 rounded-lg border text-sm flex items-center justify-between",
                      insight.type === 'alert' && "bg-destructive/5 border-destructive/20",
                      insight.type === 'suggestion' && "bg-blue-500/5 border-blue-500/20",
                      insight.type === 'tip' && "bg-yellow-500/5 border-yellow-500/20"
                    )}
                  >
                    <div>
                      <p className="font-medium">{insight.title}</p>
                      <p className="text-xs text-muted-foreground">{insight.description}</p>
                    </div>
                    {insight.action && (
                      <Button variant="ghost" size="sm" className="shrink-0">
                        {insight.action.label}
                        <ChevronRight className="w-4 h-4 mr-1" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Chat Messages */}
          <ScrollArea className="flex-1 px-4 py-3">
            <div className="space-y-4">
              {messages.map(message => (
                <div
                  key={message.id}
                  className={cn(
                    "flex",
                    message.role === 'user' ? "justify-end" : "justify-start"
                  )}
                >
                  <div
                    className={cn(
                      "max-w-[85%] rounded-2xl px-4 py-2",
                      message.role === 'user'
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    )}
                  >
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    {message.suggestions && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {message.suggestions.map((suggestion, idx) => (
                          <Badge
                            key={idx}
                            variant="secondary"
                            className="cursor-pointer hover:bg-secondary/80 text-xs"
                            onClick={() => handleSuggestionClick(suggestion)}
                          >
                            {suggestion}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-muted rounded-2xl px-4 py-3">
                    <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Input Area */}
          <div className="p-4 border-t bg-background">
            <div className="flex gap-2">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="שאל אותי כל דבר..."
                className="min-h-[44px] max-h-[120px] resize-none"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage(input);
                  }
                }}
              />
              <Button
                onClick={() => sendMessage(input)}
                disabled={!input.trim() || isLoading}
                size="icon"
                className="shrink-0 h-11 w-11"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
};
