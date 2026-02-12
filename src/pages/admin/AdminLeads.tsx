import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Plus,
  Search,
  Filter,
  User,
  Phone,
  Mail,
  MoreVertical,
  Trash2,
  Edit,
  Eye,
  RefreshCw,
  MessageCircle,
  CheckCircle,
  XCircle,
  Clock,
  Facebook,
  Instagram,
  Globe,
  Smartphone,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Lead {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  source: string;
  status: string;
  notes: string | null;
  assigned_to: string | null;
  created_at: string;
}

const sourceConfig: Record<string, { label: string; icon: any; color: string; bgColor: string }> = {
  facebook: { label: "פייסבוק", icon: Facebook, color: "text-blue-600", bgColor: "bg-blue-100" },
  instagram: { label: "אינסטגרם", icon: Instagram, color: "text-pink-600", bgColor: "bg-pink-100" },
  whatsapp: { label: "וואטסאפ", icon: MessageCircle, color: "text-green-600", bgColor: "bg-green-100" },
  website: { label: "אתר", icon: Globe, color: "text-violet-600", bgColor: "bg-violet-100" },
  tiktok: { label: "טיקטוק", icon: Smartphone, color: "text-black", bgColor: "bg-gray-100" },
  manual: { label: "ידני", icon: User, color: "text-gray-600", bgColor: "bg-gray-100" },
  other: { label: "אחר", icon: Globe, color: "text-gray-600", bgColor: "bg-gray-100" },
};

const statusConfig: Record<string, { label: string; icon: any; color: string; bgColor: string }> = {
  new: { label: "חדש", icon: Clock, color: "text-blue-600", bgColor: "bg-blue-100" },
  contacted: { label: "נוצר קשר", icon: Phone, color: "text-amber-600", bgColor: "bg-amber-100" },
  qualified: { label: "מתאים", icon: CheckCircle, color: "text-green-600", bgColor: "bg-green-100" },
  converted: { label: "הומר", icon: CheckCircle, color: "text-emerald-600", bgColor: "bg-emerald-100" },
  lost: { label: "אבוד", icon: XCircle, color: "text-red-600", bgColor: "bg-red-100" },
};

