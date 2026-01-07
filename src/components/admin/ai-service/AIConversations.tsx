import { useState } from "react";
import { motion } from "framer-motion";
import {
  MessageCircle,
  Search,
  Filter,
  MoreVertical,
  Phone,
  Mail,
  User,
  Clock,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Send,
  Paperclip,
  Smile,
  Bot,
  UserCircle
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AdminToolbar, AdminStatusBadge } from "@/components/admin/AdminStyles";
import { cn } from "@/lib/utils";

const conversations = [
  {
    id: 1,
    customer: { name: "שרה לוי", email: "sarah@email.com", phone: "050-1234567" },
    lastMessage: "תודה רבה על העזרה!",
    status: "resolved",
    channel: "whatsapp",
    time: "10:45",
    unread: 0,
    aiHandled: true,
    messages: [
      { id: 1, sender: "customer", text: "שלום, מתי ההזמנה שלי תגיע?", time: "10:30" },
      { id: 2, sender: "ai", text: "שלום שרה! בודק את ההזמנה שלך... ההזמנה מספר #12345 נשלחה אתמול ואמורה להגיע אליך היום עד השעה 18:00.", time: "10:30" },
      { id: 3, sender: "customer", text: "מעולה, תודה!", time: "10:45" },
      { id: 4, sender: "ai", text: "בשמחה! יש עוד משהו שאוכל לעזור לך?", time: "10:45" },
      { id: 5, sender: "customer", text: "תודה רבה על העזרה!", time: "10:45" },
    ]
  },
  {
    id: 2,
    customer: { name: "דניאל כהן", email: "daniel@email.com", phone: "052-9876543" },
    lastMessage: "אני רוצה לדעת על המבצעים",
    status: "active",
    channel: "web",
    time: "10:42",
    unread: 2,
    aiHandled: true,
    messages: [
      { id: 1, sender: "customer", text: "היי, יש לכם מבצעים?", time: "10:40" },
      { id: 2, sender: "ai", text: "בהחלט! יש לנו מבצע מיוחד השבוע - 20% הנחה על כל המזון היבש. האם תרצה לשמוע פרטים נוספים?", time: "10:40" },
      { id: 3, sender: "customer", text: "אני רוצה לדעת על המבצעים", time: "10:42" },
    ]
  },
  {
    id: 3,
    customer: { name: "מיכל אברהם", email: "michal@email.com", phone: "054-5555555" },
    lastMessage: "המוצר הגיע פגום",
    status: "handoff",
    channel: "facebook",
    time: "10:38",
    unread: 1,
    aiHandled: false,
    messages: [
      { id: 1, sender: "customer", text: "קיבלתי את ההזמנה אבל המוצר פגום", time: "10:35" },
      { id: 2, sender: "ai", text: "אני מצטער לשמוע! כדי שנוכל לטפל בזה בצורה הטובה ביותר, אעביר אותך לנציג שירות. רגע אחד בבקשה.", time: "10:35" },
      { id: 3, sender: "customer", text: "המוצר הגיע פגום", time: "10:38" },
    ]
  },
  {
    id: 4,
    customer: { name: "יוסי רוזנברג", email: "yossi@email.com", phone: "053-1111111" },
    lastMessage: "אוקיי תודה",
    status: "resolved",
    channel: "instagram",
    time: "10:25",
    unread: 0,
    aiHandled: true,
    messages: [
      { id: 1, sender: "customer", text: "מה שעות הפעילות?", time: "10:20" },
      { id: 2, sender: "ai", text: "אנחנו פתוחים ימים א׳-ה׳ 09:00-21:00, יום ו׳ 09:00-14:00. סגורים בשבת. האם יש עוד משהו?", time: "10:20" },
      { id: 3, sender: "customer", text: "אוקיי תודה", time: "10:25" },
    ]
  },
];

