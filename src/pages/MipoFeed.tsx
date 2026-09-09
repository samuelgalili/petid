import { ChangeEvent, FormEvent, useEffect, useRef, useState } from "react";
import {
  Camera,
  Loader2,
  MapPin,
  Plus,
  Send,
  Sparkles,
  UserRound,
  Video,
  X,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";

import defaultPetAvatar from "@/assets/default-pet-avatar.png";
import { MipoLogo } from "@/components/MipoLogo";
import { MomentReel } from "@/components/moments/MomentReel";
import { usePetPreference } from "@/contexts/PetPreferenceContext";
import { useToast } from "@/hooks/use-toast";
import {
  createSocialComment,
  createSocialPost,
  getSocialComments,
  getSocialFeed,
  toggleSocialReaction,
  toggleSocialSave,
  uploadSocialMedia,
  voteSocialPoll,
  type MipoSocialComment,
  type MipoSocialPost,
} from "@/lib/mipoApi";
import { cn } from "@/lib/utils";

const MipoFeed = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { activePet, pets } = usePetPreference();
  const [posts, setPosts] = useState<MipoSocialPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [composerOpen, setComposerOpen] = useState(false);
  const [commentsPost, setCommentsPost] = useState<MipoSocialPost | null>(null);

  const loadFeed = async () => {
    try {
      setLoading(true);
      setPosts(await getSocialFeed({ limit: 30 }));
    } catch (error) {
      toast({
        title: "הפיד לא נטען",
        description: error instanceof Error ? error.message : "נסו שוב בעוד רגע",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadFeed();
  }, []);

  const updatePost = (postId: string, update: (post: MipoSocialPost) => MipoSocialPost) => {
    setPosts((current) => current.map((post) => post.id === postId ? update(post) : post));
  };

  const handleLike = async (post: MipoSocialPost) => {
    updatePost(post.id, (current) => ({
      ...current,
      viewer_has_liked: !current.viewer_has_liked,
      reaction_count: Math.max(0, current.reaction_count + (current.viewer_has_liked ? -1 : 1)),
    }));
    try {
      const result = await toggleSocialReaction(post.id);
      updatePost(post.id, (current) => ({ ...current, viewer_has_liked: result.liked, reaction_count: result.count }));
    } catch {
      updatePost(post.id, () => post);
    }
  };

  const handleSave = async (post: MipoSocialPost) => {
    updatePost(post.id, (current) => ({ ...current, viewer_has_saved: !current.viewer_has_saved }));
    try {
      const result = await toggleSocialSave(post.id);
      updatePost(post.id, (current) => ({ ...current, viewer_has_saved: result.saved }));
    } catch {
      updatePost(post.id, () => post);
    }
  };

  const handleVote = async (post: MipoSocialPost, optionIndex: number) => {
    try {
      const updated = await voteSocialPoll(post.id, optionIndex);
      updatePost(post.id, () => updated);
    } catch (error) {
      toast({ title: "לא הצלחנו לשמור את הבחירה", variant: "destructive" });
    }
  };

  // Web Share is a phone API. On a desktop browser it is simply absent, so the
  // link is copied instead of the button appearing to do nothing.
  const sharePost = async (post: MipoSocialPost) => {
    const url = `${window.location.origin}/post/${post.id}`;
    if (navigator.share) {
      await navigator.share({ title: "Mipo", url }).catch(() => {});
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      toast({ title: "הקישור הועתק" });
    } catch {
      toast({ title: "לא הצלחנו להעתיק את הקישור", variant: "destructive" });
    }
  };

  return (
    <main className="relative bg-black" dir="rtl">
      {/* The header floats over the reel rather than taking a band from it:
          a full-screen Moment stops being full-screen the moment a bar of
          chrome sits above it. */}
      <header className="pointer-events-none absolute inset-x-0 top-0 z-sticky flex items-center justify-between px-5 pt-4">
        <button
          onClick={() => navigate("/profile")}
          className="pointer-events-auto flex h-11 w-11 items-center justify-center rounded-full bg-black/35 text-white backdrop-blur-sm"
          aria-label="פרופיל משתמש"
        >
          <UserRound className="h-5 w-5" strokeWidth={1.7} />
        </button>
        <MipoLogo variant="horizontal" size="sm" showAnimals={false} />
        <button
          onClick={() => setComposerOpen(true)}
          className="pointer-events-auto flex h-11 w-11 items-center justify-center rounded-full bg-black/35 text-white backdrop-blur-sm"
          aria-label="יצירת רגע"
        >
          <Plus className="h-5 w-5" />
        </button>
      </header>

      {loading ? (
        <FeedLoading />
      ) : posts.length === 0 ? (
        <EmptyFeed onCreate={() => setComposerOpen(true)} />
      ) : (
        <MomentReel
          posts={posts}
          onLike={(post) => void handleLike(post)}
          onSave={(post) => void handleSave(post)}
          onComments={(post) => setCommentsPost(post)}
          onShare={(post) => void sharePost(post)}
          onVote={(post, index) => void handleVote(post, index)}
          onRefresh={() => void loadFeed()}
        />
      )}

      <AnimatePresence>
        {composerOpen && (
          <PostComposer
            pets={pets}
            activePetId={activePet?.id || null}
            onClose={() => setComposerOpen(false)}
            onCreated={(post) => {
              setPosts((current) => [post, ...current]);
              setComposerOpen(false);
            }}
          />
        )}
        {commentsPost && (
          <CommentsSheet
            post={commentsPost}
            onClose={() => setCommentsPost(null)}
            onCountChange={(count) => updatePost(commentsPost.id, (post) => ({ ...post, comment_count: count }))}
          />
        )}
      </AnimatePresence>
    </main>
  );
};



const PostComposer = ({ pets, activePetId, onClose, onCreated }: {
  pets: Array<{ id: string; name: string }>;
  activePetId: string | null;
  onClose: () => void;
  onCreated: (post: MipoSocialPost) => void;
}) => {
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [caption, setCaption] = useState("");
  const [location, setLocation] = useState("");
  const [petId, setPetId] = useState(activePetId || "");
  const [publishing, setPublishing] = useState(false);

  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview);
  }, [preview]);

  const selectFile = (event: ChangeEvent<HTMLInputElement>) => {
    const next = event.target.files?.[0];
    if (!next) return;
    if (preview) URL.revokeObjectURL(preview);
    setFile(next);
    setPreview(URL.createObjectURL(next));
  };

  const publish = async (event: FormEvent) => {
    event.preventDefault();
    if (!file) return;
    try {
      setPublishing(true);
      const upload = await uploadSocialMedia(file);
      onCreated(await createSocialPost({
        upload_id: upload.id,
        pet_id: petId || null,
        caption,
        location,
      }));
      toast({ title: "הרגע שלך פורסם ✨" });
    } catch (error) {
      toast({ title: "לא הצלחנו לפרסם", description: error instanceof Error ? error.message : undefined, variant: "destructive" });
    } finally {
      setPublishing(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-sheet flex items-end justify-center bg-black/35 backdrop-blur-sm sm:items-center" onMouseDown={(event) => event.currentTarget === event.target && onClose()}>
      <motion.form initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 80, opacity: 0 }} onSubmit={publish} className="w-full max-w-lg rounded-t-[2rem] bg-white p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] sm:rounded-[2rem]">
        <div className="flex items-center justify-between">
          <button type="button" onClick={onClose} className="mipo-icon-button"><X className="h-5 w-5" /></button>
          <h2 className="text-lg font-semibold text-mipo-ink">רגע חדש</h2>
          <button type="submit" disabled={!file || publishing} className="text-sm font-semibold text-mipo-ink disabled:opacity-40">
            {publishing ? "מפרסם…" : "פרסום"}
          </button>
        </div>

        <input ref={fileRef} type="file" accept="image/*,video/mp4,video/webm,video/quicktime" className="hidden" onChange={selectFile} />
        {preview ? (
          <button type="button" onClick={() => fileRef.current?.click()} className="mt-5 block aspect-[4/3] w-full overflow-hidden rounded-3xl bg-mipo-soft">
            {file?.type.startsWith("video/") ? <video src={preview} muted className="h-full w-full object-cover" /> : <img src={preview} alt="תצוגה מקדימה" className="h-full w-full object-cover" />}
          </button>
        ) : (
          <button type="button" onClick={() => fileRef.current?.click()} className="mt-5 flex aspect-[4/3] w-full flex-col items-center justify-center gap-3 rounded-3xl border border-dashed border-mipo-muted/30 bg-mipo-soft text-mipo-muted">
            <span className="mipo-gradient-ring p-[2px]"><span className="flex h-14 w-14 items-center justify-center rounded-full bg-white"><Camera className="h-6 w-6 text-mipo-ink" /></span></span>
            <span className="font-medium">בחירת תמונה או וידאו</span>
          </button>
        )}

        <textarea value={caption} onChange={(event) => setCaption(event.target.value)} maxLength={2000} placeholder="מה הסיפור של הרגע הזה?" className="mipo-input mt-4 min-h-24 w-full resize-none p-4 text-sm outline-none" />
        <div className="mt-3 grid grid-cols-2 gap-3">
          <label className="mipo-input flex min-h-12 items-center gap-2 px-3 text-sm text-mipo-muted">
            <MapPin className="h-4 w-4" />
            <input value={location} onChange={(event) => setLocation(event.target.value)} maxLength={160} placeholder="מיקום" className="min-w-0 flex-1 bg-transparent outline-none" />
          </label>
          <label className="mipo-input flex min-h-12 items-center gap-2 px-3 text-sm text-mipo-muted">
            <Sparkles className="h-4 w-4" />
            <select value={petId} onChange={(event) => setPetId(event.target.value)} className="min-w-0 flex-1 bg-transparent outline-none">
              <option value="">ללא תיוג</option>
              {pets.map((pet) => <option key={pet.id} value={pet.id}>{pet.name}</option>)}
            </select>
          </label>
        </div>
      </motion.form>
    </motion.div>
  );
};

