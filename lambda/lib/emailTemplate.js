'use strict';

// Layout adapted from boons marketplace refund.php (table email, navy band, white body).
// Logo must be an absolute HTTPS URL — email clients cannot load relative site paths.

const LOGO_URL = 'https://tacosjaliscovallejo.com/assets/logo.png';
const SITE_URL = 'https://tacosjaliscovallejo.com';
const FACEBOOK_URL = 'https://www.facebook.com/TacosJaliscoVallejo';
const INSTAGRAM_URL = 'https://www.instagram.com/tacosjaliscovallejo';

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderRow({ label, value, href }) {
  const safeLabel = escapeHtml(label);
  const safeValue = escapeHtml(value || 'n/a');
  const display = href
    ? `<a href="${escapeHtml(href)}" style="color:#ffffff;font-weight:500;">${safeValue}</a>`
    : `<span style="font-weight:500;">${safeValue}</span>`;

  return `
    <tr>
      <td bgcolor="#202B49" valign="top" style="padding:5px 27px;font-size:20px;font-weight:400;color:#fff;text-align:left;font-family:Outfit,sans-serif,Arial;">
        <p style="margin:0px;">${safeLabel}: ${display}</p>
      </td>
    </tr>
  `.trim();
}

function renderOwnerEmail({ title, intro, rows }) {
  const safeTitle = escapeHtml(title);
  const fieldRows = (rows || []).map(renderRow).join('\n');

  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html lang="en">
  <head>
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600&display=swap" rel="stylesheet">
    <style type="text/css">
      *{font-family:Outfit,sans-serif,Arial;}
      .emailTable{width:640px;text-align:center;}
      @media only screen and (max-width: 600px) {
        .emailTable{width:100%!important;}
      }
    </style>
  </head>
  <body style="background-color:#0000000D;">
    <table width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#f2f2f2">
      <tbody>
        <tr>
          <td valign="top" align="center">
            <table cellspacing="0" cellpadding="0" border="0" align="center" class="emailTable">
              <tbody>
                <tr>
                  <td bgcolor="#fff" align="center" style="padding:20px 0">
                    <table border="0" cellpadding="0" cellspacing="0" width="100%">
                      <tbody>
                        <tr>
                          <td bgcolor="#ffffff" align="center" valign="top" style="padding:10px 0px;border-radius:4px 4px 0px 0px;">
                            <img src="${LOGO_URL}" alt="Tacos Jalisco" width="125" style="display:block;border:0px;" />
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td bgcolor="#202B49">
                    <table bgcolor="#202B49" border="0" cellpadding="0" cellspacing="0" width="100%">
                      <tbody>
                        <tr>
                          <td bgcolor="#202B49" valign="top" style="text-align:center;padding:0px;font-family:Outfit,sans-serif,Arial;">
                            <p style="margin:15px auto 0px;font-size:36px;font-weight:500;color:#fff;">${safeTitle}</p>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                    <table bgcolor="#202B49" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:15px;">
                      <tbody>
                        <tr>
                          <td bgcolor="#202B49" valign="top" style="padding:15px 27px 5px;font-size:20px;font-weight:500;color:#fff;text-align:left;font-family:Outfit,sans-serif,Arial;">
                            Tacos Jalisco
                          </td>
                        </tr>
                        ${fieldRows}
                      </tbody>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td bgcolor="#ffffff" align="center" style="background:#fff;padding:20px 0px 0px;">
                    <table border="0" cellpadding="0" cellspacing="0" width="100%">
                      <tbody>
                        <tr>
                          <td bgcolor="#ffffff" align="left" style="color:#000;font-size:20px;font-weight:300;line-height:25px;padding:0px 27px;font-family:Outfit,sans-serif,Arial;">
                            <p style="margin:0;padding-bottom:10px;">${intro}</p>
                          </td>
                        </tr>
                        <tr>
                          <td bgcolor="#ffffff" align="left" style="padding:20px 27px;color:#000;font-size:20px;font-weight:300;line-height:25px;font-family:Outfit,sans-serif,Arial;">
                            <p style="margin:0;padding-bottom:10px;">Tacos Jalisco<br>3420 Sonoma Blvd, Vallejo, CA 94590</p>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="background-color:#202B49;text-align:center;">
                    <table cellspacing="0" cellpadding="0" width="100%">
                      <tr>
                        <td style="text-align:center;padding:10px 25px;font-family:Outfit,sans-serif,Arial;">
                          <a href="${FACEBOOK_URL}" style="text-decoration:none;color:#ffffff;font-size:14px;font-weight:400;padding-right:16px;">Facebook</a>
                          <a href="${INSTAGRAM_URL}" style="text-decoration:none;color:#ffffff;font-size:14px;font-weight:400;">Instagram</a>
                        </td>
                      </tr>
                      <tr>
                        <td style="color:#ffffff;font-size:14px;font-weight:400;line-height:17.6px;text-align:center;padding:15px 0px;font-family:Outfit,sans-serif,Arial;">Powered by <a href="https://www.boons.io/" style="color:#ffffff;text-decoration:none;">boons.io</a></td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </tbody>
            </table>
          </td>
        </tr>
      </tbody>
    </table>
  </body>
</html>`;
}

module.exports = { renderOwnerEmail, escapeHtml, SITE_URL };
