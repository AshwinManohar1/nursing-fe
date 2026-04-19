import LegalPageLayout from '../layouts/LegalPageLayout';

const PrivacyPolicyPage = () => {
  return (
    <LegalPageLayout title="Privacy Policy" lastUpdated="April 19, 2026">
      <p>
        ShiftWise ("we", "our", or "us") is an AI-powered clinical scheduling
        platform. This Privacy Policy describes how we collect, use, and
        safeguard information when you use ShiftWise in a clinical setting.
      </p>

      <h2>1. Information We Collect</h2>
      <p>
        We collect the minimum information necessary to operate the service,
        including:
      </p>
      <ul>
        <li>Employee identifiers issued by your healthcare organization</li>
        <li>Role, ward assignment, and scheduling preferences</li>
        <li>Shift attendance, roster patches, and transfer history</li>
        <li>Authentication tokens and device information needed to secure your session</li>
      </ul>
      <p>
        ShiftWise does not collect patient health information or any
        clinically identifiable data about the people being cared for.
      </p>

      <h2>2. How We Use Information</h2>
      <p>
        Information is used to generate rosters, balance staffing across
        wards, surface fairness and compliance insights, and provide the AI
        Copilot features available inside the product. Aggregated,
        non-identifying analytics may be used to improve the service.
      </p>

      <h2>3. Data Sharing</h2>
      <p>
        We do not sell personal information. Information is shared only with
        your healthcare organization (the data controller) and with service
        providers who process data on our behalf under written agreements.
      </p>

      <h2>4. Data Retention</h2>
      <p>
        Rostering records are retained for the duration required by your
        organization's retention policy and applicable local regulation.
        Authentication artifacts expire automatically.
      </p>

      <h2>5. Your Rights</h2>
      <p>
        You may request access to, correction of, or deletion of personal
        information by contacting your organization's clinical administrator.
        We assist controllers in honoring verified requests.
      </p>

      <h2>6. Security</h2>
      <p>
        Data is encrypted in transit. Access to operational systems is
        restricted to authorized personnel and logged. We continually review
        and improve our technical and organizational safeguards.
      </p>

      <h2>7. Contact</h2>
      <p>
        For questions about this policy, contact your organization's Clinical
        IT Support desk or email <a href="mailto:privacy@shiftwise.example">privacy@shiftwise.example</a>.
      </p>
    </LegalPageLayout>
  );
};

export default PrivacyPolicyPage;
