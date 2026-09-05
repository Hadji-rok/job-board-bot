const { AttachmentBuilder } = require('discord.js');

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Fetches the full message history of a channel (oldest first), paginating
 * backwards in batches of 100. Capped to avoid huge transcripts / rate limits.
 */
async function fetchAllMessages(channel, cap = 1000) {
  let all = [];
  let lastId;

  while (all.length < cap) {
    const batch = await channel.messages.fetch({ limit: 100, before: lastId });
    if (batch.size === 0) break;
    all = all.concat(Array.from(batch.values()));
    lastId = batch.last().id;
    if (batch.size < 100) break;
  }

  return all.sort((a, b) => a.createdTimestamp - b.createdTimestamp);
}

/**
 * Builds an HTML transcript file (AttachmentBuilder) for the given channel.
 */
async function buildTranscript(channel, meta = {}) {
  const messages = await fetchAllMessages(channel);

  const rows = messages
    .map((msg) => {
      const author = escapeHtml(msg.author?.tag || 'Unknown');
      const avatar = msg.author?.displayAvatarURL({ size: 64 }) || '';
      const time = new Date(msg.createdTimestamp).toLocaleString('en-US', {
        dateStyle: 'medium',
        timeStyle: 'short',
      });
      const content = msg.content ? escapeHtml(msg.content).replace(/\n/g, '<br>') : '<em>(no text content)</em>';

      const embedHtml = msg.embeds
        .map((e) => {
          const title = e.title ? `<div class="embed-title">${escapeHtml(e.title)}</div>` : '';
          const desc = e.description ? `<div class="embed-desc">${escapeHtml(e.description).replace(/\n/g, '<br>')}</div>` : '';
          const fields = (e.fields || [])
            .map((f) => `<div class="embed-field"><strong>${escapeHtml(f.name)}</strong><br>${escapeHtml(f.value)}</div>`)
            .join('');
          return `<div class="embed">${title}${desc}${fields}</div>`;
        })
        .join('');

      const attachmentHtml = msg.attachments
        .map((a) => `<div class="attachment">📎 <a href="${a.url}">${escapeHtml(a.name)}</a></div>`)
        .join('');

      return `
        <div class="message">
          <img class="avatar" src="${avatar}" />
          <div class="message-body">
            <div class="message-header">
              <span class="author">${author}</span>
              <span class="timestamp">${time}</span>
            </div>
            <div class="content">${content}</div>
            ${embedHtml}
            ${attachmentHtml}
          </div>
        </div>`;
    })
    .join('\n');

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Transcript — ${escapeHtml(channel.name)}</title>
<style>
  body { background: #313338; color: #dbdee1; font-family: 'gg sans', 'Helvetica Neue', Arial, sans-serif; margin: 0; padding: 24px; }
  .header { border-bottom: 1px solid #3f4147; padding-bottom: 16px; margin-bottom: 16px; }
  .header h1 { margin: 0 0 4px 0; font-size: 20px; color: #fff; }
  .header .meta { color: #949ba4; font-size: 13px; }
  .message { display: flex; gap: 12px; padding: 8px 0; }
  .avatar { width: 40px; height: 40px; border-radius: 50%; flex-shrink: 0; }
  .message-header { display: flex; align-items: baseline; gap: 8px; }
  .author { font-weight: 600; color: #fff; }
  .timestamp { font-size: 11px; color: #949ba4; }
  .content { margin-top: 2px; white-space: pre-wrap; word-break: break-word; }
  .embed { border-left: 4px solid #0878d1; background: #2b2d31; border-radius: 4px; padding: 10px 12px; margin-top: 6px; max-width: 520px; }
  .embed-title { font-weight: 600; color: #fff; margin-bottom: 4px; }
  .embed-desc { color: #dbdee1; font-size: 14px; }
  .embed-field { font-size: 13px; margin-top: 6px; }
  .attachment { margin-top: 4px; font-size: 13px; }
  .attachment a { color: #00a8fc; text-decoration: none; }
</style>
</head>
<body>
  <div class="header">
    <h1>#${escapeHtml(channel.name)}</h1>
    <div class="meta">
      ${meta.ticketLabel ? `Type: ${escapeHtml(meta.ticketLabel)} · ` : ''}
      ${meta.openedByTag ? `Opened by: ${escapeHtml(meta.openedByTag)} · ` : ''}
      ${meta.closedByTag ? `Closed by: ${escapeHtml(meta.closedByTag)} · ` : ''}
      ${messages.length} messages
    </div>
  </div>
  ${rows || '<p style="color:#949ba4;">No messages in this channel.</p>'}
</body>
</html>`;

  const buffer = Buffer.from(html, 'utf-8');
  const attachment = new AttachmentBuilder(buffer, { name: `transcript-${channel.name}.html` });

  return { attachment, messageCount: messages.length };
}

module.exports = { buildTranscript };