const CommentsSheet = ({ post, onClose, onCountChange }: { post: MipoSocialPost; onClose: () => void; onCountChange: (count: number) => void }) => {
  const [comments, setComments] = useState<MipoSocialComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    getSocialComments(post.id).then(setComments).finally(() => setLoading(false));
  }, [post.id]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!body.trim()) return;
    try {
      setSending(true);
      const comment = await createSocialComment(post.id, body);
      const next = [...comments, comment];
      setComments(next);
      onCountChange(next.length);
      setBody("");
    } finally {
      setSending(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[11000] flex items-end justify-center bg-black/30" onMouseDown={(event) => event.currentTarget === event.target && onClose()}>
      <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} className="flex h-[75dvh] w-full max-w-lg flex-col rounded-t-[2rem] bg-white">
        <div className="flex items-center justify-between border-b border-black/[0.06] px-5 py-4">
          <button onClick={onClose} className="mipo-icon-button"><X className="h-5 w-5" /></button>
          <h2 className="font-semibold text-mipo-ink">תגובות</h2>
          <span className="w-11" />
        </div>
        <div className="flex-1 space-y-4 overflow-y-auto p-5">
          {loading ? <Loader2 className="mx-auto mt-8 h-6 w-6 animate-spin text-mipo-muted" /> : comments.length === 0 ? (
            <p className="mt-8 text-center text-sm text-mipo-muted">התגובה הראשונה יכולה להיות שלך.</p>
          ) : comments.map((comment) => (
            <div key={comment.id} className="flex gap-3">
              <img src={comment.creator.avatar_url || defaultPetAvatar} alt="" className="h-9 w-9 rounded-full object-cover" />
              <div className="rounded-2xl bg-mipo-soft px-3.5 py-2.5">
                <p className="text-xs font-semibold text-mipo-ink">{comment.creator.display_name}</p>
                <p className="mt-0.5 text-sm text-mipo-ink">{comment.body}</p>
              </div>
            </div>
          ))}
        </div>
        <form onSubmit={submit} className="flex gap-2 border-t border-black/[0.06] p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
          <input value={body} onChange={(event) => setBody(event.target.value)} maxLength={500} placeholder="כתיבת תגובה…" className="mipo-input min-h-12 min-w-0 flex-1 px-4 outline-none" />
          <button disabled={!body.trim() || sending} className="mipo-gradient-button h-12 min-h-12 w-12 p-0 disabled:opacity-40" aria-label="שליחת תגובה">
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </button>
        </form>
      </motion.div>
    </motion.div>
  );
};

