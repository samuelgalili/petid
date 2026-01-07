import { useState } from "react";
import { motion } from "framer-motion";
import {
  Inbox,
  User,
  Clock,
  MessageCircle,
  Phone,
  Mail,
  CheckCircle2,
  ArrowRight,
  AlertCircle,
  UserCircle,
  Bot,
  Send,
  Paperclip,
  MoreVertical,
  Tag,
  Star,
  Filter
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AdminSectionCard, AdminStatusBadge } from "@/components/admin/AdminStyles";
import { cn } from "@/lib/utils";

const pendingHandoffs = [
  {
    id: 1,
    customer: { name: "מיכל אברהם", email: "michal@email.com", phone: "054-5555555" },
    reason: "תלונה על מוצר פגום",
    sentiment: "negative",
    waitTime: "8 דקות",
    priority: "high",
    channel: "facebook",
    summary: "הלקוחה קיבלה מוצר פגום ומבקשת החלפה או החזר",
    messages: [
      { sender: "customer", text: "קיבלתי את ההזמנה אבל המוצר פגום", time: "10:35" },
      { sender: "ai", text: "אני מצטער לשמוע! כדי שנוכל לטפל בזה בצורה הטובה ביותר, אעביר אותך לנציג שירות. רגע אחד בבקשה.", time: "10:35" },
      { sender: "customer", text: "המוצר הגיע שבור לגמרי, זה לא סביר", time: "10:38" },
    ]
  },
  {
    id: 2,
    customer: { name: "אבי מזרחי", email: "avi@email.com", phone: "050-7777777" },
    reason: "שאלה מורכבת על מוצר",
    sentiment: "neutral",
    waitTime: "3 דקות",
    priority: "medium",
    channel: "whatsapp",
    summary: "לקוח שואל על תאימות מוצר לגזע ספציפי",
    messages: [
      { sender: "customer", text: "האם המזון הזה מתאים לכלב מגזע גולדן?", time: "10:40" },
      { sender: "ai", text: "אני לא בטוח לגבי ההתאמה הספציפית. תן לי להעביר אותך לנציג מומחה שיוכל לעזור.", time: "10:41" },
    ]
  },
  {
    id: 3,
    customer: { name: "נועה פלדמן", email: "noa@email.com", phone: "052-8888888" },
    reason: "בקשה מיוחדת",
    sentiment: "positive",
    waitTime: "1 דקה",
    priority: "low",
    channel: "web",
    summary: "לקוחה מבקשת להזמין מוצר מיוחד שאינו במלאי",
    messages: [
      { sender: "customer", text: "האם אפשר להזמין מוצר מיוחד?", time: "10:44" },
      { sender: "ai", text: "בקשות מיוחדות דורשות אישור מנציג. אעביר אותך כעת.", time: "10:44" },
    ]
  },
];

const agents = [
  { id: 1, name: "יעל כהן", status: "online", activeChats: 3, avatar: "י" },
  { id: 2, name: "רון לוי", status: "online", activeChats: 2, avatar: "ר" },
  { id: 3, name: "דנה אברהם", status: "busy", activeChats: 5, avatar: "ד" },
  { id: 4, name: "עמית שרון", status: "offline", activeChats: 0, avatar: "ע" },
];

