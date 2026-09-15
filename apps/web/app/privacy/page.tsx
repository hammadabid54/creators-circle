export const metadata = {
  title: 'Privacy Policy — Kollabo',
  description:
    'How Kollabo (a Pakistani creator–brand marketplace) collects, uses, and protects your personal information.',
};

export default function PrivacyPage() {
  const updated = '14 September 2026';
  return (
    <main className="cc-container py-16 prose prose-neutral max-w-3xl">
      <h1>Privacy Policy</h1>
      <p className="text-sm text-neutral-500">Last updated: {updated}</p>

      <h2>Who we are</h2>
      <p>
        Kollabo (&ldquo;Kollabo&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;) is a two-sided marketplace that connects
        Pakistani content creators with brands that want to work with them.
        Kollabo is operated by Hammad Abid, based in Islamabad, Pakistan.
        You can reach us at <a href="mailto:support@kollabo.pk">support@kollabo.pk</a>.
      </p>
      <p>
        For the purposes of Pakistan&rsquo;s Personal Data Protection Bill and any future
        data-protection law that applies, the data controller is Kollabo (operated by
        Hammad Abid).
      </p>

      <h2>What information we collect</h2>
      <p>We collect only the information we need to run the platform:</p>
      <ul>
        <li>
          <strong>Account information.</strong> Your phone number (for OTP login), your
          email address (for OTP login), and a password hash if you choose password
          login. If you sign in with Google, Meta, or TikTok, we receive the basic
          profile information those providers share (typically your name, email, and
          profile photo URL).
        </li>
        <li>
          <strong>Profile information.</strong> For creators: your display name, bio,
          city, languages, niches, social handles, and any portfolio links you add.
          For brands: your company name, industry, website, and city.
        </li>
        <li>
          <strong>Activity.</strong> The campaigns you post or apply to, the contracts
          you enter into, the messages you send through Kollabo, and the reviews you
          write or receive.
        </li>
        <li>
          <strong>Social metrics.</strong> If you connect a social account (Instagram,
          Facebook, TikTok, YouTube), we periodically fetch your public follower
          count and engagement rate to display a &ldquo;popularity&rdquo; signal on your
          profile. We never read or post on your behalf.
        </li>
        <li>
          <strong>Technical data.</strong> IP address, browser type, and rough
          geographic region, used to prevent abuse and improve the service.
        </li>
      </ul>

      <h2>Why we collect it</h2>
      <ul>
        <li>To create and maintain your account.</li>
        <li>To match creators with relevant brand campaigns.</li>
        <li>To enable contracts, messaging, and reviews between the two sides.</li>
        <li>To detect fraud, abuse, and policy violations.</li>
        <li>To send you service-related emails (OTP codes, security alerts, contract
          updates). Marketing emails, if any, will require separate consent.</li>
      </ul>
      <p>
        We do <strong>not</strong> sell your data. We do <strong>not</strong> show you
        ads based on your activity outside Kollabo.
      </p>

      <h2>Sharing</h2>
      <p>
        Your profile (the parts you choose to fill in) is visible to other users of
        the platform &mdash; that&rsquo;s the point of a marketplace. Beyond that, we share
        information only:
      </p>
      <ul>
        <li>With service providers who help us run Kollabo (hosting, email delivery,
          error tracking). These providers are contractually obligated to protect
          your data.</li>
        <li>With payment and identity verification providers, once those features go
          live &mdash; and only the minimum required for the transaction.</li>
        <li>When required by Pakistani law, court order, or to investigate violations
          of our Terms.</li>
      </ul>

      <h2>How long we keep your data</h2>
      <p>
        We keep your account information for as long as your account is active. If
        you delete your account, we delete your personal data within 30 days, except
        where we&rsquo;re required to keep records for legal or tax purposes (for example,
        completed contracts and their payment history are kept for 7 years, in line
        with Pakistani tax law).
      </p>

      <h2>Your rights</h2>
      <p>You can, at any time:</p>
      <ul>
        <li>See what data we hold about you (request an export).</li>
        <li>Correct inaccurate information.</li>
        <li>Delete your account and personal data.</li>
        <li>Disconnect any social account you&rsquo;ve linked.</li>
      </ul>
      <p>
        Email <a href="mailto:support@kollabo.pk">support@kollabo.pk</a> with any of
        these requests. We respond within 7 days.
      </p>

      <h2>Cookies and similar</h2>
      <p>
        Kollabo uses only the cookies and local-storage items that are strictly
        necessary for the site to work &mdash; keeping you signed in, remembering your
        preferences, and protecting against fraud. We do not use third-party tracking
        cookies.
      </p>

      <h2>Security</h2>
      <p>
        Passwords are hashed with bcrypt. Sessions use signed JWTs (NextAuth). All
        traffic is encrypted with HTTPS. Database access is restricted to the
        application server. Despite our efforts, no system is 100% secure &mdash; if you
        discover a vulnerability, please email
        <a href="mailto:support@kollabo.pk">support@kollabo.pk</a> so we can fix it
        promptly.
      </p>

      <h2>Children</h2>
      <p>
        Kollabo is for people 18 and over. We do not knowingly collect data from
        anyone under 18. If we learn that we have, we&rsquo;ll delete it within 7 days.
      </p>

      <h2>International transfers</h2>
      <p>
        Some of our service providers (e.g., error tracking) may process data
        outside Pakistan. Where this happens, we rely on providers that offer
        adequate data-protection safeguards under their own local laws (such as the
        EU GDPR for European providers).
      </p>

      <h2>Changes to this policy</h2>
      <p>
        We may update this policy as Kollabo grows. When we do, we&rsquo;ll change the
        &ldquo;Last updated&rdquo; date above and, for material changes, notify you by email
        or in-app message before the change takes effect.
      </p>

      <h2>Contact</h2>
      <p>
        Questions, complaints, or data requests:{' '}
        <a href="mailto:support@kollabo.pk">support@kollabo.pk</a>
        <br />
        Operator: Hammad Abid, Islamabad, Pakistan.
      </p>
    </main>
  );
}
