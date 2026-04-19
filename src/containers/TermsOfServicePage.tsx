import LegalPageLayout from '../layouts/LegalPageLayout';

const TermsOfServicePage = () => {
  return (
    <LegalPageLayout title="Terms of Service" lastUpdated="April 19, 2026">
      <p>
        These Terms of Service govern your use of ShiftWise. By accessing
        ShiftWise on behalf of your healthcare organization, you agree to
        these terms.
      </p>

      <h2>1. Accounts</h2>
      <p>
        Access is provided through accounts issued by your healthcare
        organization. You are responsible for keeping your credentials
        confidential and for all activity under your account. Suspected
        compromise should be reported to Clinical IT Support immediately.
      </p>

      <h2>2. Acceptable Use</h2>
      <p>You agree to use ShiftWise only for lawful, work-related purposes. You will not:</p>
      <ul>
        <li>Attempt to interfere with scheduling integrity, fairness scores, or audit trails</li>
        <li>Share, export, or reuse rostering data outside your organization's policies</li>
        <li>Attempt to access accounts, wards, or records for which you are not authorized</li>
        <li>Probe, scan, or reverse-engineer the service</li>
      </ul>

      <h2>3. AI Features</h2>
      <p>
        ShiftWise uses AI to suggest rosters, surface staffing insights, and
        answer Copilot questions. AI suggestions are decision support — they
        do not replace the judgment of ward in-charges, scheduling managers,
        or clinical leadership.
      </p>

      <h2>4. Availability</h2>
      <p>
        We aim for high availability but do not guarantee uninterrupted
        service. Scheduled maintenance windows and emergency changes may
        occur. Planned windows are communicated in advance where practical.
      </p>

      <h2>5. Intellectual Property</h2>
      <p>
        All rights in the ShiftWise software, brand, and documentation are
        owned by ShiftWise or its licensors. Rostering data generated in the
        course of normal use belongs to your healthcare organization.
      </p>

      <h2>6. Termination</h2>
      <p>
        Access may be revoked by your organization at any time and by
        ShiftWise in the event of a violation of these terms or applicable
        law.
      </p>

      <h2>7. Limitation of Liability</h2>
      <p>
        To the fullest extent permitted by law, ShiftWise is not liable for
        indirect, incidental, or consequential damages arising out of the
        use of the service. Operational decisions remain the responsibility
        of the healthcare organization and its staff.
      </p>

      <h2>8. Contact</h2>
      <p>
        Questions about these terms may be directed to your Clinical IT
        Support desk or <a href="mailto:legal@shiftwise.example">legal@shiftwise.example</a>.
      </p>
    </LegalPageLayout>
  );
};

export default TermsOfServicePage;
