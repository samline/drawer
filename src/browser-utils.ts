export function isMobileFirefox(): boolean | undefined {
  const userAgent = navigator.userAgent;
  return (
    typeof window !== 'undefined' &&
    ((/Firefox/.test(userAgent) && /Mobile/.test(userAgent)) || /FxiOS/.test(userAgent))
  );
}

export function isMac(): boolean | undefined {
  return testPlatform(/^Mac/);
}

export function isIPhone(): boolean | undefined {
  return testPlatform(/^iPhone/);
}

export function isSafari(): boolean | undefined {
  return /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
}

export function isIPad(): boolean | undefined {
  return testPlatform(/^iPad/) || (isMac() && navigator.maxTouchPoints > 1);
}

export function isIOS(): boolean | undefined {
  return isIPhone() || isIPad();
}

export function testPlatform(re: RegExp): boolean | undefined {
  return typeof window !== 'undefined' && window.navigator != null ? re.test(window.navigator.platform) : undefined;
}