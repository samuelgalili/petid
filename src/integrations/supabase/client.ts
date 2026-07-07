import {
  getCurrentUser,
  loginUser,
  logoutUser,
  requestPasswordReset,
  updateMyProfile,
} from "@/lib/mipoApi";

type LegacyError = { message: string };
type QueryPayload<T = unknown> = { data: T; error: null; count: number | null };
type LegacyUser = {
  id: string;
  email?: string | null;
  phone?: string | null;
  user_metadata: Record<string, unknown>;
  app_metadata: Record<string, unknown>;
};
type LegacySession = {
  access_token: string;
  refresh_token: string;
  token_type: "bearer";
  expires_in: number;
  expires_at: number;
  user: LegacyUser;
};

const emptySubscription = { unsubscribe: () => undefined };
const unavailableMessage = (name: string) => `${name} is not available in the AWS build yet`;

const toLegacyUser = (auth: Awaited<ReturnType<typeof getCurrentUser>>): LegacyUser | null => {
  if (!auth?.user) return null;

  const fullName = auth.profile?.full_name || auth.user.full_name || null;
  return {
    id: auth.user.id,
    email: auth.user.email,
    phone: auth.profile?.phone || auth.user.phone || null,
    user_metadata: {
      ...(auth.user.user_metadata || {}),
      full_name: fullName,
      name: fullName,
      avatar_url: auth.profile?.avatar_url || null,
      phone: auth.profile?.phone || auth.user.phone || null,
    },
    app_metadata: auth.user.app_metadata || {},
  };
};

const toLegacySession = (user: LegacyUser | null): LegacySession | null => {
  if (!user) return null;
  const expiresAt = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30;
  return {
    access_token: "aws-cookie-session",
    refresh_token: "",
    token_type: "bearer",
    expires_in: 60 * 60 * 24 * 30,
    expires_at: expiresAt,
    user,
  };
};

const isNonBlockingLegacyFunction = (functionName: string) =>
  ["chat", "orchestrator-chat", "ai-os-gateway", "detect-breed"].includes(functionName);

const legacyFunctionData = (functionName: string) => {
  const message = unavailableMessage(functionName);
  if (functionName === "chat" || functionName === "orchestrator-chat") {
    return {
      role: "assistant",
      content: "הצ'אט עדיין עובר לסביבת AWS. אפשר להמשיך להשתמש בחנות, בפרופיל ובניהול המוצרים, ונחבר את שירות ה-AI בהמשך.",
      response: "הצ'אט עדיין עובר לסביבת AWS.",
      message,
      unavailable: true,
    };
  }

  if (functionName === "detect-breed") {
    return {
      breed: null,
      confidence: 0,
      labels: [],
      message,
      unavailable: true,
    };
  }

  return {
    ok: false,
    success: false,
    message,
    unavailable: true,
  };
};

class AwsCompatQuery<T = unknown> implements PromiseLike<QueryPayload<T[] | T | null>> {
  private shouldReturnSingle = false;

  select(..._args: unknown[]) { return this; }
  insert(..._args: unknown[]) { return this; }
  update(..._args: unknown[]) { return this; }
  upsert(..._args: unknown[]) { return this; }
  delete(..._args: unknown[]) { return this; }
  eq(..._args: unknown[]) { return this; }
  neq(..._args: unknown[]) { return this; }
  gt(..._args: unknown[]) { return this; }
  gte(..._args: unknown[]) { return this; }
  lt(..._args: unknown[]) { return this; }
  lte(..._args: unknown[]) { return this; }
  like(..._args: unknown[]) { return this; }
  ilike(..._args: unknown[]) { return this; }
  is(..._args: unknown[]) { return this; }
  in(..._args: unknown[]) { return this; }
  not(..._args: unknown[]) { return this; }
  or(..._args: unknown[]) { return this; }
  filter(..._args: unknown[]) { return this; }
  contains(..._args: unknown[]) { return this; }
  containedBy(..._args: unknown[]) { return this; }
  rangeGt(..._args: unknown[]) { return this; }
  rangeGte(..._args: unknown[]) { return this; }
  rangeLt(..._args: unknown[]) { return this; }
  rangeLte(..._args: unknown[]) { return this; }
  rangeAdjacent(..._args: unknown[]) { return this; }
  overlaps(..._args: unknown[]) { return this; }
  textSearch(..._args: unknown[]) { return this; }
  match(..._args: unknown[]) { return this; }
  order(..._args: unknown[]) { return this; }
  limit(..._args: unknown[]) { return this; }
  range(..._args: unknown[]) { return this; }
  abortSignal(..._args: unknown[]) { return this; }
  throwOnError(..._args: unknown[]) { return this; }
  returns(..._args: unknown[]) { return this; }

  single() {
    this.shouldReturnSingle = true;
    return this;
  }

