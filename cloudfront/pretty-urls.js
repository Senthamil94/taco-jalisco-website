/**
 * CloudFront Function — viewer-request
 *
 * S3 only has events.html, menu.html, hiring.html, index.html.
 * Without this rewrite, https://tacosjaliscovallejo.com/events
 * returns AccessDenied XML.
 *
 * AWS console:
 * 1. CloudFront → Functions → Create function (name: pretty-urls)
 * 2. Paste this file → Save → Publish
 * 3. Associate → your tacosjaliscovallejo.com distribution
 *    → Default (*) behavior → Event: Viewer request
 * 4. Invalidations → Create → paths: /events /menu /hiring /index /*
 */
function handler(event) {
  var request = event.request;
  var path = request.uri;
  if (path.length > 1 && path.charAt(path.length - 1) === '/') {
    path = path.substring(0, path.length - 1);
  }
  var pages = {
    '/menu': '/menu.html',
    '/events': '/events.html',
    '/hiring': '/hiring.html',
    '/index': '/index.html'
  };
  if (pages[path]) {
    request.uri = pages[path];
  }
  return request;
}
