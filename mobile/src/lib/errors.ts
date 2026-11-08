/** Turns Firebase errors into the short, friendly messages the app shows. */

const OFFLINE = 'No internet connection. Check your network and try again.';

function codeOf(e: unknown): string {
  return typeof e === 'object' && e && 'code' in e ? String((e as { code: unknown }).code) : '';
}

export function authMessage(e: unknown): string {
  switch (codeOf(e)) {
    case 'auth/weak-password': return 'Password must be at least 6 characters.';
    case 'auth/email-already-in-use': return 'An account already exists with this email. Log in instead.';
    case 'auth/user-not-found': return 'No account found with this email.';
    case 'auth/user-disabled': return 'This account has been disabled.';
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
    case 'auth/invalid-login-credentials': return 'Email or password is incorrect.';
    case 'auth/invalid-email': return 'Enter a valid email address.';
    case 'auth/too-many-requests': return 'Too many attempts. Wait a moment and try again.';
    case 'auth/network-request-failed': return OFFLINE;
    case 'auth/requires-recent-login': return 'For your security, log out and back in, then try again.';
    default: return firestoreMessage(e);
  }
}

export function firestoreMessage(e: unknown): string {
  switch (codeOf(e)) {
    case 'unavailable':
    case 'auth/network-request-failed': return OFFLINE;
    case 'permission-denied': return 'The server refused this. Make sure the app is up to date.';
    case 'failed-precondition': return 'The feed is still being set up on the server. Try again in a few minutes.';
    default: {
      const msg = e instanceof Error ? e.message : '';
      return msg && !msg.startsWith('Firebase') ? msg : 'Something went wrong. Please try again.';
    }
  }
}

/** Runs `block` and returns null on success or a friendly message on failure. */
export async function friendly(block: () => Promise<string | null | void>): Promise<string | null> {
  try {
    return (await block()) ?? null;
  } catch (e) {
    return firestoreMessage(e);
  }
}
