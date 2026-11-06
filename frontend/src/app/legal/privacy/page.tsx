import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Privacy' };

export default function Privacy() {
  return (
    <>
      <h1>Privacy</h1>
      <p className="text-caption text-fg-3">Last updated 6 November 2026</p>
      <p className="text-fg">
        In short, Polaris keeps only what it needs to run your account. We don&apos;t sell your data, show ads or
        track you. Your broker login stays in your own browser. You can download or delete everything at any time.
      </p>

      <h2>What Polaris keeps</h2>
      <ul className="flex flex-col gap-2">
        <li><strong>Your sign-in.</strong> Your email, name and security settings are held by Clerk, our sign-in provider. Polaris never sees your password. If you request access, Clerk keeps the email you give so we can invite you.</li>
        <li><strong>Your setup.</strong> Your base currency, the markets you follow and your risk per trade.</li>
        <li><strong>Your paper trading.</strong> Your paper account, every paper order that filled, and the notes the AI desk keeps for you.</li>
        <li><strong>Your watchlists and alerts.</strong> The symbols you follow, the alerts you set and when each one fired.</li>
        <li><strong>Your Ask Polaris chats.</strong> Your questions and the answers, so you can come back to them.</li>
        <li><strong>Service logs.</strong> Request times, errors and reference codes, used to run and fix Polaris. Tokens and keys are removed before anything is logged.</li>
      </ul>
      <p>Your data is stored in a database run by Neon, in the United States. Every row is tied to your account, and the database itself refuses to show it to anyone else.</p>

      <h2>What stays in your browser</h2>
      <ul className="flex flex-col gap-2">
        <li><strong>Your broker connection.</strong> When you connect a broker, its access token and any app keys you enter are encrypted into a cookie in your browser. Only the Polaris server can open it, and only to read your holdings and positions. It&apos;s deleted when you disconnect, or when the time you chose runs out, 90 days at most. Your holdings are read live from your broker and never stored.</li>
        <li><strong>Display choices.</strong> Things like a collapsed sidebar, your last tab and the symbols you opened recently are saved in this browser only.</li>
      </ul>

      <h2>Who else sees what</h2>
      <ul className="flex flex-col gap-2">
        <li><strong>AI providers.</strong> When you ask Polaris a question, your question, the rest of that chat and a summary of your paper portfolio (cash and up to 12 positions) go to the AI model that writes the answer. That is Google Gemini, or a model reached through OpenRouter. Their own privacy terms cover what they receive, so don&apos;t share anything you wouldn&apos;t want them to see.</li>
        <li><strong>Shared research.</strong> The AI desk and Deep Dive send only market data about a symbol, nothing about you. Their write-up is saved for the day and can be shown to anyone else who opens that symbol.</li>
        <li><strong>Your broker.</strong> Polaris asks your broker for your holdings and positions, using the connection you set up. It never places an order.</li>
        <li><strong>Market data and news sources.</strong> Symbols you look up are requested from public sources such as Yahoo Finance and NSE. Nothing that identifies you is attached.</li>
        <li><strong>The services that run Polaris.</strong> Clerk for sign-in, Neon for the database and Vercel for hosting handle your data on our behalf, in the United States.</li>
      </ul>
      <p>The only cookies are Clerk&apos;s, which keep you signed in, and your broker cookie if you connect one. No analytics, no ad trackers.</p>

      <h2>Your controls</h2>
      <ul className="flex flex-col gap-2">
        <li><strong>Download your data.</strong> Go to Settings, then Data and privacy, then Export my data. You get one file with everything Polaris stores about you.</li>
        <li><strong>Delete your account.</strong> Delete my account, in the same place, removes your sign-in and all your Polaris data together.</li>
        <li><strong>Delete parts of it.</strong> Delete a chat from your chats list. Journal entries you delete can be restored for 30 days.</li>
        <li><strong>Disconnect a broker.</strong> Go to Settings, then Brokers. The cookie is removed straight away.</li>
        <li><strong>Protect your account.</strong> Turn on two-step verification and check the devices signed in, under Settings.</li>
      </ul>

      <h2>How long we keep it</h2>
      <p>Until you delete it, or delete your account. Logs are kept for a short time by our hosting provider.</p>

      <h2>Questions</h2>
      <p>Reply to your invitation email and it reaches the person who runs Polaris.</p>
    </>
  );
}
