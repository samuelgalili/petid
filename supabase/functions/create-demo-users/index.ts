import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const demoUsers = [
  {
    email: 'miki.dog@demo.petish.com',
    password: 'DemoPass123!',
    full_name: 'מיקי הכלב',
    avatar_url: 'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=150&h=150&fit=crop',
    bio: 'אוהב לרוץ בפארק ולשחק עם כדורים 🐕'
  },
  {
    email: 'luna.cat@demo.petish.com',
    password: 'DemoPass123!',
    full_name: 'לונה החתולה',
    avatar_url: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=150&h=150&fit=crop',
    bio: 'מלכת הבית 👑 אוהבת שמש ושינה'
  },
  {
    email: 'boni.golden@demo.petish.com',
    password: 'DemoPass123!',
    full_name: 'בוני הגולדן',
    avatar_url: 'https://images.unsplash.com/photo-1552053831-71594a27632d?w=150&h=150&fit=crop',
    bio: 'הכלב הכי ידידותי בשכונה! 🦮'
  },
  {
    email: 'shoko.lab@demo.petish.com',
    password: 'DemoPass123!',
    full_name: 'שוקו הלברדור',
    avatar_url: 'https://images.unsplash.com/photo-1529429617124-95b109e86bb8?w=150&h=150&fit=crop',
    bio: 'אוהב מים ושחייה 🏊‍♂️'
  },
  {
    email: 'simba.cat@demo.petish.com',
    password: 'DemoPass123!',
    full_name: 'סימבה החתול',
    avatar_url: 'https://images.unsplash.com/photo-1573865526739-10659fec78a5?w=150&h=150&fit=crop',
    bio: 'מלך הג׳ונגל של הסלון 🦁'
  }
]

const demoPosts = [
  {
    image_url: 'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=600&h=600&fit=crop',
    caption: 'יום מושלם בפארק! 🐕☀️ מי רוצה לצאת איתי לטיול?'
  },
  {
    image_url: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=600&h=600&fit=crop',
    caption: 'מנוחת צהריים על הספה האהובה עליי 😺💤'
  },
  {
    image_url: 'https://images.unsplash.com/photo-1552053831-71594a27632d?w=600&h=600&fit=crop',
    caption: 'חיוך גדול אחרי טיול ארוך! 🦮❤️'
  },
  {
    image_url: 'https://images.unsplash.com/photo-1529429617124-95b109e86bb8?w=600&h=600&fit=crop',
    caption: 'מי אמר שכלבים לא יודעים לשחות? 🏊‍♂️💦'
  },
  {
    image_url: 'https://images.unsplash.com/photo-1573865526739-10659fec78a5?w=600&h=600&fit=crop',
    caption: 'המבט שעושים כשהאוכל מאחר... 🦁🍽️'
  },
  {
    image_url: 'https://images.unsplash.com/photo-1601758228041-f3b2795255f1?w=600&h=600&fit=crop',
    caption: 'יום הולדת שמח לי! 🎂🐾'
  },
  {
    image_url: 'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=600&h=600&fit=crop',
    caption: 'טיול עם החבר הכי טוב! 🐕🐕'
  },
  {
    image_url: 'https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?w=600&h=600&fit=crop',
    caption: 'הפוזה שלי לצילום 📸✨'
  }
]

const demoStories = [
  { media_url: 'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=400&h=700&fit=crop' },
  { media_url: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=400&h=700&fit=crop' },
  { media_url: 'https://images.unsplash.com/photo-1552053831-71594a27632d?w=400&h=700&fit=crop' },
  { media_url: 'https://images.unsplash.com/photo-1529429617124-95b109e86bb8?w=400&h=700&fit=crop' },
  { media_url: 'https://images.unsplash.com/photo-1573865526739-10659fec78a5?w=400&h=700&fit=crop' }
]

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const createdUsers: string[] = []
    const errors: string[] = []

    // Create demo users
    for (const user of demoUsers) {
      try {
        // Check if user already exists
        const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers()
        const existingUser = existingUsers?.users?.find(u => u.email === user.email)
        
        let userId: string

        if (existingUser) {
          userId = existingUser.id
          createdUsers.push(`${user.full_name} (existing)`)
        } else {
          // Create new user
          const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
            email: user.email,
            password: user.password,
            email_confirm: true,
            user_metadata: { full_name: user.full_name }
          })

          if (createError) {
            errors.push(`Failed to create ${user.email}: ${createError.message}`)
            continue
          }

          userId = newUser.user.id
          createdUsers.push(user.full_name)
        }

        // Update profile
        await supabaseAdmin
          .from('profiles')
          .upsert({
            id: userId,
            full_name: user.full_name,
            email: user.email,
            avatar_url: user.avatar_url,
            bio: user.bio,
            points: Math.floor(Math.random() * 300) + 100
          })

      } catch (e: unknown) {
        const errorMessage = e instanceof Error ? e.message : 'Unknown error'
        errors.push(`Error with ${user.email}: ${errorMessage}`)
      }
    }

    // Get all demo user IDs
    const { data: profiles } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name')
      .like('email', '%@demo.petish.com')

    if (profiles && profiles.length > 0) {
      // Create posts for demo users
      for (let i = 0; i < demoPosts.length; i++) {
        const userIndex = i % profiles.length
        const post = demoPosts[i]
        
        // Check if post already exists
        const { data: existingPost } = await supabaseAdmin
          .from('posts')
          .select('id')
          .eq('user_id', profiles[userIndex].id)
          .eq('image_url', post.image_url)
          .maybeSingle()

        if (!existingPost) {
          await supabaseAdmin
            .from('posts')
            .insert({
              user_id: profiles[userIndex].id,
              image_url: post.image_url,
              caption: post.caption,
              created_at: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString()
            })
        }
      }

      // Create stories for demo users (expire in 24 hours)
      for (let i = 0; i < demoStories.length; i++) {
        const userIndex = i % profiles.length
        const story = demoStories[i]
        
        // Check if story already exists
        const { data: existingStory } = await supabaseAdmin
          .from('stories')
          .select('id')
          .eq('user_id', profiles[userIndex].id)
          .eq('media_url', story.media_url)
          .maybeSingle()

        if (!existingStory) {
          const createdAt = new Date(Date.now() - Math.random() * 12 * 60 * 60 * 1000)
          const expiresAt = new Date(createdAt.getTime() + 24 * 60 * 60 * 1000)
          
          await supabaseAdmin
            .from('stories')
            .insert({
              user_id: profiles[userIndex].id,
              media_url: story.media_url,
              media_type: 'image',
              created_at: createdAt.toISOString(),
              expires_at: expiresAt.toISOString()
            })
        }
      }

      // Add some likes to posts
      const { data: posts } = await supabaseAdmin
        .from('posts')
        .select('id, user_id')
        .limit(10)

      if (posts) {
        for (const post of posts) {
          // Each demo user likes random posts
          for (const profile of profiles) {
            if (profile.id !== post.user_id && Math.random() > 0.5) {
              const { data: existingLike } = await supabaseAdmin
                .from('post_likes')
                .select('id')
                .eq('post_id', post.id)
                .eq('user_id', profile.id)
                .maybeSingle()

              if (!existingLike) {
                await supabaseAdmin
                  .from('post_likes')
                  .insert({
                    post_id: post.id,
                    user_id: profile.id
                  })
              }
            }
          }
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Demo users created successfully',
        created: createdUsers,
        errors: errors.length > 0 ? errors : undefined
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
