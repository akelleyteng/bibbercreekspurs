import { resolveEventVisibility, parseEventDescription, resolveRegistrationUrl } from '../../src/services/google-calendar.service';

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

describe('parseEventDescription — display cleaning', () => {
  it('strips the [REGISTER: ...] tag from the displayed description', () => {
    const { description } = parseEventDescription('Come join us! [REGISTER: https://forms.gle/abc]');
    expect(description).toBe('Come join us!');
    expect(description).not.toMatch(/REGISTER/i);
  });

  it('strips the [PUBLIC] tag and reports isPublic', () => {
    const { description, isPublic } = parseEventDescription('Open show [PUBLIC]');
    expect(description).toBe('Open show');
    expect(isPublic).toBe(true);
  });

  it('strips an HTML-linkified [REGISTER: ...] block', () => {
    const { description } = parseEventDescription('Info <pre><code>[REGISTER: </code><a href="https://x.com">x</a>]</pre>');
    expect(description).not.toMatch(/REGISTER/i);
  });
});

describe('resolveRegistrationUrl — [REGISTER] tag', () => {
  it('extracts a plain [REGISTER: url] link', () => {
    expect(resolveRegistrationUrl('Come join us! [REGISTER: https://forms.gle/abc]', true)).toBe('https://forms.gle/abc');
  });

  it('extracts the URL when Google Calendar auto-linkifies it into an <a href> tag', () => {
    const desc = 'Show info [REGISTER: <a href="https://sites.google.com/view/pp4hshows/home">https://sites.google.com/view/pp4hshows/home</a>]';
    expect(resolveRegistrationUrl(desc, true)).toBe('https://sites.google.com/view/pp4hshows/home');
  });

  it('handles the real-world <pre><code> + fbclid mangled case', () => {
    const desc =
      'Register on the show website.<br><br><pre><code>[REGISTER: </code>' +
      '<a href="https://sites.google.com/view/pp4hshows/home?fbclid=IwABC123" target="_blank">' +
      '<u>https://sites.google.com/view/pp4hshows/home</u></a>]</pre>';
    expect(resolveRegistrationUrl(desc, true)).toBe('https://sites.google.com/view/pp4hshows/home?fbclid=IwABC123');
  });

  it('decodes &amp; entities in the extracted URL', () => {
    expect(resolveRegistrationUrl('[REGISTER: https://ex.com/f?a=1&amp;b=2]', true)).toBe('https://ex.com/f?a=1&b=2');
  });
});

describe('resolveRegistrationUrl — priority: Google Form > [REGISTER] > any URL', () => {
  it('detects a bare Google Forms link', () => {
    expect(resolveRegistrationUrl('Register here! https://docs.google.com/forms/d/e/ABC/viewform', true))
      .toBe('https://docs.google.com/forms/d/e/ABC/viewform');
  });

  it('detects a forms.gle short link', () => {
    expect(resolveRegistrationUrl('Sign up: https://forms.gle/xyz', true)).toBe('https://forms.gle/xyz');
  });

  it('picks the Google Form over an unrelated website link (real Pony Express case)', () => {
    const desc =
      '<ul><li>Event Website<br><a href="https://sites.google.com/view/ponyexpressgymkhana/home">site</a></li>' +
      '<li>Register here! <br><a href="https://docs.google.com/forms/d/e/1FAIpQLSf/viewform?usp=sharing&amp;ouid=108457447631572864665">form</a></li></ul>';
    expect(resolveRegistrationUrl(desc, true)).toBe(
      'https://docs.google.com/forms/d/e/1FAIpQLSf/viewform?usp=sharing&ouid=108457447631572864665'
    );
  });

  it('prefers a Google Form over an explicit [REGISTER] tag', () => {
    const desc = '[REGISTER: https://sites.google.com/view/pp4hshows/home] Also see https://docs.google.com/forms/d/e/ABC/viewform';
    expect(resolveRegistrationUrl(desc, true)).toBe('https://docs.google.com/forms/d/e/ABC/viewform');
  });

  it('falls back to the [REGISTER] tag when there is no Google Form', () => {
    const desc = '[REGISTER: https://sites.google.com/view/pp4hshows/home]';
    expect(resolveRegistrationUrl(desc, true)).toBe('https://sites.google.com/view/pp4hshows/home');
  });

  it('for PUBLIC events, falls back to any link as a last resort', () => {
    const desc = 'More info at <a href="https://sites.google.com/view/pp4hshows/home">our website</a>.';
    expect(resolveRegistrationUrl(desc, true)).toBe('https://sites.google.com/view/pp4hshows/home');
  });

  it('for non-public events, does NOT grab an arbitrary link (no form/tag)', () => {
    const desc = 'More info at <a href="https://sites.google.com/view/pp4hshows/home">our website</a>.';
    expect(resolveRegistrationUrl(desc, false)).toBeUndefined();
  });

  it('returns undefined when the description has no links', () => {
    expect(resolveRegistrationUrl('Just a normal event', true)).toBeUndefined();
  });
});