const AIConversations = () => {
  const [search, setSearch] = useState("");
  const [selectedConversation, setSelectedConversation] = useState(conversations[0]);
  const [filter, setFilter] = useState("all");
  const [newMessage, setNewMessage] = useState("");

  const filteredConversations = conversations.filter((conv) => {
    if (filter === "active") return conv.status === "active";
    if (filter === "handoff") return conv.status === "handoff";
    if (filter === "resolved") return conv.status === "resolved";
    return true;
  }).filter((conv) => 
    conv.customer.name.includes(search) || conv.lastMessage.includes(search)
  );

  const getStatusInfo = (status: string) => {
    switch (status) {
      case "resolved": return { label: "נפתר", type: "success" as const };
      case "active": return { label: "פעיל", type: "processing" as const };
      case "handoff": return { label: "העברה לנציג", type: "warning" as const };
      default: return { label: status, type: "info" as const };
    }
  };

  const getChannelEmoji = (channel: string) => {
    switch (channel) {
      case "whatsapp": return "📱";
      case "web": return "💻";
      case "facebook": return "📘";
      case "instagram": return "📸";
      case "email": return "📧";
      default: return "💬";
    }
  };

  return (
    <div className="grid lg:grid-cols-3 gap-6 h-[calc(100vh-280px)] min-h-[600px]">
      {/* Conversations List */}
      <Card className="lg:col-span-1 flex flex-col">
        <CardHeader className="pb-3 shrink-0">
          <div className="flex items-center justify-between mb-3">
            <CardTitle className="text-lg">שיחות</CardTitle>
            <Badge variant="secondary">{conversations.length}</Badge>
          </div>
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="חיפוש שיחות..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pr-10"
            />
          </div>
        </CardHeader>
        
        <div className="px-4 pb-3 shrink-0">
          <Tabs value={filter} onValueChange={setFilter}>
            <TabsList className="grid grid-cols-4 w-full">
              <TabsTrigger value="all" className="text-xs">הכל</TabsTrigger>
              <TabsTrigger value="active" className="text-xs">פעיל</TabsTrigger>
              <TabsTrigger value="handoff" className="text-xs">העברה</TabsTrigger>
              <TabsTrigger value="resolved" className="text-xs">נפתר</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <ScrollArea className="flex-1">
          <div className="px-4 pb-4 space-y-2">
            {filteredConversations.map((conv) => (
              <motion.div
                key={conv.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                onClick={() => setSelectedConversation(conv)}
                className={cn(
                  "p-3 rounded-xl cursor-pointer transition-all",
                  selectedConversation?.id === conv.id
                    ? "bg-primary/10 border border-primary/30"
                    : "bg-muted/30 hover:bg-muted/50 border border-transparent"
                )}
              >
                <div className="flex items-start gap-3">
                  <Avatar className="w-10 h-10 shrink-0">
                    <AvatarFallback className="bg-primary/10 text-primary text-sm">
                      {conv.customer.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1.5">
                        <span className="font-medium text-sm truncate">{conv.customer.name}</span>
                        <span>{getChannelEmoji(conv.channel)}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">{conv.time}</span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate mb-1.5">{conv.lastMessage}</p>
                    <div className="flex items-center justify-between">
                      <AdminStatusBadge 
                        status={getStatusInfo(conv.status).type} 
                        label={getStatusInfo(conv.status).label} 
                      />
                      {conv.unread > 0 && (
                        <Badge className="bg-primary text-primary-foreground h-5 min-w-5 flex items-center justify-center text-xs">
                          {conv.unread}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </ScrollArea>
      </Card>

      {/* Conversation View */}
      <Card className="lg:col-span-2 flex flex-col">
        {selectedConversation ? (
          <>
            {/* Header */}
            <CardHeader className="pb-3 border-b shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar className="w-12 h-12">
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {selectedConversation.customer.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{selectedConversation.customer.name}</h3>
                      <span className="text-lg">{getChannelEmoji(selectedConversation.channel)}</span>
                      <AdminStatusBadge 
                        status={getStatusInfo(selectedConversation.status).type} 
                        label={getStatusInfo(selectedConversation.status).label} 
                      />
                    </div>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Mail className="w-3 h-3" />
                        {selectedConversation.customer.email}
                      </span>
                      <span className="flex items-center gap-1">
                        <Phone className="w-3 h-3" />
                        {selectedConversation.customer.phone}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {selectedConversation.status === "handoff" && (
                    <Button size="sm" className="gap-2">
                      <ArrowRight className="w-4 h-4" />
                      קבל שיחה
                    </Button>
                  )}
                  <Button variant="ghost" size="icon">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>

            {/* Messages */}
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {selectedConversation.messages.map((message) => (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={cn(
                      "flex",
                      message.sender === "customer" ? "justify-start" : "justify-end"
                    )}
                  >
                    <div className={cn(
                      "flex items-end gap-2 max-w-[75%]",
                      message.sender !== "customer" && "flex-row-reverse"
                    )}>
                      <Avatar className="w-8 h-8 shrink-0">
                        <AvatarFallback className={cn(
                          "text-xs",
                          message.sender === "customer" 
                            ? "bg-muted" 
                            : "bg-primary/10 text-primary"
                        )}>
                          {message.sender === "customer" ? (
                            <UserCircle className="w-4 h-4" />
                          ) : (
                            <Bot className="w-4 h-4" />
                          )}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className={cn(
                          "rounded-2xl px-4 py-2.5",
                          message.sender === "customer"
                            ? "bg-muted/70 rounded-bl-md"
                            : "bg-primary text-primary-foreground rounded-br-md"
                        )}>
                          <p className="text-sm">{message.text}</p>
                        </div>
                        <p className={cn(
                          "text-[10px] text-muted-foreground mt-1",
                          message.sender !== "customer" && "text-left"
                        )}>
                          {message.time}
                          {message.sender === "ai" && " • AI"}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </ScrollArea>

            {/* Input */}
            <div className="p-4 border-t shrink-0">
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" className="shrink-0">
                  <Paperclip className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon" className="shrink-0">
                  <Smile className="w-4 h-4" />
                </Button>
                <Input
                  placeholder="הקלד הודעה..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  className="flex-1"
                />
                <Button size="icon" className="shrink-0">
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>בחר שיחה לצפייה</p>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};

export default AIConversations;
