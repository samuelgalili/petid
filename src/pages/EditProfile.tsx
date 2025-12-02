import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, User, Mail, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { ProfileImageEditor } from "@/components/ProfileImageEditor";

const EditProfile = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [fullName, setFullName] = useState("");
  const [bio, setBio] = useState("");
  const [isImageEditorOpen, setIsImageEditorOpen] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
    fetchProfile();
  }, [user]);

  const fetchProfile = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (data) {
      setProfile(data);
      setFullName(data.full_name || "");
      setBio(data.bio || "");
    }
  };

  const handleSave = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: fullName,
          bio: bio,
        })
        .eq("id", user.id);

      if (error) throw error;

      toast.success("הפרופיל עודכן בהצלחה");
      navigate(-1);
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error("שגיאה בעדכון הפרופיל");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white pb-24" dir="rtl">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10 px-4 py-4">
        <div className="flex items-center justify-between max-w-2xl mx-auto">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="rounded-full"
          >
            <ArrowRight className="w-6 h-6" />
          </Button>
          <h1 className="text-xl font-bold text-gray-900 font-jakarta">
            Edit profile
          </h1>
          <Button
            onClick={handleSave}
            disabled={loading}
            className="bg-[#0095F6] hover:bg-[#0082d9] text-white font-bold rounded-lg px-4"
          >
            {loading ? "Saving..." : "Done"}
          </Button>
        </div>
      </div>

      {/* Profile Content */}
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Avatar Section */}
        <div className="flex flex-col items-center mb-8">
          <div className="relative mb-4">
            <Avatar className="w-24 h-24">
              <AvatarImage src={profile?.avatar_url} />
              <AvatarFallback className="text-2xl bg-gray-200 text-gray-600 font-black">
                {fullName?.charAt(0) || "U"}
              </AvatarFallback>
            </Avatar>
            <button
              onClick={() => setIsImageEditorOpen(true)}
              className="absolute bottom-0 right-0 w-8 h-8 bg-[#0095F6] rounded-full flex items-center justify-center shadow-md border-2 border-white"
            >
              <Camera className="w-4 h-4 text-white" />
            </button>
          </div>
          <Button
            variant="ghost"
            onClick={() => setIsImageEditorOpen(true)}
            className="text-[#0095F6] font-semibold font-jakarta"
          >
            Change profile photo
          </Button>
        </div>

        {/* Form Fields */}
        <div className="space-y-6">
          {/* Name Field */}
          <div className="space-y-2">
            <Label htmlFor="name" className="text-sm font-medium text-gray-900 font-jakarta">
              Name
            </Label>
            <div className="relative">
              <User className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                id="name"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="pr-10 font-jakarta"
                placeholder="Your name"
              />
            </div>
          </div>

          {/* Email Field (Read-only) */}
          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-medium text-gray-900 font-jakarta">
              Email
            </Label>
            <div className="relative">
              <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                id="email"
                type="email"
                value={profile?.email || ""}
                disabled
                className="pr-10 font-jakarta bg-gray-50 text-gray-500"
              />
            </div>
            <p className="text-xs text-gray-500 font-jakarta">Email cannot be changed</p>
          </div>

          {/* Bio Field */}
          <div className="space-y-2">
            <Label htmlFor="bio" className="text-sm font-medium text-gray-900 font-jakarta">
              Bio
            </Label>
            <Textarea
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="min-h-[120px] font-jakarta resize-none"
              placeholder="Write something about yourself... You can use emojis! 🐕🐈"
              maxLength={150}
            />
            <div className="flex justify-between items-center">
              <p className="text-xs text-gray-500 font-jakarta">
                Make your profile stand out with emojis and a brief bio
              </p>
              <p className="text-xs text-gray-400 font-jakarta">
                {bio.length}/150
              </p>
            </div>
          </div>
        </div>

        {/* Tips Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-8 bg-gray-50 rounded-xl p-4 border border-gray-200"
        >
          <h3 className="text-sm font-bold text-gray-900 font-jakarta mb-2">
            Profile Tips
          </h3>
          <ul className="space-y-1 text-xs text-gray-600 font-jakarta">
            <li>• Use emojis to add personality to your bio 🐾</li>
            <li>• Keep your name clear and recognizable</li>
            <li>• Add a profile photo to help others find you</li>
            <li>• Share your interests and what you love about pets</li>
          </ul>
        </motion.div>
      </div>

      {/* Profile Image Editor */}
      <ProfileImageEditor
        isOpen={isImageEditorOpen}
        onClose={() => setIsImageEditorOpen(false)}
        currentImageUrl={profile?.avatar_url}
        onImageUpdated={(url) => {
          setProfile((prev: any) => ({ ...prev, avatar_url: url }));
        }}
      />
    </div>
  );
};

export default EditProfile;
