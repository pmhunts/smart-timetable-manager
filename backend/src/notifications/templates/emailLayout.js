const env = require('../../config/env');

const escapeHtml = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const ACCENT = '#6366f1';

/** Key/value details table. rows: [[label, value], ...] */
const detailsTable = (rows) => `
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse;margin:16px 0;background:#f8fafc;border-radius:10px">
    ${rows
      .filter(([, v]) => v !== undefined && v !== null && v !== '')
      .map(
        ([label, value]) => `
      <tr>
        <td style="padding:10px 16px;color:#64748b;font-size:13px;width:38%;border-bottom:1px solid #eef2f7">${escapeHtml(label)}</td>
        <td style="padding:10px 16px;color:#0f172a;font-size:14px;font-weight:600;border-bottom:1px solid #eef2f7">${escapeHtml(value)}</td>
      </tr>`
      )
      .join('')}
  </table>`;

/** Simple list of tasks: [{ time, title, meta }] */
const taskList = (items) => `
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse;margin:16px 0">
    ${items
      .map(
        (i) => `
      <tr>
        <td style="padding:10px 12px;white-space:nowrap;color:${ACCENT};font-weight:700;font-size:13px;vertical-align:top;width:1%">${escapeHtml(i.time)}</td>
        <td style="padding:10px 12px;border-left:2px solid #e0e7ff">
          <div style="color:#0f172a;font-weight:600;font-size:14px">${escapeHtml(i.title)}</div>
          ${i.meta ? `<div style="color:#64748b;font-size:12px;margin-top:2px">${escapeHtml(i.meta)}</div>` : ''}
        </td>
      </tr>`
      )
      .join('')}
  </table>`;

/**
 * Wraps body HTML in the branded, responsive email layout.
 * `body` must already be escaped HTML.
 */
const layout = ({ title, preheader = '', body, ctaLabel = 'Open my timetable', ctaUrl = `${env.frontendUrl}/dashboard` }) => `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${escapeHtml(title)}</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif">
  <span style="display:none!important;opacity:0;color:transparent;height:0;width:0;overflow:hidden">${escapeHtml(preheader)}</span>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 12px">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(15,23,42,.08)">
        <tr>
          <td style="background:linear-gradient(135deg,#6366f1,#8b5cf6);padding:22px 28px">
            <div style="color:#ffffff;font-size:13px;letter-spacing:.08em;text-transform:uppercase;opacity:.85">Smart Timetable Manager</div>
            <div style="color:#ffffff;font-size:20px;font-weight:700;margin-top:4px">${escapeHtml(title)}</div>
          </td>
        </tr>
        <tr>
          <td style="padding:28px;color:#334155;font-size:15px;line-height:1.6">
            ${body}
            <div style="margin-top:24px">
              <a href="${escapeHtml(ctaUrl)}" style="display:inline-block;background:${ACCENT};color:#ffffff;text-decoration:none;font-weight:600;padding:12px 20px;border-radius:10px;font-size:14px">${escapeHtml(ctaLabel)}</a>
            </div>
            <p style="margin:28px 0 0;color:#334155">Regards,<br><strong>Smart Timetable Manager</strong></p>
          </td>
        </tr>
        <tr>
          <td style="padding:16px 28px;background:#f8fafc;color:#94a3b8;font-size:12px;line-height:1.5">
            You are receiving this because email notifications are enabled for your account.
            Manage them in <a href="${escapeHtml(env.frontendUrl)}/notifications" style="color:${ACCENT}">Notification Center</a>.
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

const p = (text) => `<p style="margin:0 0 12px">${escapeHtml(text)}</p>`;

module.exports = { layout, detailsTable, taskList, escapeHtml, p };