const FeedLoading = () => (
  <div className="flex h-[calc(100dvh-68px-env(safe-area-inset-bottom))] animate-pulse flex-col justify-end bg-neutral-900 p-4">
    <div className="flex items-center gap-2.5">
      <div className="h-10 w-10 rounded-full bg-white/15" />
      <div className="h-4 w-28 rounded bg-white/15" />
    </div>
    <div className="mt-3 h-4 w-2/3 rounded bg-white/10" />
    <div className="mt-2 h-4 w-1/3 rounded bg-white/10" />
  </div>
);

const EmptyFeed = ({ onCreate }: { onCreate: () => void }) => (
  <div className="flex h-[calc(100dvh-68px-env(safe-area-inset-bottom))] flex-col items-center justify-center px-6 text-center">
    <div className="mipo-gradient-ring w-fit p-[3px]">
      <span className="flex h-20 w-20 items-center justify-center rounded-full bg-neutral-900"><Video className="h-8 w-8 text-white" /></span>
    </div>
    <h1 className="mt-6 text-2xl font-semibold text-white">הפיד מתחיל ברגע אחד</h1>
    <p className="mt-2 max-w-xs text-sm leading-6 text-white/70">שתפו תמונה או סרטון, תייגו את חיית המחמד והתחילו את הקהילה של Mipo.</p>
    <button onClick={onCreate} className="mipo-gradient-button mt-6 px-6"><Camera className="h-5 w-5" />יצירת הרגע הראשון</button>
  </div>
);


export default MipoFeed;
