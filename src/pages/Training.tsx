import { useState, useEffect } from "react";
import { Search, Star, MapPin, Phone, Mail, Award, Clock, Users, BookOpen, ThumbsUp, Play, Filter, ChevronLeft } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import BottomNav from "@/components/BottomNav";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { AppHeader } from "@/components/AppHeader";

interface Trainer {
  id: string;
  name: string;
  specialty: string | null;
  bio: string | null;
  experience_years: number | null;
  city: string;
  phone: string | null;
  email: string | null;
  rating: number | null;
  total_reviews: number;
  price_per_session: number | null;
  avatar_url: string | null;
  is_certified: boolean;
}

interface Course {
  id: string;
  trainer_id: string;
  title: string;
  description: string | null;
  duration_weeks: number | null;
  sessions_per_week: number | null;
  price: number | null;
  level: string | null;
  max_participants: number | null;
}

interface Tip {
  id: string;
  title: string;
  content: string;
  category: string | null;
  difficulty: string | null;
  views: number;
  likes: number;
}

interface Video {
  id: string;
  title: string;
  description: string | null;
  video_url: string;
  thumbnail_url: string | null;
  duration_minutes: number | null;
  category: string | null;
  views: number;
  likes: number;
}

const Training = () => {
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [tips, setTips] = useState<Tip[]>([]);
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCity, setSelectedCity] = useState<string>("all");
  const [selectedTab, setSelectedTab] = useState("trainers");
  const { toast } = useToast();

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      
      const [trainersData, coursesData, tipsData, videosData] = await Promise.all([
        supabase.from("trainers").select("*").eq("is_active", true).order("rating", { ascending: false }),
        supabase.from("training_courses").select("*").eq("is_active", true),
        supabase.from("training_tips").select("*").order("published_at", { ascending: false }).limit(10),
        supabase.from("training_videos").select("*").order("published_at", { ascending: false }).limit(10)
      ]);

      if (trainersData.error) throw trainersData.error;
      if (coursesData.error) throw coursesData.error;
      if (tipsData.error) throw tipsData.error;
      if (videosData.error) throw videosData.error;

      setTrainers(trainersData.data || []);
      setCourses(coursesData.data || []);
      setTips(tipsData.data || []);
      setVideos(videosData.data || []);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast({
        title: "שגיאה בטעינת נתונים",
        description: "לא הצלחנו לטעון את הנתונים. נסה שוב מאוחר יותר.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredTrainers = trainers.filter(trainer => {
    const matchesSearch = searchQuery === "" || 
      trainer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      trainer.specialty?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCity = selectedCity === "all" || trainer.city === selectedCity;
    return matchesSearch && matchesCity;
  });

  const cities = Array.from(new Set(trainers.map(t => t.city))).sort();

  const getLevelLabel = (level: string | null) => {
    switch (level) {
      case "beginner": return "מתחילים";
      case "intermediate": return "בינוני";
      case "advanced": return "מתקדמים";
      default: return "כל הרמות";
    }
  };

  const getDifficultyBadge = (difficulty: string | null) => {
    switch (difficulty) {
      case "easy": return { label: "קל", color: "bg-green-100 text-green-800" };
      case "medium": return { label: "בינוני", color: "bg-amber-100 text-amber-800" };
      case "hard": return { label: "קשה", color: "bg-red-100 text-red-800" };
      default: return { label: "כל הרמות", color: "bg-gray-100 text-gray-800" };
    }
  };

  return (
    <div className="min-h-screen bg-muted pb-20" dir="rtl">
      <AppHeader 
        title="אילוף כלבים" 
        showBackButton={true}
        showMenuButton={false}
      />
      
      <div className="px-4 pt-4">
        {/* Search Bar */}
        <div className="relative mb-4">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            placeholder="חיפוש מאלפים, קורסים או טיפים..."
            className="pr-10 rounded-full bg-card border-border text-foreground placeholder:text-muted-foreground focus:bg-card"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Tabs */}
        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 bg-muted rounded-full p-1">
            <TabsTrigger value="trainers" className="rounded-full data-[state=active]:bg-card data-[state=active]:shadow-sm">
              מאלפים
            </TabsTrigger>
            <TabsTrigger value="courses" className="rounded-full data-[state=active]:bg-card data-[state=active]:shadow-sm">
              קורסים
            </TabsTrigger>
            <TabsTrigger value="tips" className="rounded-full data-[state=active]:bg-card data-[state=active]:shadow-sm">
              טיפים
            </TabsTrigger>
            <TabsTrigger value="videos" className="rounded-full data-[state=active]:bg-card data-[state=active]:shadow-sm">
              סרטונים
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Content */}
      <div className="px-6 py-4">
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            <p className="text-gray-600 mt-2 font-jakarta">טוען...</p>
          </div>
        ) : (
          <Tabs value={selectedTab} className="w-full">
            {/* Trainers Tab */}
            <TabsContent value="trainers" className="space-y-4 mt-0">
              {/* City Filter */}
              <div className="flex items-center gap-2 mb-4">
                <Select value={selectedCity} onValueChange={setSelectedCity}>
                  <SelectTrigger className="w-40 rounded-full bg-white border-gray-200 text-gray-900">
                    <SelectValue placeholder="עיר" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">כל הערים</SelectItem>
                    {cities.map((city) => (
                      <SelectItem key={city} value={city}>{city}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-sm text-gray-600">
                  נמצאו {filteredTrainers.length} מאלפים
                </p>
              </div>

              {filteredTrainers.length === 0 ? (
                <p className="text-center text-gray-500 py-8">לא נמצאו מאלפים</p>
              ) : (
                filteredTrainers.map((trainer) => (
                  <Card key={trainer.id} className="overflow-hidden bg-white border-gray-200 hover:shadow-lg transition-shadow rounded-2xl">
                    <div className="p-5">
                      <div className="flex items-start gap-4 mb-4">
                        <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                          {trainer.avatar_url ? (
                            <img src={trainer.avatar_url} alt={trainer.name} className="w-full h-full rounded-full object-cover" />
                          ) : (
                            <Award className="w-8 h-8 text-gray-500" />
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-bold text-xl text-gray-900 font-jakarta">{trainer.name}</h3>
                            {trainer.is_certified && (
                              <Badge className="bg-blue-100 text-blue-800 rounded-full text-xs">
                                <Award className="w-3 h-3 ml-1" />
                                מוסמך
                              </Badge>
                            )}
                          </div>
                          {trainer.specialty && (
                            <p className="text-sm text-gray-600 mb-2">{trainer.specialty}</p>
                          )}
                          <div className="flex items-center gap-3 text-sm text-gray-600">
                            <div className="flex items-center gap-1">
                              <MapPin className="w-4 h-4" />
                              <span>{trainer.city}</span>
                            </div>
                            {trainer.experience_years && (
                              <div className="flex items-center gap-1">
                                <Clock className="w-4 h-4" />
                                <span>{trainer.experience_years} שנות ניסיון</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {trainer.bio && (
                        <p className="text-sm text-gray-700 mb-4 bg-gray-50 p-3 rounded-lg">{trainer.bio}</p>
                      )}

                      <div className="flex items-center justify-between mb-4">
                        {trainer.rating && trainer.rating > 0 ? (
                          <div className="flex items-center gap-1">
                            <Star className="w-5 h-5 fill-amber-400 text-amber-400" />
                            <span className="font-bold text-gray-900">{trainer.rating.toFixed(1)}</span>
                            <span className="text-sm text-gray-500">({trainer.total_reviews} ביקורות)</span>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-500">אין ביקורות</span>
                        )}
                        {trainer.price_per_session && (
                          <div className="text-left">
                            <p className="text-2xl font-bold text-gray-900">₪{trainer.price_per_session}</p>
                            <p className="text-xs text-gray-500">למפגש</p>
                          </div>
                        )}
                      </div>

                      <div className="flex gap-2">
                        {trainer.phone && (
                          <Button className="flex-1 bg-gray-900 hover:bg-gray-800 text-white rounded-full">
                            <Phone className="w-4 h-4 ml-2" />
                            התקשר
                          </Button>
                        )}
                        {trainer.email && (
                          <Button variant="outline" className="flex-1 border-gray-300 text-gray-900 rounded-full hover:bg-gray-100">
                            <Mail className="w-4 h-4 ml-2" />
                            שלח מייל
                          </Button>
                        )}
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </TabsContent>

            {/* Courses Tab */}
            <TabsContent value="courses" className="space-y-4 mt-0">
              {courses.length === 0 ? (
                <p className="text-center text-gray-500 py-8">אין קורסים זמינים</p>
              ) : (
                courses.map((course) => (
                  <Card key={course.id} className="overflow-hidden bg-white border-gray-200 hover:shadow-lg transition-shadow rounded-2xl">
                    <div className="p-5">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h3 className="font-bold text-xl text-gray-900 mb-1 font-jakarta">{course.title}</h3>
                          {course.level && (
                            <Badge className="bg-purple-100 text-purple-800 rounded-full">
                              {getLevelLabel(course.level)}
                            </Badge>
                          )}
                        </div>
                        {course.price && (
                          <div className="text-left">
                            <p className="text-2xl font-bold text-gray-900">₪{course.price}</p>
                            <p className="text-xs text-gray-500">לקורס</p>
                          </div>
                        )}
                      </div>

                      {course.description && (
                        <p className="text-sm text-gray-700 mb-4">{course.description}</p>
                      )}

                      <div className="flex flex-wrap gap-3 mb-4">
                        {course.duration_weeks && (
                          <div className="flex items-center gap-1 text-sm text-gray-700 bg-gray-50 px-3 py-1 rounded-full">
                            <Clock className="w-4 h-4" />
                            <span>{course.duration_weeks} שבועות</span>
                          </div>
                        )}
                        {course.sessions_per_week && (
                          <div className="flex items-center gap-1 text-sm text-gray-700 bg-gray-50 px-3 py-1 rounded-full">
                            <BookOpen className="w-4 h-4" />
                            <span>{course.sessions_per_week} מפגשים/שבוע</span>
                          </div>
                        )}
                        {course.max_participants && (
                          <div className="flex items-center gap-1 text-sm text-gray-700 bg-gray-50 px-3 py-1 rounded-full">
                            <Users className="w-4 h-4" />
                            <span>עד {course.max_participants} משתתפים</span>
                          </div>
                        )}
                      </div>

                      <Button className="w-full bg-gray-900 hover:bg-gray-800 text-white rounded-full">
                        הרשמה לקורס
                      </Button>
                    </div>
                  </Card>
                ))
              )}
            </TabsContent>

            {/* Tips Tab */}
            <TabsContent value="tips" className="space-y-4 mt-0">
              <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-5 mb-4">
                <h3 className="font-bold text-lg text-gray-900 mb-2 font-jakarta">💡 טיפים שבועיים לאימון</h3>
                <p className="text-sm text-gray-700">למד טכניקות חדשות ושפר את האילוף של הכלב שלך</p>
              </div>

              {tips.length === 0 ? (
                <p className="text-center text-gray-500 py-8">אין טיפים זמינים</p>
              ) : (
                tips.map((tip) => (
                  <Card key={tip.id} className="overflow-hidden bg-white border-gray-200 hover:shadow-lg transition-shadow rounded-2xl cursor-pointer">
                    <div className="p-5">
                      <div className="flex items-start justify-between mb-3">
                        <h3 className="font-bold text-lg text-gray-900 flex-1 font-jakarta">{tip.title}</h3>
                        {tip.difficulty && (
                          <Badge className={`${getDifficultyBadge(tip.difficulty).color} rounded-full`}>
                            {getDifficultyBadge(tip.difficulty).label}
                          </Badge>
                        )}
                      </div>

                      {tip.category && (
                        <Badge variant="outline" className="mb-3 rounded-full bg-gray-50 border-gray-300">
                          {tip.category}
                        </Badge>
                      )}

                      <p className="text-sm text-gray-700 mb-4 line-clamp-3">{tip.content}</p>

                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <div className="flex items-center gap-1">
                          <ThumbsUp className="w-4 h-4" />
                          <span>{tip.likes}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span>{tip.views.toLocaleString()} צפיות</span>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </TabsContent>

            {/* Videos Tab */}
            <TabsContent value="videos" className="space-y-4 mt-0">
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-5 mb-4">
                <h3 className="font-bold text-lg text-gray-900 mb-2 font-jakarta">🎥 סרטוני הדרכה</h3>
                <p className="text-sm text-gray-700">צפה ולמד טכניקות אילוף מהמומחים</p>
              </div>

              {videos.length === 0 ? (
                <p className="text-center text-gray-500 py-8">אין סרטונים זמינים</p>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {videos.map((video) => (
                    <Card key={video.id} className="overflow-hidden bg-white border-gray-200 hover:shadow-lg transition-shadow rounded-2xl cursor-pointer">
                      <div className="relative aspect-video bg-gray-200 flex items-center justify-center">
                        <div className="absolute inset-0 bg-gradient-to-br from-gray-900/50 to-gray-900/30 flex items-center justify-center">
                          <div className="w-16 h-16 rounded-full bg-white/90 flex items-center justify-center">
                            <Play className="w-8 h-8 text-gray-900 mr-1" />
                          </div>
                        </div>
                        {video.duration_minutes && (
                          <div className="absolute bottom-2 left-2 bg-black/80 text-white text-xs px-2 py-1 rounded">
                            {video.duration_minutes} דק'
                          </div>
                        )}
                      </div>
                      <div className="p-4">
                        <h3 className="font-bold text-lg text-gray-900 mb-1 font-jakarta">{video.title}</h3>
                        {video.category && (
                          <Badge variant="outline" className="mb-2 rounded-full bg-gray-50 border-gray-300 text-xs">
                            {video.category}
                          </Badge>
                        )}
                        {video.description && (
                          <p className="text-sm text-gray-600 mb-3 line-clamp-2">{video.description}</p>
                        )}
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <div className="flex items-center gap-1">
                            <ThumbsUp className="w-4 h-4" />
                            <span>{video.likes}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span>{video.views.toLocaleString()} צפיות</span>
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default Training;
