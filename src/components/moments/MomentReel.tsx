/**
 * MomentReel — the full-screen vertical feed.
 *
 * One Moment fills the viewport; a vertical swipe moves to the next. The format
 * is the one the product asked for; the engagement model deliberately is not.
 * Two differences from the apps this resembles, both intentional:
 *
 *   - Nothing loads forever. When the loaded Moments run out the reel ends with
 *     a card that says so and offers a refresh. An endless feed is the mechanic
 *     the brief rules out.
 *   - Video starts muted and only while it is the Moment on screen. Sound is
 *     something the viewer turns on, never something that happens to them.
 *
 * Photos are the common case in this catalogue and most of them are 4:5, which
 * a 9:16 frame would either crop through the subject or letterbox into two dead
 * bars. Neither happens here: the photo is contained whole, and the frame
 * behind it is filled with a blurred, darkened copy of the same image.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { Bookmark, Heart, MapPin, MessageCircle, Send, Volume2, VolumeX } from "lucide-react";

import defaultPetAvatar from "@/assets/default-pet-avatar.png";
import type { MipoSocialPost } from "@/lib/mipoApi";
import { cn } from "@/lib/utils";

interface MomentReelProps {
  posts: MipoSocialPost[];
  onLike: (post: MipoSocialPost) => void;
  onSave: (post: MipoSocialPost) => void;
  onComments: (post: MipoSocialPost) => void;
  onShare: (post: MipoSocialPost) => void;
  onVote: (post: MipoSocialPost, optionIndex: number) => void;
  onRefresh: () => void;
}

const formatCount = (value: number) => (
  value >= 1000 ? `${(value / 1000).toFixed(value >= 10000 ? 0 : 1)}K` : String(value)
);

export const MomentReel = ({
  posts, onLike, onSave, onComments, onShare, onVote, onRefresh,
}: MomentReelProps) => {
  // Muted is the default and it is remembered for the session, so a viewer who
  // turns sound on does not have to do it again for every Moment.
  const [muted, setMuted] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(posts[0]?.id ?? null);

  return (
    <div
      data-testid="moment-reel"
      className="h-[calc(100dvh-68px-env(safe-area-inset-bottom))] snap-y snap-mandatory overflow-y-auto overscroll-contain scrollbar-hide bg-black"
    >
      {posts.map((post) => (
        <MomentSlide
          key={post.id}
          post={post}
          muted={muted}
          isActive={activeId === post.id}
          onVisible={() => setActiveId(post.id)}
          onToggleMute={() => setMuted((value) => !value)}
          onLike={() => onLike(post)}
          onSave={() => onSave(post)}
          onComments={() => onComments(post)}
          onShare={() => onShare(post)}
          onVote={(index) => onVote(post, index)}
        />
      ))}
      <ReelEnd onRefresh={onRefresh} />
    </div>
  );
};

interface MomentSlideProps {
  post: MipoSocialPost;
  muted: boolean;
  isActive: boolean;
  onVisible: () => void;
  onToggleMute: () => void;
  onLike: () => void;
  onSave: () => void;
  onComments: () => void;
  onShare: () => void;
  onVote: (optionIndex: number) => void;
}

const MomentSlide = ({
  post, muted, isActive, onVisible, onToggleMute,
  onLike, onSave, onComments, onShare, onVote,
}: MomentSlideProps) => {
  const slideRef = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const isVideo = post.media_type === "video";

  // Which Moment is on screen. The threshold is deliberately past half: with a
  // lower one, two slides both qualify mid-swipe and the video of the one being
  // scrolled away from keeps playing under the next.
  useEffect(() => {
    const element = slideRef.current;
    if (!element) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) onVisible(); },
      { threshold: 0.6 },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [onVisible]);

  // Only the Moment on screen plays. play() rejects when the browser refuses
  // autoplay, which is a normal outcome and not an error worth surfacing.
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (isActive) {
      void video.play().catch(() => {});
    } else {
      video.pause();
      video.currentTime = 0;
    }
  }, [isActive]);

  return (
    <article
      ref={slideRef}
      data-testid="moment-slide"
      className="relative h-[calc(100dvh-68px-env(safe-area-inset-bottom))] w-full snap-start snap-always overflow-hidden"
    >
      {/* The frame behind the media: the same image, blurred and darkened, so a
          4:5 photo fills a 9:16 screen without being cropped or letterboxed. */}
      <div
        aria-hidden="true"
        className="absolute inset-0 scale-110 bg-cover bg-center blur-2xl brightness-[0.35]"
        style={{ backgroundImage: `url(${JSON.stringify(post.media_url)})` }}
      />

      <div className="absolute inset-0 flex items-center justify-center">
        {isVideo ? (
          <video
            ref={videoRef}
            data-testid="moment-media"
            src={post.media_url}
            className="max-h-full max-w-full object-contain"
            playsInline
            loop
            muted={muted}
            preload="metadata"
            aria-label={post.caption || "רגע מהקהילה"}
          />
        ) : (
          <img
            data-testid="moment-media"
            src={post.media_url}
            alt={post.caption || "רגע מהקהילה"}
            className="max-h-full max-w-full object-contain"
            loading="lazy"
          />
        )}
      </div>

      {/* Legibility for the overlaid text, without dimming the whole photo. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black/80 to-transparent" />

      {isVideo && (
        <button
          onClick={onToggleMute}
          aria-label={muted ? "הפעלת קול" : "השתקה"}
          className="absolute top-4 start-4 flex h-11 w-11 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm"
        >
          {muted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
        </button>
      )}

      {/* The author, the caption and the actions are one row, not three
          overlays. Positioned separately they overlapped: a three-line caption
          ran underneath the share button. */}
      <div className="absolute inset-x-0 bottom-0 flex items-end gap-3 p-4 text-white">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2.5">
            <img
              src={post.pet?.avatar_url || post.creator.avatar_url || defaultPetAvatar}
              alt=""
              className="h-10 w-10 shrink-0 rounded-full border-2 border-white/80 object-cover"
            />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{post.pet?.name || post.creator.display_name}</p>
              {/* Where the Moment happened, when the author said so. The card
                  feed showed this and the first version of the reel dropped it. */}
              <p className="flex items-center gap-1 truncate text-xs text-white/70">
                {post.location && <MapPin className="h-3 w-3 shrink-0" />}
                {post.location || post.pet?.breed}
              </p>
            </div>
          </div>

          {post.caption && (
            <p className="mt-2.5 text-sm leading-6 text-white/95 line-clamp-3">{post.caption}</p>
          )}

          {post.poll_question && <ReelPoll post={post} onVote={onVote} />}
        </div>

        <div className="flex shrink-0 flex-col items-center gap-5 pb-1">
          <ReelAction label="אהבתי" onClick={onLike} count={post.reaction_count} active={post.viewer_has_liked}>
            <Heart className={cn("h-7 w-7", post.viewer_has_liked && "fill-mipo-coral text-mipo-coral")} />
          </ReelAction>
          <ReelAction label="תגובות" onClick={onComments} count={post.comment_count}>
            <MessageCircle className="h-7 w-7" />
          </ReelAction>
          <ReelAction label="שמירה" onClick={onSave} active={post.viewer_has_saved}>
            <Bookmark className={cn("h-7 w-7", post.viewer_has_saved && "fill-white")} />
          </ReelAction>
          <ReelAction label="שיתוף" onClick={onShare}>
            <Send className="h-7 w-7" />
          </ReelAction>
        </div>
      </div>
    </article>
  );
};

