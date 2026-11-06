import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Terms' };

export default function Terms() {
  return (
    <>
      <h1>Terms</h1>
      <p className="text-caption text-fg-3">Last updated 6 November 2026</p>
      <p className="text-fg">
        In short, Polaris shows your real holdings without touching them, lets you practise with paper money, and
        explains markets without telling you what to buy. Every decision about real money stays yours.
      </p>

      <h2>What Polaris is</h2>
      <p>A personal portfolio tool for Indian and US markets, in an invite-only preview. It shows holdings from brokers you connect, read-only, and runs paper portfolios with simulated money. The two are kept apart and never added together.</p>

      <h2>Paper trades are simulated</h2>
      <p>Paper orders use pretend money at delayed prices. They never reach a market or a broker.</p>

      <h2>Broker connections only read</h2>
      <p>A connected broker lets Polaris read your holdings and positions. Polaris has no way to place, change or cancel an order. Your broker&apos;s own terms still apply. A connection ends when you disconnect, when your broker ends the session (Zerodha ends its sessions every morning, for example), or when the time you chose runs out.</p>

      <h2>Not investment advice</h2>
      <p>Polaris is software. It is not registered with SEBI as an Investment Adviser or Research Analyst, and it never tells you to buy or sell. Plans, signals, risk figures, backtests and AI write-ups are for learning, and they can be wrong, late or incomplete. Talk to a licensed adviser before you risk real money.</p>

      <h2>AI answers can be wrong</h2>
      <p>Ask Polaris, the AI desk and Deep Dive are written by AI models. They can misread data or state things that aren&apos;t true. Check any figure that matters against its source.</p>

      <h2>Prices can be late</h2>
      <p>Most prices are delayed by about 15 minutes, and sources sometimes fail. Polaris marks delayed and stale data, but it can&apos;t promise that every price or calculation is right, or that Polaris is always available.</p>

      <h2>Your account</h2>
      <p>Access is by invitation during the preview. Keep your sign-in to yourself and turn on two-step verification. We may suspend an account that abuses Polaris, for example by scraping it, overloading it or trying to reach other people&apos;s data.</p>

      <h2>Changes</h2>
      <p>Polaris is a preview and changes quickly. Features may change or stop. When these terms change, the date at the top changes too.</p>

      <h2>Questions</h2>
      <p>Reply to your invitation email and it reaches the person who runs Polaris.</p>
    </>
  );
}
