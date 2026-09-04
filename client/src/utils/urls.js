/**
 * Base URL that OTHER devices (players' phones) can use to reach this app.
 * Priority: admin-configured publicUrl → LAN IP (when host is on localhost) → current origin.
 */
export function getPublicBaseUrl(settings) {
  if (settings?.publicUrl) return settings.publicUrl.replace(/\/+$/, '');

  const { protocol, hostname, port } = window.location;
  const isLocal = hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
  if (isLocal && settings?.lanIp) {
    return `${protocol}//${settings.lanIp}${port ? `:${port}` : ''}`;
  }
  return window.location.origin;
}

export function getJoinUrl(settings, pin) {
  return `${getPublicBaseUrl(settings)}/join/${pin}`;
}

export function getResultsUrl(settings, pin) {
  return `${getPublicBaseUrl(settings)}/results/${pin}`;
}

/** Display form without protocol, e.g. "192.168.1.5:5173" */
export function displayHost(url) {
  return url.replace(/^https?:\/\//, '');
}
