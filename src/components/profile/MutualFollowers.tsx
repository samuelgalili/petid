import { useEffect, useState } from 'react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

interface MutualFollower {
  id: string;
  full_name: string;
  avatar_url: string;
}

interface MutualFollowersProps {
  userId: string;
  currentUserId?: string;
}

export const MutualFollowers = ({ userId, currentUserId }: MutualFollowersProps) => {
  const navigate = useNavigate();
  const [mutuals, setMutuals] = useState<MutualFollower[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchMutualFollowers = async () => {
      if (!currentUserId || currentUserId === userId) {
        setIsLoading(false);
        return;
      }

      try {
        // Get users that the current user follows
        const { data: myFollowing } = await supabase
          .from('user_follows')
          .select('following_id')
          .eq('follower_id', currentUserId);

        if (!myFollowing || myFollowing.length === 0) {
          setIsLoading(false);
          return;
        }

        const myFollowingIds = myFollowing.map(f => f.following_id);

        // Get users that follow the profile user
        const { data: profileFollowers } = await supabase
          .from('user_follows')
          .select('follower_id')
          .eq('following_id', userId);

        if (!profileFollowers || profileFollowers.length === 0) {
          setIsLoading(false);
          return;
        }

        const profileFollowerIds = profileFollowers.map(f => f.follower_id);

        // Find intersection (mutual followers)
        const mutualIds = myFollowingIds.filter(id => profileFollowerIds.includes(id));

        if (mutualIds.length === 0) {
          setIsLoading(false);
          return;
        }

        setTotalCount(mutualIds.length);

        // Fetch profiles for first 3 mutual followers
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url')
          .in('id', mutualIds.slice(0, 3));

        if (profiles) {
          setMutuals(profiles);
        }
      } catch (error) {
        console.error('Error fetching mutual followers:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMutualFollowers();
  }, [userId, currentUserId]);

  if (isLoading || mutuals.length === 0) return null;

  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      <div className="flex -space-x-2 rtl:space-x-reverse">
        {mutuals.map((user) => (
          <Avatar 
            key={user.id} 
            className="w-5 h-5 border-2 border-background cursor-pointer"
            onClick={() => navigate(`/user/${user.id}`)}
          >
            <AvatarImage src={user.avatar_url} />
            <AvatarFallback className="text-[8px] bg-muted">
              {user.full_name?.[0] || 'U'}
            </AvatarFallback>
          </Avatar>
        ))}
      </div>
      <span>
        נעקב ע"י{' '}
        <span 
          className="font-semibold text-foreground cursor-pointer hover:underline"
          onClick={() => navigate(`/user/${mutuals[0].id}`)}
        >
          {mutuals[0].full_name?.split(' ')[0]}
        </span>
        {mutuals.length > 1 && (
          <>
            {', '}
            <span 
              className="font-semibold text-foreground cursor-pointer hover:underline"
              onClick={() => navigate(`/user/${mutuals[1].id}`)}
            >
              {mutuals[1].full_name?.split(' ')[0]}
            </span>
          </>
        )}
        {totalCount > 2 && (
          <> ו-{totalCount - 2} נוספים</>
        )}
      </span>
    </div>
  );
};
