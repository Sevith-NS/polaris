import { Waitlist } from '@clerk/nextjs';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Wordmark } from '@/components/shell/AppShell';

export const metadata: Metadata = { title: 'Request access' };

// Requests land in the Clerk dashboard (Waitlist); inviting someone there emails them a sign-up link.
export default function RequestAccessPage() {
  return (
    <div className="ambient flex min-h-[100dvh] flex-col items-center gap-6 px-4 py-10">
      <Link href="/" aria-label="Polaris home"><Wordmark /></Link>
      <p className="max-w-sm text-center text-body-sm text-fg-2">
        Polaris is invite-only during the preview. Leave your email and we will send you an invitation.
      </p>
      <Waitlist afterJoinWaitlistUrl="/" signInUrl="/sign-in" />
    </div>
  );
}