const AIAgentInbox = () => {
  const [selectedHandoff, setSelectedHandoff] = useState(pendingHandoffs[0]);
  const [filter, setFilter] = useState("all");
  const [newMessage, setNewMessage] = useState("");

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high": return "bg-rose-500/10 text-rose-600 border-rose-500/30";
      case "medium": return "bg-amber-500/10 text-amber-600 border-amber-500/30";
      case "low": return "bg-blue-500/10 text-blue-600 border-blue-500/30";
      default: return "bg-muted";
    }
  };

  const getSentimentIcon = (sentiment: string) => {
    switch (sentiment) {
      case "negative": return <AlertCircle className="w-4 h-4 text-rose-500" />;
      case "positive": return <Star className="w-4 h-4 text-amber-500" />;
      default: return null;
    }
  };

  const getAgentStatusColor = (status: string) => {
    switch (status) {
      case "online": return "bg-emerald-500";
      case "busy": return "bg-amber-500";
      case "offline": return "bg-muted-foreground";
      default: return "bg-muted";
    }
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">ממתינים לטיפול</p>
                <p className="text-2xl font-bold text-rose-600">{pendingHandoffs.length}</p>
              </div>
              <div className="p-3 rounded-xl bg-rose-500/10">
                <Inbox className="w-5 h-5 text-rose-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">זמן המתנה ממוצע</p>
                <p className="text-2xl font-bold">4 דק׳</p>
              </div>
              <div className="p-3 rounded-xl bg-amber-500/10">
                <Clock className="w-5 h-5 text-amber-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">נציגים זמינים</p>
                <p className="text-2xl font-bold">{agents.filter(a => a.status === "online").length}/{agents.length}</p>
              </div>
              <div className="p-3 rounded-xl bg-emerald-500/10">
                <User className="w-5 h-5 text-emerald-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">נפתרו היום</p>
                <p className="text-2xl font-bold">47</p>
              </div>
              <div className="p-3 rounded-xl bg-blue-500/10">
                <CheckCircle2 className="w-5 h-5 text-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-4 gap-6">
        {/* Pending Queue */}
        <div className="lg:col-span-1">
          <Card className="h-[500px] flex flex-col">
            <CardHeader className="pb-3 shrink-0">
              <CardTitle className="text-base flex items-center justify-between">
                תור ממתינים
                <Badge variant="destructive">{pendingHandoffs.length}</Badge>
              </CardTitle>
            </CardHeader>
            <ScrollArea className="flex-1 px-4 pb-4">
              <div className="space-y-2">
                {pendingHandoffs.map((handoff) => (
                  <motion.div
                    key={handoff.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    onClick={() => setSelectedHandoff(handoff)}
                    className={cn(
                      "p-3 rounded-xl cursor-pointer transition-all",
                      selectedHandoff?.id === handoff.id
                        ? "bg-primary/10 border border-primary/30"
                        : "bg-muted/30 hover:bg-muted/50 border border-transparent"
                    )}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Avatar className="w-8 h-8">
                        <AvatarFallback className="bg-primary/10 text-primary text-xs">
                          {handoff.customer.name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{handoff.customer.name}</p>
                      </div>
                      {getSentimentIcon(handoff.sentiment)}
                    </div>
                    <p className="text-xs text-muted-foreground truncate mb-2">{handoff.reason}</p>
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className={cn("text-xs", getPriorityColor(handoff.priority))}>
                        {handoff.priority === "high" ? "דחוף" : handoff.priority === "medium" ? "בינוני" : "נמוך"}
                      </Badge>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {handoff.waitTime}
                      </span>
                    </div>
                  </motion.div>
                ))}
              </div>
            </ScrollArea>
          </Card>
        </div>

        {/* Conversation View */}
        <div className="lg:col-span-2">
          <Card className="h-[500px] flex flex-col">
            {selectedHandoff ? (
              <>
                <CardHeader className="pb-3 border-b shrink-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar className="w-10 h-10">
                        <AvatarFallback className="bg-primary/10 text-primary">
                          {selectedHandoff.customer.name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="font-semibold">{selectedHandoff.customer.name}</h3>
                        <p className="text-xs text-muted-foreground">{selectedHandoff.reason}</p>
                      </div>
                    </div>
                    <Button className="gap-2">
                      <ArrowRight className="w-4 h-4" />
                      קבל שיחה
                    </Button>
                  </div>
                </CardHeader>

                {/* AI Summary */}
                <div className="p-3 bg-blue-500/5 border-b flex items-start gap-2">
                  <Bot className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-medium text-blue-600 mb-0.5">סיכום AI</p>
                    <p className="text-xs text-muted-foreground">{selectedHandoff.summary}</p>
                  </div>
                </div>

                <ScrollArea className="flex-1 p-4">
                  <div className="space-y-4">
                    {selectedHandoff.messages.map((message, index) => (
                      <div
                        key={index}
                        className={cn(
                          "flex",
                          message.sender === "customer" ? "justify-start" : "justify-end"
                        )}
                      >
                        <div className={cn(
                          "flex items-end gap-2 max-w-[75%]",
                          message.sender !== "customer" && "flex-row-reverse"
                        )}>
                          <Avatar className="w-6 h-6 shrink-0">
                            <AvatarFallback className={cn(
                              "text-[10px]",
                              message.sender === "customer" 
                                ? "bg-muted" 
                                : "bg-blue-500/10 text-blue-500"
                            )}>
                              {message.sender === "customer" ? (
                                <UserCircle className="w-3 h-3" />
                              ) : (
                                <Bot className="w-3 h-3" />
                              )}
                            </AvatarFallback>
                          </Avatar>
                          <div className={cn(
                            "rounded-2xl px-3 py-2",
                            message.sender === "customer"
                              ? "bg-muted/70 rounded-bl-md"
                              : "bg-blue-500/10 text-foreground rounded-br-md"
                          )}>
                            <p className="text-sm">{message.text}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>

                <div className="p-3 border-t shrink-0">
                  <div className="flex items-center gap-2">
                    <Input
                      placeholder="הקלד הודעה..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      className="flex-1"
                    />
                    <Button size="icon">
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <Inbox className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>בחר שיחה מהתור</p>
                </div>
              </div>
            )}
          </Card>
        </div>

        {/* Agents */}
        <div className="lg:col-span-1">
          <Card className="h-[500px] flex flex-col">
            <CardHeader className="pb-3 shrink-0">
              <CardTitle className="text-base">נציגים</CardTitle>
            </CardHeader>
            <ScrollArea className="flex-1 px-4 pb-4">
              <div className="space-y-2">
                {agents.map((agent) => (
                  <div
                    key={agent.id}
                    className="flex items-center gap-3 p-3 rounded-xl bg-muted/30"
                  >
                    <div className="relative">
                      <Avatar className="w-10 h-10">
                        <AvatarFallback className="bg-primary/10 text-primary">
                          {agent.avatar}
                        </AvatarFallback>
                      </Avatar>
                      <div className={cn(
                        "absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-background",
                        getAgentStatusColor(agent.status)
                      )} />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-sm">{agent.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {agent.status === "online" ? "זמין" : agent.status === "busy" ? "עסוק" : "לא מחובר"}
                        {agent.activeChats > 0 && ` • ${agent.activeChats} שיחות`}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AIAgentInbox;