const AdminLeads = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterSource, setFilterSource] = useState<string>("all");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);

  // New lead form
  const [newLead, setNewLead] = useState({
    name: "",
    email: "",
    phone: "",
    source: "manual",
    notes: "",
  });

  useEffect(() => {
    fetchLeads();
  }, []);

  const fetchLeads = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("leads")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      if (data) {
        setLeads(data);
      } else {
        setLeads([]);
      }
    } catch (error) {
      console.error("Error fetching leads:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredLeads = leads.filter((lead) => {
    const matchesSearch = lead.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (lead.email && lead.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (lead.phone && lead.phone.includes(searchQuery));
    const matchesStatus = filterStatus === "all" || lead.status === filterStatus;
    const matchesSource = filterSource === "all" || lead.source === filterSource;
    return matchesSearch && matchesStatus && matchesSource;
  });

  const leadsByStatus = {
    new: leads.filter(l => l.status === "new").length,
    contacted: leads.filter(l => l.status === "contacted").length,
    qualified: leads.filter(l => l.status === "qualified").length,
    converted: leads.filter(l => l.status === "converted").length,
    lost: leads.filter(l => l.status === "lost").length,
  };

  const handleCreateLead = async () => {
    try {
      const { data, error } = await supabase
        .from("leads")
        .insert({
          name: newLead.name,
          email: newLead.email || null,
          phone: newLead.phone || null,
          source: newLead.source,
          notes: newLead.notes || null,
          status: "new",
        })
        .select()
        .single();

      if (error) throw error;

      if (data) {
        setLeads([data, ...leads]);
      }

      setIsCreateDialogOpen(false);
      resetForm();

      toast({
        title: "נוצר בהצלחה",
        description: "הליד נוסף למערכת",
      });
    } catch (error) {
      console.error("Error creating lead:", error);
      toast({
        title: "שגיאה",
        description: "לא ניתן ליצור את הליד",
        variant: "destructive",
      });
    }
  };

  const handleStatusChange = async (leadId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from("leads")
        .update({ status: newStatus })
        .eq("id", leadId);

      if (error) throw error;

      setLeads(leads.map(lead => 
        lead.id === leadId ? { ...lead, status: newStatus } : lead
      ));

      toast({
        title: "עודכן בהצלחה",
        description: "סטטוס הליד עודכן",
      });
    } catch (error) {
      console.error("Error updating lead:", error);
      setLeads(leads.map(lead => 
        lead.id === leadId ? { ...lead, status: newStatus } : lead
      ));
    }
  };

  const handleDeleteLead = async (id: string) => {
    try {
      const { error } = await supabase
        .from("leads")
        .delete()
        .eq("id", id);

      if (error) throw error;

      setLeads(leads.filter(l => l.id !== id));

      toast({
        title: "נמחק בהצלחה",
        description: "הליד הוסר מהמערכת",
      });
    } catch (error) {
      console.error("Error deleting lead:", error);
      setLeads(leads.filter(l => l.id !== id));
    }
  };

  const resetForm = () => {
    setNewLead({
      name: "",
      email: "",
      phone: "",
      source: "manual",
      notes: "",
    });
  };

  return (
    <div className="min-h-screen pb-20 bg-gradient-to-br from-blue-50 via-background to-cyan-50" dir="rtl">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-lg">
        <div className="flex items-center justify-between px-4 py-4">
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full hover:bg-white/20 text-white"
            onClick={() => navigate("/admin/growo")}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-lg font-bold">ניהול לידים</h1>
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full hover:bg-white/20 text-white"
            onClick={fetchLeads}
            disabled={loading}
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </header>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <div className="px-4 py-6 space-y-6">
          {/* Status Summary */}
          <div className="grid grid-cols-5 gap-2">
            {Object.entries(statusConfig).map(([status, config]) => {
              const count = leadsByStatus[status as keyof typeof leadsByStatus];
              const Icon = config.icon;
              return (
                <motion.div
                  key={status}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setFilterStatus(filterStatus === status ? "all" : status)}
                >
                  <Card className={`p-3 text-center cursor-pointer transition-all ${
                    filterStatus === status ? config.bgColor + " border-2 border-current" : "bg-white"
                  }`}>
                    <Icon className={`w-5 h-5 mx-auto mb-1 ${config.color}`} />
                    <p className="text-xl font-bold">{count}</p>
                    <p className="text-xs text-muted-foreground">{config.label}</p>
                  </Card>
                </motion.div>
              );
            })}
          </div>

          {/* Search & Filter */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="חיפוש ליד..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pr-10"
              />
            </div>
            <Select value={filterSource} onValueChange={setFilterSource}>
              <SelectTrigger className="w-28">
                <SelectValue placeholder="מקור" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">הכל</SelectItem>
                <SelectItem value="facebook">פייסבוק</SelectItem>
                <SelectItem value="instagram">אינסטגרם</SelectItem>
                <SelectItem value="whatsapp">וואטסאפ</SelectItem>
                <SelectItem value="website">אתר</SelectItem>
                <SelectItem value="manual">ידני</SelectItem>
              </SelectContent>
            </Select>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600">
                  <Plus className="w-4 h-4 ml-1" />
                  חדש
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md" dir="rtl">
                <DialogHeader>
                  <DialogTitle>ליד חדש</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label>שם *</Label>
                    <Input
                      placeholder="שם מלא"
                      value={newLead.name}
                      onChange={(e) => setNewLead({ ...newLead, name: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>טלפון</Label>
                      <Input
                        placeholder="טלפון"
                        value={newLead.phone}
                        onChange={(e) => setNewLead({ ...newLead, phone: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>אימייל</Label>
                      <Input
                        type="email"
                        placeholder="אימייל"
                        value={newLead.email}
                        onChange={(e) => setNewLead({ ...newLead, email: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>מקור</Label>
                    <Select
                      value={newLead.source}
                      onValueChange={(value) => setNewLead({ ...newLead, source: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="facebook">פייסבוק</SelectItem>
                        <SelectItem value="instagram">אינסטגרם</SelectItem>
                        <SelectItem value="whatsapp">וואטסאפ</SelectItem>
                        <SelectItem value="website">אתר</SelectItem>
                        <SelectItem value="tiktok">טיקטוק</SelectItem>
                        <SelectItem value="manual">ידני</SelectItem>
                        <SelectItem value="other">אחר</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>הערות</Label>
                    <Textarea
                      placeholder="הערות..."
                      value={newLead.notes}
                      onChange={(e) => setNewLead({ ...newLead, notes: e.target.value })}
                    />
                  </div>
                  <Button
                    className="w-full bg-gradient-to-r from-blue-500 to-cyan-500"
                    onClick={handleCreateLead}
                    disabled={!newLead.name}
                  >
                    הוספת ליד
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Leads List */}
          <div className="space-y-3">
            {filteredLeads.map((lead, index) => {
              const source = sourceConfig[lead.source] || sourceConfig.other;
              const status = statusConfig[lead.status] || statusConfig.new;
              const SourceIcon = source.icon;
              
              return (
                <motion.div
                  key={lead.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card className="p-4 bg-white border-none shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Avatar className="w-12 h-12">
                          <AvatarFallback className={`${source.bgColor} ${source.color}`}>
                            <SourceIcon className="w-5 h-5" />
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <h4 className="font-bold text-foreground">{lead.name}</h4>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            {lead.phone && (
                              <span className="flex items-center gap-1">
                                <Phone className="w-3 h-3" />
                                {lead.phone}
                              </span>
                            )}
                          </div>
                          <Badge className={`${status.bgColor} ${status.color} border-none text-xs mt-1`}>
                            {status.label}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-left text-xs text-muted-foreground">
                          {new Date(lead.created_at).toLocaleDateString("he-IL")}
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => {
                              setSelectedLead(lead);
                              setIsViewDialogOpen(true);
                            }}>
                              <Eye className="w-4 h-4 ml-2" />
                              צפייה
                            </DropdownMenuItem>
                            {lead.phone && (
                              <DropdownMenuItem onClick={() => window.location.href = `tel:${lead.phone}`}>
                                <Phone className="w-4 h-4 ml-2" />
                                התקשר
                              </DropdownMenuItem>
                            )}
                            {lead.phone && (
                              <DropdownMenuItem onClick={() => window.open(`https://wa.me/${lead.phone.replace(/\D/g, '')}`)}>
                                <MessageCircle className="w-4 h-4 ml-2" />
                                וואטסאפ
                              </DropdownMenuItem>
                            )}
                            {lead.email && (
                              <DropdownMenuItem onClick={() => window.location.href = `mailto:${lead.email}`}>
                                <Mail className="w-4 h-4 ml-2" />
                                שלח מייל
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem 
                              className="text-destructive"
                              onClick={() => handleDeleteLead(lead.id)}
                            >
                              <Trash2 className="w-4 h-4 ml-2" />
                              מחיקה
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </div>

          {filteredLeads.length === 0 && (
            <div className="text-center py-12">
              <User className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">לא נמצאו לידים</p>
            </div>
          )}
        </div>
      )}

      {/* Lead View Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-md" dir="rtl">
          {selectedLead && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedLead.name}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div className="flex items-center gap-2">
                  <Badge className={`${sourceConfig[selectedLead.source]?.bgColor} ${sourceConfig[selectedLead.source]?.color}`}>
                    {sourceConfig[selectedLead.source]?.label}
                  </Badge>
                  <Badge className={`${statusConfig[selectedLead.status]?.bgColor} ${statusConfig[selectedLead.status]?.color}`}>
                    {statusConfig[selectedLead.status]?.label}
                  </Badge>
                </div>

                {selectedLead.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-muted-foreground" />
                    <a href={`tel:${selectedLead.phone}`} className="text-blue-600 hover:underline">
                      {selectedLead.phone}
                    </a>
                  </div>
                )}

                {selectedLead.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    <a href={`mailto:${selectedLead.email}`} className="text-blue-600 hover:underline">
                      {selectedLead.email}
                    </a>
                  </div>
                )}

                {selectedLead.notes && (
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground mb-1">הערות:</p>
                    <p>{selectedLead.notes}</p>
                  </div>
                )}

                <div className="space-y-2">
                  <Label>שנה סטטוס:</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(statusConfig).map(([status, config]) => (
                      <Button
                        key={status}
                        variant={selectedLead.status === status ? "default" : "outline"}
                        size="sm"
                        onClick={() => {
                          handleStatusChange(selectedLead.id, status);
                          setSelectedLead({ ...selectedLead, status });
                        }}
                        className={selectedLead.status === status ? config.bgColor + " " + config.color : ""}
                      >
                        {config.label}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminLeads;
