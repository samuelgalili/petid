/**
 * DashboardContentInsights — Content performance, AI content status, SEO health, data quality, breed reports.
 * Items 11-15 of admin enhancement plan.
 */

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  FileText,
  Eye,
  Sparkles,
  Search,
  Database,
  PawPrint,
  AlertTriangle,
  CheckCircle,
  Loader2,
  BarChart3,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

export const DashboardContentInsights = () => {
  const [loading, setLoading] = useState(true);
  const [blogStats, setBlogStats] = useState({ total: 0, published: 0, draft: 0, totalViews: 0 });
  const [seoIssues, setSeoIssues] = useState({ noMeta: 0, noImage: 0, duplicateSlugs: 0 });
  const [dataQuality, setDataQuality] = useState({ noIngredients: 0, noFeedingGuide: 0, noDescription: 0, total: 0 });
  const [breedStats, setBreedStats] = useState({ total: 0, topBreeds: [] as { name: string; count: number }[] });
  const [aiPosts, setAiPosts] = useState(0);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);

      const [blogRes, productsRes, breedsRes, petsRes] = await Promise.all([
        supabase.from("blog_posts").select("id, status, view_count, meta_description, featured_image, slug"),
        supabase.from("business_products").select("id, ingredients, feeding_guide, description"),
        supabase.from("breed_information").select("id, breed_name, breed_name_he"),
        supabase.from("pets").select("breed").not("breed", "is", null),
      ]);

      const blogs = blogRes.data || [];
      const products = productsRes.data || [];
      const breeds = breedsRes.data || [];
      const pets = petsRes.data || [];

      // Blog stats
      setBlogStats({
        total: blogs.length,
        published: blogs.filter((b) => b.status === "published").length,
        draft: blogs.filter((b) => b.status === "draft").length,
        totalViews: blogs.reduce((sum, b) => sum + (b.view_count || 0), 0),
      });

      // SEO issues
      const noMeta = blogs.filter((b) => !b.meta_description).length;
      const noImage = blogs.filter((b) => !b.featured_image).length;
      const slugMap = new Map<string, number>();
      blogs.forEach((b) => slugMap.set(b.slug, (slugMap.get(b.slug) || 0) + 1));
      const duplicateSlugs = Array.from(slugMap.values()).filter((c) => c > 1).length;
      setSeoIssues({ noMeta, noImage, duplicateSlugs });

      // Data quality
      setDataQuality({
        total: products.length,
        noIngredients: products.filter((p) => !p.ingredients).length,
        noFeedingGuide: products.filter((p) => !p.feeding_guide).length,
        noDescription: products.filter((p) => !p.description).length,
      });

      // Breed stats
      const breedCount = new Map<string, number>();
      pets.forEach((p) => {
        if (p.breed) breedCount.set(p.breed, (breedCount.get(p.breed) || 0) + 1);
      });
      const topBreeds = Array.from(breedCount.entries())
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      setBreedStats({ total: breeds.length, topBreeds });
      setAiPosts((aiPostsRes.data || []).length);
    } catch (err) {
      console.error("Content insights error:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="border-slate-200">
        <CardContent className="flex items-center justify-center py-10">
          <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
        </CardContent>
      </Card>
    );
  }

  const qualityScore = dataQuality.total > 0
    ? Math.round(
        ((dataQuality.total - dataQuality.noIngredients - dataQuality.noFeedingGuide - dataQuality.noDescription) /
          (dataQuality.total * 3)) * 100
      )
    : 100;

  const seoScore = blogStats.total > 0
    ? Math.round(((blogStats.total - seoIssues.noMeta - seoIssues.noImage) / (blogStats.total * 2)) * 100)
    : 100;

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
        <FileText className="w-5 h-5 text-orange-500" />
        Content & Data Insights
      </h2>

      {/* Content Performance */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {[
          { label: "Blog Posts", value: blogStats.total, icon: "📝" },
          { label: "Published", value: blogStats.published, icon: "✅" },
          { label: "Total Views", value: blogStats.totalViews, icon: "👁️" },
          { label: "AI Posts", value: aiPosts, icon: "🤖" },
        ].map((s) => (
          <Card key={s.label} className="border-slate-200">
            <CardContent className="p-3 text-center">
              <span className="text-lg">{s.icon}</span>
              <p className="text-xl font-bold text-slate-800 mt-1">{s.value}</p>
              <p className="text-[10px] text-slate-500">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {/* SEO Health */}
        <Card className="border-slate-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <Search className="w-4 h-4 text-sky-500" />
              SEO Health
              <Badge className={cn(
                "text-[10px] border-0 ml-auto",
                seoScore >= 80 ? "bg-emerald-50 text-emerald-600" : seoScore >= 50 ? "bg-amber-50 text-amber-600" : "bg-red-50 text-red-600"
              )}>{seoScore}%</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">Missing meta descriptions</span>
              <span className={cn("font-semibold", seoIssues.noMeta > 0 ? "text-amber-600" : "text-emerald-600")}>{seoIssues.noMeta}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Missing featured images</span>
              <span className={cn("font-semibold", seoIssues.noImage > 0 ? "text-amber-600" : "text-emerald-600")}>{seoIssues.noImage}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Duplicate slugs</span>
              <span className={cn("font-semibold", seoIssues.duplicateSlugs > 0 ? "text-red-600" : "text-emerald-600")}>{seoIssues.duplicateSlugs}</span>
            </div>
          </CardContent>
        </Card>

        {/* Data Quality */}
        <Card className="border-slate-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <Database className="w-4 h-4 text-violet-500" />
              Product Data Quality
              <Badge className={cn(
                "text-[10px] border-0 ml-auto",
                qualityScore >= 80 ? "bg-emerald-50 text-emerald-600" : qualityScore >= 50 ? "bg-amber-50 text-amber-600" : "bg-red-50 text-red-600"
              )}>{qualityScore}%</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">Missing ingredients</span>
              <span className={cn("font-semibold", dataQuality.noIngredients > 0 ? "text-amber-600" : "text-emerald-600")}>{dataQuality.noIngredients}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Missing feeding guide</span>
              <span className={cn("font-semibold", dataQuality.noFeedingGuide > 0 ? "text-amber-600" : "text-emerald-600")}>{dataQuality.noFeedingGuide}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Missing description</span>
              <span className={cn("font-semibold", dataQuality.noDescription > 0 ? "text-amber-600" : "text-emerald-600")}>{dataQuality.noDescription}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Breeds */}
      {breedStats.topBreeds.length > 0 && (
        <Card className="border-slate-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <PawPrint className="w-4 h-4 text-orange-500" />
              Most Popular Breeds
              <Badge variant="outline" className="text-[10px] ml-auto">{breedStats.total} in DB</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {breedStats.topBreeds.map((b, idx) => (
              <div key={idx} className="flex items-center justify-between text-sm">
                <span className="text-slate-600">{b.name}</span>
                <div className="flex items-center gap-2">
                  <div className="w-20 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-orange-400"
                      style={{ width: `${(b.count / (breedStats.topBreeds[0]?.count || 1)) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs font-semibold text-slate-500 w-8 text-right">{b.count}</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
};
