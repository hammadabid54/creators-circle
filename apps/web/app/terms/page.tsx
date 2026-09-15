export const metadata = {
  title: 'Terms of Service — Kollabo',
  description:
    'The rules that govern your use of Kollabo, a Pakistani creator–brand marketplace.',
};

export default function TermsPage() {
  const updated = '14 September 2026';
  return (
    <main className="cc-container py-16 prose prose-neutral max-w-3xl">
      <h1>Terms of Service</h1>
      <p className="text-sm text-neutral-500">Last updated: {updated}</p>

      <h2>1. Acceptance</h2>
      <p>
        By creating an account or otherwise using Kollabo (the &ldquo;Service&rdquo;), you
        agree to these Terms. If you don&rsquo;t agree, don&rsquo;t use the Service. Kollabo
        is operated by Hammad Abid (&ldquo;we&rdquo;, &ldquo;us&rdquo;, &ldquo;our&rdquo;) from
        Islamabad, Pakistan.
      </p>

      <h2>2. What Kollabo is</h2>
      <p>
        Kollabo is a two-sided marketplace. Brands post campaigns and search for
        Pakistani creators. Creators build profiles, apply to campaigns, accept
        work, deliver it, and get paid. Kollabo provides the platform that makes
        this possible &mdash; profile pages, search, messaging, contracts, milestones,
        reviews, and (planned) escrow payments.
      </p>
      <p>
        Kollabo is <strong>not</strong> a party to the contract between a brand and a
        creator. We don&rsquo;t employ creators, we don&rsquo;t represent brands, and we
        don&rsquo;t take responsibility for the quality, legality, or delivery of any
        work agreed through the platform.
      </p>

      <h2>3. Eligibility</h2>
      <ul>
        <li>You must be at least 18 years old.</li>
        <li>You must be a resident of Pakistan (or otherwise able to receive
          PKR payouts to a Pakistani bank or mobile wallet).</li>
        <li>You must provide accurate information when you register.</li>
        <li>One account per person. We may close duplicate or misleading accounts.</li>
      </ul>

      <h2>4. Your account</h2>
      <ul>
        <li>You&rsquo;re responsible for keeping your login credentials safe.</li>
        <li>You&rsquo;re responsible for everything that happens under your account.</li>
        <li>Tell us at <a href="mailto:support@kollabo.pk">support@kollabo.pk</a> if
          you suspect unauthorised access.</li>
        <li>We may suspend or close accounts that violate these Terms or that we
          reasonably believe are being used for fraud or abuse.</li>
      </ul>

      <h2>5. Content and conduct</h2>
      <p>You agree not to use Kollabo to:</p>
      <ul>
        <li>Post content that is illegal, defamatory, harassing, hateful, sexually
          explicit, or that promotes violence.</li>
        <li>Misrepresent who you are, your skills, your work history, or your
          audience.</li>
        <li>Spam, scam, or solicit other users for off-platform deals that bypass
          Kollabo&rsquo;s payment protection.</li>
        <li>Upload content you don&rsquo;t own or have the right to share.</li>
        <li>Attempt to hack, scrape, or otherwise disrupt the Service.</li>
      </ul>
      <p>
        We may remove content or restrict accounts that violate these rules. For
        serious violations, we&rsquo;ll close the account and may report the matter to
        the appropriate authorities.
      </p>

      <h2>6. Contracts, milestones, and (planned) escrow payments</h2>
      <p>
        When a creator accepts a campaign and a contract is created, both sides
        agree to the rate, deliverables, and milestones listed in the contract.
        Milestones are submitted by the creator and approved by the brand before
        payment is released.
      </p>
      <p>
        We plan to introduce escrow payments via a regulated Pakistani payment
        provider. Until escrow is live, Kollabo does not hold or move money between
        brands and creators &mdash; payments are settled directly between the two parties
        using whatever method they agree on (JazzCash, bank transfer, etc.).
      </p>
      <p>
        Once escrow is live, separate Payment Terms will apply and will form part of
        your agreement with us.
      </p>

      <h2>7. Reviews</h2>
      <p>
        Both brands and creators can leave a 1&ndash;5 star review after a contract is
        completed. Reviews are tied to the actual contract and cannot be edited or
        deleted once posted. Reviews must be honest and based on the actual work
        done.
      </p>

      <h2>8. Intellectual property</h2>
      <ul>
        <li>You keep ownership of the content you upload (portfolio items, profile
          photos, etc.). You give Kollabo a limited licence to display that content
          on the platform for as long as your account is active.</li>
        <li>The work delivered under a contract is owned by whoever the contract
          specifies &mdash; usually the brand, once paid in full.</li>
        <li>The Kollabo name, logo, and design are ours. Please don&rsquo;t copy them.</li>
      </ul>

      <h2>9. Service availability</h2>
      <p>
        We do our best to keep Kollabo running, but we can&rsquo;t promise it will always
        be available or bug-free. We may need to take the Service down for
        maintenance, updates, or reasons outside our control.
      </p>

      <h2>10. Disclaimers and limitation of liability</h2>
      <p>
        Kollabo is provided &ldquo;as is&rdquo;, without warranty of any kind. To the
        maximum extent permitted by Pakistani law, we are not liable for any
        indirect, incidental, or consequential damages arising from your use of
        the Service. Our total liability for any claim relating to the Service is
        limited to the amount you paid us in the 12 months before the claim
        (currently PKR 0, since we don&rsquo;t charge users yet).
      </p>

      <h2>11. Suspension and termination</h2>
      <p>
        You can close your account at any time from your account settings. We may
        suspend or terminate your account if you breach these Terms, with or
        without notice. Upon termination, your right to use the Service ends, but
        the sections that should survive (payment records, intellectual property,
        disclaimers, governing law) continue to apply.
      </p>

      <h2>12. Changes to these Terms</h2>
      <p>
        We may update these Terms as Kollabo grows. Material changes will be
        notified by email or in-app message at least 14 days before they take
        effect. Continued use after the effective date means you accept the new
        Terms.
      </p>

      <h2>13. Governing law and disputes</h2>
      <p>
        These Terms are governed by the laws of the Islamic Republic of Pakistan.
        Any dispute that cannot be resolved informally will be subject to the
        exclusive jurisdiction of the courts in Islamabad, Pakistan.
      </p>

      <h2>14. Contact</h2>
      <p>
        Questions, complaints, or notices:{' '}
        <a href="mailto:support@kollabo.pk">support@kollabo.pk</a>
        <br />
        Operator: Hammad Abid, Islamabad, Pakistan.
      </p>
    </main>
  );
}
