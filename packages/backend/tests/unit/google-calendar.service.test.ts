import { resolveEventVisibility, parseEventDescription } from '../../src/services/google-calendar.service';

describe('resolveEventVisibility', () => {
  // An event is PUBLIC if EITHER the native Google Calendar visibility is
  // "public" OR the description contains a [PUBLIC] tag. Everything else
  // (private, confidential, default, unset) is members-only.

  it('maps native "public" visibility to PUBLIC', () => {
    expect(resolveEventVisibility('public')).toBe('PUBLIC');
  });

  it('is case-insensitive for native "public"', () => {
    expect(resolveEventVisibility('PUBLIC')).toBe('PUBLIC');
  });

  it('maps native "private" visibility to MEMBER_ONLY', () => {
    expect(resolveEventVisibility('private')).toBe('MEMBER_ONLY');
  });

  it('maps "confidential" visibility to MEMBER_ONLY', () => {
    expect(resolveEventVisibility('confidential')).toBe('MEMBER_ONLY');
  });

  it('maps "default" visibility to MEMBER_ONLY', () => {
    expect(resolveEventVisibility('default')).toBe('MEMBER_ONLY');
  });

  it('defaults to MEMBER_ONLY when visibility and description are missing', () => {
    expect(resolveEventVisibility(undefined)).toBe('MEMBER_ONLY');
    expect(resolveEventVisibility(null)).toBe('MEMBER_ONLY');
  });

  it('maps a [PUBLIC] description tag to PUBLIC even when visibility is unset', () => {
    expect(resolveEventVisibility(undefined, 'Fun show! [PUBLIC]')).toBe('PUBLIC');
  });

  it('is case-insensitive for the [PUBLIC] tag and works with "default" visibility', () => {
    expect(resolveEventVisibility('default', '[public]')).toBe('PUBLIC');
  });

  it('maps a plain description with no tag to MEMBER_ONLY', () => {
    expect(resolveEventVisibility('default', 'Just a normal event')).toBe('MEMBER_ONLY');
  });

  it('is PUBLIC when either signal is present (native public wins with no tag)', () => {
    expect(resolveEventVisibility('public', 'no tag here')).toBe('PUBLIC');
  });
});

describe('parseEventDescription — [REGISTER] tag', () => {
  it('extracts a plain [REGISTER: url] link', () => {
    const { externalRegistrationUrl } = parseEventDescription('Come join us! [REGISTER: https://forms.gle/abc]');
    expect(externalRegistrationUrl).toBe('https://forms.gle/abc');
  });

  it('strips the [REGISTER: ...] tag from the displayed description', () => {
    const { description } = parseEventDescription('Come join us! [REGISTER: https://forms.gle/abc]');
    expect(description).toBe('Come join us!');
    expect(description).not.toMatch(/REGISTER/i);
  });

  it('returns undefined when there is no [REGISTER] tag', () => {
    expect(parseEventDescription('Just a normal event').externalRegistrationUrl).toBeUndefined();
  });

  it('extracts the URL when Google Calendar auto-linkifies it into an <a href> tag', () => {
    const desc = 'Show info [REGISTER: <a href="https://sites.google.com/view/pp4hshows/home">https://sites.google.com/view/pp4hshows/home</a>]';
    expect(parseEventDescription(desc).externalRegistrationUrl).toBe('https://sites.google.com/view/pp4hshows/home');
  });

  it('handles the real-world <pre><code> + fbclid mangled case', () => {
    const desc =
      'Register on the show website.<br><br><pre><code>[REGISTER: </code>' +
      '<a href="https://sites.google.com/view/pp4hshows/home?fbclid=IwABC123" target="_blank">' +
      '<u>https://sites.google.com/view/pp4hshows/home</u></a>]</pre>';
    const { externalRegistrationUrl } = parseEventDescription(desc);
    expect(externalRegistrationUrl).toBe('https://sites.google.com/view/pp4hshows/home?fbclid=IwABC123');
  });

  it('decodes &amp; entities in the extracted URL', () => {
    const { externalRegistrationUrl } = parseEventDescription('[REGISTER: https://ex.com/f?a=1&amp;b=2]');
    expect(externalRegistrationUrl).toBe('https://ex.com/f?a=1&b=2');
  });
});

describe('parseEventDescription — Google Form fallback (no tag)', () => {
  it('detects a bare Google Forms link when there is no [REGISTER] tag', () => {
    const { externalRegistrationUrl } = parseEventDescription('Register here! https://docs.google.com/forms/d/e/ABC/viewform');
    expect(externalRegistrationUrl).toBe('https://docs.google.com/forms/d/e/ABC/viewform');
  });

  it('detects a forms.gle short link', () => {
    expect(parseEventDescription('Sign up: https://forms.gle/xyz').externalRegistrationUrl).toBe('https://forms.gle/xyz');
  });

  it('picks the Google Form over an unrelated website link in the same description', () => {
    const desc =
      '<ul><li>Event Website<br><a href="https://sites.google.com/view/ponyexpressgymkhana/home">site</a></li>' +
      '<li>Register here! <br><a href="https://docs.google.com/forms/d/e/1FAIpQLSf/viewform?usp=sharing&amp;ouid=108457447631572864665">form</a></li></ul>';
    expect(parseEventDescription(desc).externalRegistrationUrl).toBe(
      'https://docs.google.com/forms/d/e/1FAIpQLSf/viewform?usp=sharing&ouid=108457447631572864665'
    );
  });

  it('does NOT grab an arbitrary non-Form link when there is no tag', () => {
    const desc = 'More info at <a href="https://sites.google.com/view/pp4hshows/home">our website</a>.';
    expect(parseEventDescription(desc).externalRegistrationUrl).toBeUndefined();
  });

  it('lets an explicit [REGISTER] tag win over a Google Form elsewhere', () => {
    const desc = '[REGISTER: https://sites.google.com/view/pp4hshows/home] Also see https://docs.google.com/forms/d/e/ABC/viewform';
    expect(parseEventDescription(desc).externalRegistrationUrl).toBe('https://sites.google.com/view/pp4hshows/home');
  });
});
