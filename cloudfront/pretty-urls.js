/**
 * CloudFront Function — viewer-request
 *
 * Not used on this site: live hosting is Lightsail CDN + a Lightsail
 * bucket. Lightsail CDN cannot attach CloudFront Functions, so /events
 * must be a real object in the bucket (see sync_pretty_pages.py).
 *
 * Keep this file only if the site is later moved to a full CloudFront
 * distribution. Then: Functions → paste → Publish → Associate as
 * Viewer request on the default (*) behavior → invalidate /*.
 */
function handler(event) {
  var request = event.request;
  var uri = request.uri;

  if (uri.indexOf('.') !== -1) {
    return request;
  }

  if (uri.length > 1 && uri.charAt(uri.length - 1) === '/') {
    uri = uri.substring(0, uri.length - 1);
  }

  if (!uri || uri === '/') {
    return request;
  }

  request.uri = uri + '.html';
  return request;
}
