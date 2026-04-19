import LegalPageLayout from '../layouts/LegalPageLayout';

const AccessibilityPage = () => {
  return (
    <LegalPageLayout title="Accessibility" lastUpdated="April 19, 2026">
      <p>
        ShiftWise is designed to be usable by every member of a clinical
        team. We aim to meet the Web Content Accessibility Guidelines (WCAG)
        2.1 Level AA and are continually improving the product.
      </p>

      <h2>1. Conformance</h2>
      <p>
        We target WCAG 2.1 Level AA conformance. We audit key flows —
        sign-in, roster editing, shift transfers, and insights — against
        this standard and address findings as part of regular development.
      </p>

      <h2>2. Features</h2>
      <ul>
        <li>Semantic markup and ARIA labeling on interactive controls</li>
        <li>Keyboard navigation across roster grids, dialogs, and menus</li>
        <li>Colors chosen for sufficient contrast on primary text and controls</li>
        <li>Form fields with visible labels, placeholders, and error messaging</li>
        <li>Focus indicators that meet contrast requirements</li>
      </ul>

      <h2>3. Compatibility</h2>
      <p>
        ShiftWise is tested with current versions of Chrome, Edge, Firefox,
        and Safari, and is designed to work with common screen readers
        including NVDA, JAWS, and VoiceOver.
      </p>

      <h2>4. Known Limitations</h2>
      <p>
        Some data-dense views — such as the weekly roster grid — are best
        experienced on wider screens. Where layout relies on two-dimensional
        orientation, keyboard and screen-reader equivalents are provided.
      </p>

      <h2>5. Feedback</h2>
      <p>
        If you encounter an accessibility barrier, please let us know. We
        treat accessibility reports as high-priority issues.
      </p>
      <p>
        Contact your Clinical IT Support desk, or email{' '}
        <a href="mailto:accessibility@shiftwise.example">
          accessibility@shiftwise.example
        </a>
        . Please describe the page, the barrier you encountered, and any
        assistive technology you were using.
      </p>
    </LegalPageLayout>
  );
};

export default AccessibilityPage;