const ReelAction = ({ children, label, onClick, count, active }: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
  count?: number;
  active?: boolean;
}) => (
  <button
    onClick={onClick}
    aria-label={label}
    aria-pressed={active}
    className="flex min-h-11 min-w-11 flex-col items-center gap-1 text-white drop-shadow-lg active:scale-90"
  >
    {children}
    {count !== undefined && count > 0 && (
      <span className="text-[11px] font-semibold tabular-nums">{formatCount(count)}</span>
    )}
  </button>
);

const ReelPoll = ({ post, onVote }: { post: MipoSocialPost; onVote: (index: number) => void }) => {
  const total = post.poll_results.reduce((sum, count) => sum + count, 0);
  return (
    <div className="mt-3 max-w-sm rounded-2xl bg-black/45 p-3 backdrop-blur-md">
      <p className="mb-2 text-sm font-semibold">{post.poll_question}</p>
      <div className="space-y-2">
        {post.poll_options.map((option, index) => {
          const count = post.poll_results[index] || 0;
          const percent = total ? Math.round((count / total) * 100) : 0;
          return (
            <button
              key={option}
              onClick={() => onVote(index)}
              className="relative flex min-h-11 w-full overflow-hidden rounded-xl border border-white/25 px-3 text-right text-sm"
            >
              <span aria-hidden="true" className="absolute inset-y-0 start-0 bg-white/25" style={{ width: `${percent}%` }} />
              <span className="relative flex w-full items-center justify-between">
                <span className={cn(post.viewer_poll_option === index && "font-semibold")}>{option}</span>
                {total > 0 && <span className="text-xs text-white/75 tabular-nums">{percent}%</span>}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

/**
 * The end of the reel, and the reason it has one.
 *
 * Everything loaded has been seen. The brief rules out optimising for time in
 * app, so this stops rather than fetching more: the viewer is told they are up
 * to date and chooses whether to look again.
 */
const ReelEnd = ({ onRefresh }: { onRefresh: () => void }) => (
  <section className="flex h-[calc(100dvh-68px-env(safe-area-inset-bottom))] snap-start snap-always flex-col items-center justify-center gap-4 px-8 text-center text-white">
    <p className="text-lg font-semibold">ראית את כל הרגעים החדשים</p>
    <p className="max-w-xs text-sm text-white/70">
      זה הכול לעכשיו. תוכלו לבדוק שוב מאוחר יותר, או לשתף רגע משלכם.
    </p>
    <button
      onClick={onRefresh}
      className="mt-2 min-h-11 rounded-full border border-white/30 px-6 text-sm font-medium"
    >
      רענון
    </button>
  </section>
);

export const useReelHandlers = () => {
  // Share falls back to copying the link where the Web Share API is absent,
  // which is most desktop browsers.
  return useCallback(async (post: MipoSocialPost) => {
    const url = `${window.location.origin}/post/${post.id}`;
    if (navigator.share) {
      await navigator.share({ title: "Mipo", url }).catch(() => {});
      return "shared" as const;
    }
    await navigator.clipboard?.writeText(url).catch(() => {});
    return "copied" as const;
  }, []);
};
