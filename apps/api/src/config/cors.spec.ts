import { isExpoDevOrigin } from './cors';

describe('isExpoDevOrigin', () => {
  it('allows Expo web and LAN', () => {
    expect(isExpoDevOrigin('http://localhost:43131')).toBe(true);
    expect(isExpoDevOrigin('http://127.0.0.1:8081')).toBe(true);
    expect(isExpoDevOrigin('http://192.168.1.20:8081')).toBe(true);
    expect(isExpoDevOrigin('https://u.expo.dev')).toBe(true);
    expect(isExpoDevOrigin('https://dem-undergraduate-flashers-without.trycloudflare.com')).toBe(true);
    expect(isExpoDevOrigin('https://evil.example')).toBe(false);
  });
});