  maybeSingle() {
    this.shouldReturnSingle = true;
    return this;
  }

  csv() {
    return Promise.resolve({ data: "", error: null });
  }

  geojson() {
    return Promise.resolve({ data: null, error: null });
  }

  explain() {
    return Promise.resolve({ data: null, error: null });
  }

  execute(): Promise<QueryPayload<T[] | T | null>> {
    return Promise.resolve({
      data: this.shouldReturnSingle ? null : [],
      error: null,
      count: 0,
    });
  }

  then<TResult1 = QueryPayload<T[] | T | null>, TResult2 = never>(
    onfulfilled?: ((value: QueryPayload<T[] | T | null>) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ) {
    return this.execute().then(onfulfilled, onrejected);
  }

  catch<TResult = never>(onrejected?: ((reason: unknown) => TResult | PromiseLike<TResult>) | null) {
    return this.execute().catch(onrejected);
  }

  finally(onfinally?: (() => void) | null) {
    return this.execute().finally(onfinally || undefined);
  }
}

const createStorageBucket = () => ({
  upload: async (path: string) => ({
    data: { path, fullPath: path },
    error: null,
  }),
  remove: async () => ({ data: [], error: null }),
  download: async () => ({ data: null, error: { message: "AWS storage download is not available through the legacy client" } }),
  list: async () => ({ data: [], error: null }),
  createSignedUrl: async () => ({ data: { signedUrl: "" }, error: null }),
  createSignedUrls: async () => ({ data: [], error: null }),
  getPublicUrl: (path = "") => ({ data: { publicUrl: path } }),
});

const createChannel = () => ({
  on: function on(..._args: unknown[]) { return this; },
  subscribe: function subscribe(..._args: unknown[]) { return this; },
  unsubscribe: () => "ok",
  send: async () => "ok",
  track: async () => "ok",
  untrack: async () => "ok",
});

const createAwsCompatSupabaseClient = () => ({
  auth: {
    getSession: async () => {
      const user = toLegacyUser(await getCurrentUser());
      return { data: { session: toLegacySession(user) }, error: null };
    },
    getUser: async () => {
      const user = toLegacyUser(await getCurrentUser());
      return { data: { user }, error: null };
    },
    onAuthStateChange: (..._args: unknown[]) => ({ data: { subscription: emptySubscription } }),
    signInWithPassword: async ({ email, password }: { email?: string; password?: string }) => {
      try {
        if (!email || !password) throw new Error("Email and password are required");
        const auth = await loginUser(email, password);
        const user = toLegacyUser(auth);
        return { data: { user, session: toLegacySession(user) }, error: null };
      } catch (error) {
        return {
          data: { user: null, session: null },
          error: { message: error instanceof Error ? error.message : "Login failed" },
        };
      }
    },
    signInWithOtp: async () => ({
      data: { user: null, session: null },
      error: { message: "Phone OTP is not available in the AWS build yet" },
    }),
    signInWithOAuth: async () => ({
      data: { provider: null, url: null },
      error: { message: "Social sign-in is not available in the AWS build yet" },
    }),
    signOut: async () => {
      await logoutUser().catch(() => undefined);
      return { error: null };
    },
    resetPasswordForEmail: async (email: string) => {
      try {
        const data = await requestPasswordReset(email);
        return { data, error: null };
      } catch (error) {
        return {
          data: null,
          error: { message: error instanceof Error ? error.message : "Password reset failed" },
        };
      }
    },
    updateUser: async (attributes: Record<string, unknown>) => {
      try {
        const auth = await updateMyProfile(attributes);
        return { data: { user: toLegacyUser(auth) }, error: null };
      } catch (error) {
        return {
          data: { user: null },
          error: { message: error instanceof Error ? error.message : "Profile update failed" },
        };
      }
    },
    verifyOtp: async () => ({
      data: { user: null, session: null },
      error: { message: "Phone OTP is not available in the AWS build yet" },
    }),
  },
  from: <T = unknown>(..._args: unknown[]) => new AwsCompatQuery<T>(),
  rpc: <T = unknown>(..._args: unknown[]) => new AwsCompatQuery<T>(),
  functions: {
    invoke: async <T = unknown>(functionName: string) => {
      const data = legacyFunctionData(functionName) as T;
      return {
        data,
        error: isNonBlockingLegacyFunction(functionName)
          ? null
          : { message: unavailableMessage(functionName) },
      };
    },
  },
  storage: {
    from: (..._args: unknown[]) => createStorageBucket(),
  },
  channel: (..._args: unknown[]) => createChannel(),
  removeChannel: (..._args: unknown[]) => undefined,
  removeAllChannels: (..._args: unknown[]) => undefined,
});

export const supabase = createAwsCompatSupabaseClient();
export type SupabaseCompatClient = typeof supabase;
