import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { PageTransition } from "@/components/PageTransition";
import BottomNav from "@/components/BottomNav";
import { 
  User, 
  Mail, 
  Phone, 
  Camera, 
  LogOut, 
  Edit2, 
  Check, 
  X,
  Settings,
  Bell,
  Shield,
  HelpCircle,
  ChevronRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const Profile = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);

  const [profile, setProfile] = useState({
    id: "",
    full_name: "",
    email: "",
    phone: "",
    avatar_url: "",
  });

  const [editedProfile, setEditedProfile] = useState({
    full_name: "",
    phone: "",
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate('/auth');
        return;
      }

      const { data: profileData, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (error) throw error;

      const profileInfo = {
        id: user.id,
        full_name: profileData?.full_name || "",
        email: user.email || "",
        phone: user.phone || "",
        avatar_url: profileData?.avatar_url || "",
      };

      setProfile(profileInfo);
      setEditedProfile({
        full_name: profileInfo.full_name,
        phone: profileInfo.phone,
      });
    } catch (error: any) {
      console.error("Error fetching profile:", error);
      toast({
        title: "Error loading profile",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);
      
      if (!event.target.files || event.target.files.length === 0) {
        return;
      }

      const file = event.target.files[0];
      const fileExt = file.name.split('.').pop();
      const fileName = `${profile.id}-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', profile.id);

      if (updateError) throw updateError;

      setProfile({ ...profile, avatar_url: publicUrl });
      
      toast({
        title: "Avatar updated!",
        description: "Your profile picture has been updated successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Error uploading avatar",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleSaveProfile = async () => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: editedProfile.full_name,
        })
        .eq('id', profile.id);

      if (error) throw error;

      setProfile({
        ...profile,
        full_name: editedProfile.full_name,
        phone: editedProfile.phone,
      });

      setEditing(false);
      
      toast({
        title: "Profile updated!",
        description: "Your profile has been updated successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Error updating profile",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      navigate('/auth');
      
      toast({
        title: "Logged out",
        description: "You have been logged out successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Error logging out",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const menuItems = [
    {
      icon: Settings,
      label: "Settings",
      description: "App preferences",
      onClick: () => navigate('/settings'),
    },
    {
      icon: Bell,
      label: "Notifications",
      description: "Manage notifications",
      onClick: () => toast({ title: "Coming soon!" }),
    },
    {
      icon: Shield,
      label: "Privacy & Security",
      description: "Account security",
      onClick: () => toast({ title: "Coming soon!" }),
    },
    {
      icon: HelpCircle,
      label: "Help & Support",
      description: "Get help",
      onClick: () => toast({ title: "Coming soon!" }),
    },
  ];

  if (loading) {
    return (
      <PageTransition>
        <div className="min-h-screen bg-background flex items-center justify-center pb-20">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-[#7DD3C0] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600 font-jakarta">Loading profile...</p>
          </div>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="min-h-screen bg-background pb-20">
        {/* Header */}
        <div className="bg-gradient-to-br from-[#7DD3C0] to-[#6BC4AD] pt-8 pb-20 px-4">
          <h1 className="text-2xl font-bold text-white font-jakarta mb-2">Profile</h1>
          <p className="text-white/90 text-sm font-jakarta">Manage your account</p>
        </div>

        {/* Profile Card - Overlapping Header */}
        <div className="px-4 -mt-12">
          <Card className="p-6 shadow-xl">
            <div className="flex flex-col items-center">
              {/* Avatar with Upload */}
              <div className="relative mb-4">
                <Avatar className="w-24 h-24 border-4 border-white shadow-lg">
                  <AvatarImage src={profile.avatar_url} />
                  <AvatarFallback className="bg-gradient-to-br from-[#7DD3C0] to-[#6BC4AD] text-white text-2xl">
                    {profile.full_name?.charAt(0) || profile.email?.charAt(0) || "U"}
                  </AvatarFallback>
                </Avatar>
                
                <label htmlFor="avatar-upload">
                  <div className="absolute bottom-0 right-0 w-8 h-8 bg-white rounded-full shadow-lg flex items-center justify-center cursor-pointer hover:bg-gray-50 transition-colors border-2 border-[#7DD3C0]">
                    {uploading ? (
                      <div className="w-4 h-4 border-2 border-[#7DD3C0] border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <Camera className="w-4 h-4 text-[#7DD3C0]" />
                    )}
                  </div>
                  <input
                    id="avatar-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleAvatarUpload}
                    disabled={uploading}
                  />
                </label>
              </div>

              {/* Profile Info */}
              {editing ? (
                <div className="w-full space-y-4">
                  <div>
                    <Label htmlFor="full_name" className="text-sm font-jakarta">Full Name</Label>
                    <Input
                      id="full_name"
                      value={editedProfile.full_name}
                      onChange={(e) => setEditedProfile({ ...editedProfile, full_name: e.target.value })}
                      className="font-jakarta"
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={handleSaveProfile}
                      className="flex-1 bg-gradient-to-r from-[#7DD3C0] to-[#6BC4AD] hover:opacity-90 font-jakarta"
                    >
                      <Check className="w-4 h-4 mr-2" />
                      Save
                    </Button>
                    <Button
                      onClick={() => {
                        setEditing(false);
                        setEditedProfile({
                          full_name: profile.full_name,
                          phone: profile.phone,
                        });
                      }}
                      variant="outline"
                      className="flex-1 font-jakarta"
                    >
                      <X className="w-4 h-4 mr-2" />
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <h2 className="text-xl font-bold text-gray-900 font-jakarta mb-1">
                    {profile.full_name || "Set your name"}
                  </h2>
                  
                  <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                    <Mail className="w-4 h-4" />
                    <span className="font-jakarta">{profile.email}</span>
                  </div>

                  {profile.phone && (
                    <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
                      <Phone className="w-4 h-4" />
                      <span className="font-jakarta">{profile.phone}</span>
                    </div>
                  )}

                  <Button
                    onClick={() => setEditing(true)}
                    variant="outline"
                    className="mt-2 font-jakarta"
                  >
                    <Edit2 className="w-4 h-4 mr-2" />
                    Edit Profile
                  </Button>
                </>
              )}
            </div>
          </Card>
        </div>

        {/* Menu Items */}
        <div className="px-4 mt-6 space-y-2">
          {menuItems.map((item, index) => (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card
                className="p-4 cursor-pointer hover:shadow-md transition-shadow"
                onClick={item.onClick}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                      <item.icon className="w-5 h-5 text-gray-700" />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 font-jakarta">{item.label}</h3>
                      <p className="text-xs text-gray-500 font-jakarta">{item.description}</p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </div>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Logout Button */}
        <div className="px-4 mt-6">
          <Button
            onClick={() => setShowLogoutDialog(true)}
            variant="outline"
            className="w-full border-red-200 text-red-600 hover:bg-red-50 font-jakarta font-bold"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>

        {/* App Version */}
        <div className="text-center mt-6 pb-4">
          <p className="text-xs text-gray-400 font-jakarta">Petid v1.0.0</p>
        </div>

        {/* Logout Confirmation Dialog */}
        <AlertDialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="font-jakarta">Logout</AlertDialogTitle>
              <AlertDialogDescription className="font-jakarta">
                Are you sure you want to logout? You'll need to sign in again to access your account.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="font-jakarta">Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleLogout}
                className="bg-red-600 hover:bg-red-700 font-jakarta"
              >
                Logout
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <BottomNav />
      </div>
    </PageTransition>
  );
};

export default Profile;