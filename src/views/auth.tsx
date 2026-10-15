import { ErrorNote, Layout } from "./layout.js";

export function SignUp({ error, v = {} }: { error?: string; v?: Record<string, string> }) {
  return (
    <Layout title="Create account">
      <h1>Create account</h1>
      <ErrorNote message={error} />
      <form method="post" action="/signup">
        <label>
          Event code
          <input name="eventCode" required autocomplete="off" />
        </label>
        <label>
          Username
          <input
            name="username"
            value={v.username}
            required
            minlength={3}
            maxlength={30}
            autocomplete="username"
          />
        </label>
        <label>
          Email (only used to reset your password)
          <input name="email" type="email" value={v.email} required autocomplete="email" />
        </label>
        <label>
          Password (10+ characters)
          <input
            name="password"
            type="password"
            required
            minlength={10}
            autocomplete="new-password"
          />
        </label>
        <button type="submit">Create account</button>
      </form>
      <p>
        <a href="/signin">Already have an account? Sign in</a>
      </p>
    </Layout>
  );
}

export function SignIn({ error }: { error?: string }) {
  return (
    <Layout title="Sign in">
      <h1>Sign in</h1>
      <ErrorNote message={error} />
      <form method="post" action="/signin">
        <label>
          Username
          <input name="username" required autocomplete="username" />
        </label>
        <label>
          Password
          <input name="password" type="password" required autocomplete="current-password" />
        </label>
        <button type="submit">Sign in</button>
      </form>
      <p>
        <a href="/signup">Create account</a> · <a href="/reset">Forgot password?</a>
      </p>
    </Layout>
  );
}

export function ResetRequest({ sent, error }: { sent?: boolean; error?: string }) {
  return (
    <Layout title="Reset password">
      <h1>Reset password</h1>
      <ErrorNote message={error} />
      {sent ? (
        <p role="status">
          If that address is registered, we've sent a link. It works for one hour.
        </p>
      ) : (
        <form method="post" action="/reset">
          <label>
            Email
            <input name="email" type="email" required autocomplete="email" />
          </label>
          <button type="submit">Send reset link</button>
        </form>
      )}
      <p>
        <a href="/signin">Back to sign in</a>
      </p>
    </Layout>
  );
}

export function ResetNew({ token, error }: { token: string; error?: string }) {
  return (
    <Layout title="Choose a new password">
      <h1>Choose a new password</h1>
      <ErrorNote message={error} />
      <form method="post" action={`/reset/${encodeURIComponent(token)}`}>
        <label>
          New password (10+ characters)
          <input
            name="password"
            type="password"
            required
            minlength={10}
            autocomplete="new-password"
          />
        </label>
        <button type="submit">Save password</button>
      </form>
    </Layout>
  );
}
