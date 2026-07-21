import { ChangeEvent, FormEvent, useEffect, useRef, useState } from "react";
import {
  Bookmark,
  Camera,
  Heart,
  Loader2,
  MapPin,
  MessageCircle,
  MoreHorizontal,
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
import { PetidLogo } from "@/components/PetidLogo";
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

  return (
    <main className="min-h-screen bg-mipo-soft pb-24" dir="rtl">
      <div className="mipo-shell min-h-screen bg-mipo-soft pb-20">
        <header className="sticky top-0 z-sticky flex items-center justify-between border-b border-mipo-line/60 bg-mipo-surface/90 px-5 py-3 backdrop-blur-xl">
          <button onClick={() => navigate("/profile")} className="mipo-icon-button" aria-label="פרופיל משתמש">
            <UserRound className="h-5 w-5" strokeWidth={1.7} />
          </button>
          <PetidLogo variant="horizontal" size="sm" showAnimals={false} />
          <button onClick={() => setComposerOpen(true)} className="mipo-icon-button" aria-label="יצירת פוסט">
            <Plus className="h-5 w-5" />
          </button>
        </header>

        <section className="border-b border-mipo-line/60 bg-mipo-surface px-4 py-4">
          <div className="flex gap-4 overflow-x-auto scrollbar-hide">
            <button onClick={() => setComposerOpen(true)} className="flex shrink-0 flex-col items-center gap-1.5">
              <span className="relative flex h-16 w-16 items-center justify-center rounded-full border border-dashed border-mipo-muted/40 bg-mipo-soft">
                <Plus className="h-6 w-6 text-mipo-ink" />
              </span>
              <span className="text-[11px] font-medium text-mipo-muted">הרגע שלך</span>
            </button>
            {pets.map((pet) => (
              <button key={pet.id} onClick={() => navigate(`/pet-profile/${pet.id}`)} className="flex shrink-0 flex-col items-center gap-1.5">
                <span className="mipo-gradient-ring">
                  <img src={pet.avatar_url || defaultPetAvatar} alt={pet.name} className="h-[58px] w-[58px] rounded-full border-[3px] border-white object-cover" />
                </span>
                <span className="max-w-16 truncate text-[11px] font-medium text-mipo-ink">{pet.name}</span>
              </button>
            ))}
          </div>
        </section>

        {loading ? (
          <FeedLoading />
        ) : posts.length === 0 ? (
          <EmptyFeed onCreate={() => setComposerOpen(true)} />
        ) : (
          <section className="space-y-3 py-3">
            {posts.map((post) => (
              <article key={post.id} className="overflow-hidden border-y border-mipo-line/70 bg-mipo-surface sm:mx-3 sm:rounded-[1.5rem] sm:border">
                <div className="flex items-center gap-3 px-4 py-3">
                  <span className="mipo-gradient-ring p-[2px]">
                    <img
                      src={post.pet?.avatar_url || post.creator.avatar_url || defaultPetAvatar}
                      alt=""
                      className="h-10 w-10 rounded-full border-2 border-white object-cover"
                    />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-mipo-ink">
                      {post.pet?.name || post.creator.display_name}
                    </p>
                    <p className="flex items-center gap-1 truncate text-xs text-mipo-muted">
                      {post.location && <MapPin className="h-3 w-3" />}
                      {post.location || formatPostDate(post.published_at)}
                    </p>
                  </div>
                  <button className="mipo-icon-button mipo-icon-button--ghost" aria-label="אפשרויות פוסט">
                    <MoreHorizontal className="h-5 w-5" />
                  </button>
                </div>

                <div className="relative aspect-[4/5] overflow-hidden bg-mipo-soft-deep">
                  {post.media_type === "video" ? (
                    <video src={post.media_url} controls playsInline className="h-full w-full object-cover" />
                  ) : (
                    <img src={post.media_url} alt={post.caption || "רגע מהקהילה"} className="h-full w-full object-cover" />
                  )}
                </div>

                <div className="px-4 pb-4 pt-3">
                  <div className="flex items-center gap-1">
                    <ActionButton label="אהבתי" onClick={() => void handleLike(post)} active={post.viewer_has_liked}>
                      <Heart className={cn("h-[22px] w-[22px]", post.viewer_has_liked && "fill-mipo-coral text-mipo-coral")} />
                    </ActionButton>
                    <ActionButton label="תגובות" onClick={() => setCommentsPost(post)}>
                      <MessageCircle className="h-[22px] w-[22px]" />
                    </ActionButton>
                    <ActionButton label="שיתוף" onClick={() => void navigator.share?.({ title: "Mipo", url: `${window.location.origin}/post/${post.id}` })}>
                      <Send className="h-[21px] w-[21px]" />
                    </ActionButton>
                    <div className="flex-1" />
                    <ActionButton label="שמירה" onClick={() => void handleSave(post)} active={post.viewer_has_saved}>
                      <Bookmark className={cn("h-[22px] w-[22px]", post.viewer_has_saved && "fill-mipo-ink")} />
                    </ActionButton>
                  </div>
                  {post.reaction_count > 0 && (
                    <p className="mt-2 text-sm font-semibold text-mipo-ink">{post.reaction_count.toLocaleString("he-IL")} אהבו</p>
                  )}
                  {post.caption && (
                    <p className="mt-1.5 text-sm leading-6 text-mipo-ink">
                      <strong>{post.pet?.name || post.creator.display_name}</strong>{" "}{post.caption}
                    </p>
                  )}
                  {post.poll_question && (
                    <Poll post={post} onVote={(index) => void handleVote(post, index)} />
                  )}
                  {post.allow_comments && (
                    <button onClick={() => setCommentsPost(post)} className="mt-2 inline-flex min-h-11 items-center text-sm text-mipo-muted">
                      {post.comment_count > 0 ? `הצגת כל ${post.comment_count} התגובות` : "הוספת תגובה"}
                    </button>
                  )}
                </div>
              </article>
            ))}
          </section>
        )}
      </div>

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

const ActionButton = ({ children, label, onClick, active }: { children: React.ReactNode; label: string; onClick: () => void; active?: boolean }) => (
  <button onClick={onClick} aria-label={label} aria-pressed={active} className="flex min-h-11 min-w-11 items-center justify-center rounded-full text-mipo-ink active:scale-90">
    {children}
  </button>
);

const Poll = ({ post, onVote }: { post: MipoSocialPost; onVote: (index: number) => void }) => {
  const total = post.poll_results.reduce((sum, count) => sum + count, 0);
  return (
    <div className="mt-3 rounded-2xl bg-mipo-soft p-3">
      <p className="mb-2 text-sm font-semibold text-mipo-ink">{post.poll_question}</p>
      <div className="space-y-2">
        {post.poll_options.map((option, index) => {
          const count = post.poll_results[index] || 0;
          const percent = total ? Math.round((count / total) * 100) : 0;
          return (
            <button key={option} onClick={() => onVote(index)} className="relative flex min-h-11 w-full overflow-hidden rounded-xl border border-mipo-line/80 bg-mipo-surface px-3 text-right text-sm">
              <span className="absolute inset-y-0 right-0 bg-mipo-blue/15" style={{ width: `${percent}%` }} />
              <span className="relative flex w-full items-center justify-between">
                <span className={cn(post.viewer_poll_option === index && "font-semibold")}>{option}</span>
                {total > 0 && <span className="text-xs text-mipo-muted">{percent}%</span>}
              </span>
            </button>
          );
        })}
      </div>
    </div>
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
  <div className="space-y-3 py-3">
    {[0, 1].map((item) => (
      <div key={item} className="animate-pulse bg-white sm:mx-3 sm:rounded-3xl">
        <div className="flex items-center gap-3 p-4"><div className="h-10 w-10 rounded-full bg-mipo-soft" /><div className="h-4 w-28 rounded bg-mipo-soft" /></div>
        <div className="aspect-[4/5] bg-mipo-soft-deep" />
        <div className="m-4 h-4 w-36 rounded bg-mipo-soft" />
      </div>
    ))}
  </div>
);

const EmptyFeed = ({ onCreate }: { onCreate: () => void }) => (
  <div className="px-6 py-20 text-center">
    <div className="mipo-gradient-ring mx-auto w-fit p-[3px]">
      <span className="flex h-20 w-20 items-center justify-center rounded-full bg-white"><Video className="h-8 w-8 text-mipo-ink" /></span>
    </div>
    <h1 className="mt-6 text-2xl font-semibold text-mipo-ink">הפיד מתחיל ברגע אחד</h1>
    <p className="mx-auto mt-2 max-w-xs text-sm leading-6 text-mipo-muted">שתפו תמונה או סרטון, תייגו את חיית המחמד והתחילו את הקהילה של Mipo.</p>
    <button onClick={onCreate} className="mipo-gradient-button mt-6 px-6"><Camera className="h-5 w-5" />יצירת הרגע הראשון</button>
  </div>
);

const formatPostDate = (value: string) => new Intl.DateTimeFormat("he-IL", { day: "numeric", month: "short" }).format(new Date(value));

export default MipoFeed;
