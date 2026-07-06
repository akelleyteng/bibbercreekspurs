import { resolveEventVisibility } from '../../src/services/google-calendar.service';

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
