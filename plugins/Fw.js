// forward-largefile.js
const { cmd } = require("../command");
const fs = require("fs");
const path = require("path");
const os = require("os");
const { pipeline } = require("stream");
const { promisify } = require("util");
const pump = promisify(pipeline);

const SAFETY = {
  MAX_JIDS: 20,
  BASE_DELAY: 2000,
  EXTRA_DELAY: 4000,
  PROGRESS_NOTIFY_EVERY: 10 // every N sends notify owner
};

function makeTempPath(fileName = "forward_tmp") {
  const tid = Date.now() + "-" + Math.round(Math.random() * 10000);
  const fname = `${fileName}-${tid}`;
  return path.join(os.tmpdir(), fname);
}

/**
 * Save quoted media to a temp file.
 * Handles either Buffer or readable stream or an object from some libs.
 * Returns { filePath, fileName, mimeType }
 */
async function saveQuotedToFile(quoted) {
  // Try to derive filename & mimetype
  const fileName = (quoted && (quoted.fileName || quoted.filename || quoted.name)) || `file`;
  const mimeType = (quoted && (quoted.mimetype || quoted.mimetype || quoted.mimetype)) || "application/octet-stream";
  const tmpPath = makeTempPath(fileName);
  const filePath = tmpPath + (path.extname(fileName) || "");

  // If quoted has a download() helper (Baileys style)
  if (quoted && typeof quoted.download === "function") {
    // Some implementations return Buffer, some return stream.
    const dl = await quoted.download();
    // If Buffer
    if (Buffer.isBuffer(dl)) {
      await fs.promises.writeFile(filePath, dl);
      return { filePath, fileName, mimeType };
    }
    // If stream (detect readable)
    if (dl && typeof dl.pipe === "function") {
      const ws = fs.createWriteStream(filePath);
      await pump(dl, ws);
      return { filePath, fileName, mimeType };
    }
    // If returns object with content property
    if (dl && dl.content && Buffer.isBuffer(dl.content)) {
      await fs.promises.writeFile(filePath, dl.content);
      return { filePath, fileName, mimeType };
    }
  }

  // Fallback: try if quoted has .url property (already uploaded media)
  if (quoted && quoted.url) {
    // Some Baileys variants require client.waUploadToServer - but we can't call it here.
    // Try to stream from the URL using native https request (best-effort).
    // NOTE: If your environment blocks external requests, this fallback may fail.
    const https = require("https");
    await new Promise((resolve, reject) => {
      const file = fs.createWriteStream(filePath);
      https.get(quoted.url, res => {
        if (res.statusCode !== 200) {
          return reject(new Error(`HTTP ${res.statusCode}`));
        }
        res.pipe(file);
        file.on("finish", () => file.close(resolve));
        file.on("error", reject);
      }).on("error", reject);
    });
    return { filePath, fileName, mimeType };
  }

  // Last resort: if quoted is already a Buffer-like object
  if (quoted && Buffer.isBuffer(quoted)) {
    await fs.promises.writeFile(filePath, quoted);
    return { filePath, fileName, mimeType };
  }

  throw new Error("Unable to download quoted message media (no supported download method).");
}

cmd({
  pattern: "forward",
  alias: ["f", "fwd"],
  desc: "Bulk forward media to groups (newsletter style) - supports large files by streaming",
  category: "owner",
  filename: __filename
}, async (client, message, match, { isOwner }) => {
  try {
    if (!isOwner) return await message.reply("*📛 Owner Only Command*");
    if (!message.quoted) return await message.reply("*🍁 Please reply to a message to forward*");

    // BUILD JID LIST (robust)
    let jidInput = "";
    if (typeof match === "string") {
      jidInput = match.trim();
    } else if (Array.isArray(match)) {
      jidInput = match.join(" ").trim();
    } else if (match && typeof match === "object") {
      jidInput = match.text || "";
    }
    const rawJids = jidInput.split(/[\s,]+/).filter(j => j && j.length > 0);
    const validJids = rawJids
      .map(jid => {
        const clean = jid.replace(/@g\.us$/i, "").replace(/\D/g, "");
        return /^\d+$/.test(clean) ? `${clean}@g.us` : null;
      })
      .filter(Boolean)
      .slice(0, SAFETY.MAX_JIDS);

    if (validJids.length === 0) {
      return await message.reply(
        "❌ No valid group JIDs found.\nExamples:\n.fwd 120363411055156472@g.us,120363333939099948@g.us\n.fwd 120363411055156472 120363333939099948"
      );
    }

    // Try to save quoted to temp file (stream-friendly)
    await message.reply("⏳ Preparing quoted media for forwarding (this may take a while for big files)...");

    let saved;
    try {
      saved = await saveQuotedToFile(message.quoted);
    } catch (err) {
      console.error("Save quoted failed:", err);
      return await message.reply(`❌ Unable to download quoted media: ${err.message}`);
    }

    const { filePath, fileName, mimeType } = saved;
    // Get file size
    const stat = await fs.promises.stat(filePath);
    const fileSizeBytes = stat.size;

    // Newsletter context (same as your original)
    const newsletterInfo = {
      key: {
        remoteJid: "status@broadcast",
        participant: "0@s.whatsapp.net",
      },
      message: {
        newsletterAdminInviteMessage: {
          newsletterJid: "120363417070951702@newsletter",
          newsletterName: "MOVIE CIRCLE",
          caption: "𝙺𝙰𝚅𝙸 𝙼𝙳 𝙼𝙾𝚅𝙸𝙴 𝚅𝙴𝚁𝙸𝙵𝙸𝙴𝙳",
          inviteExpiration: 0,
        },
      },
    };

    let successCount = 0;
    const failedJids = [];

    // Send as document stream to avoid loading into memory
    for (const [index, jid] of validJids.entries()) {
      try {
        // recreate read stream for each send (can't reuse stream)
        const fileStream = fs.createReadStream(filePath);

        await client.sendMessage(jid, {
          document: fileStream,
          fileName: fileName,
          mimetype: mimeType,
          fileLength: fileSizeBytes
        }, {
          quoted: newsletterInfo,
          // optional: set "contextInfo" if you want to preserve forwarded flags
          // contextInfo: { forwardingScore: 999, isForwarded: true }
        });

        successCount++;

        if ((index + 1) % SAFETY.PROGRESS_NOTIFY_EVERY === 0) {
          await message.reply(`🔄 Sent to ${index + 1}/${validJids.length} groups...`);
        }

        const delayTime = (index + 1) % SAFETY.PROGRESS_NOTIFY_EVERY === 0 ? SAFETY.EXTRA_DELAY : SAFETY.BASE_DELAY;
        await new Promise(res => setTimeout(res, delayTime));
      } catch (err) {
        console.error("Send to", jid, "failed:", err && err.message);
        failedJids.push(jid.replace("@g.us", ""));
        await new Promise(res => setTimeout(res, SAFETY.BASE_DELAY));
      }
    }

    // cleanup temp
    try {
      await fs.promises.unlink(filePath);
    } catch (e) {
      // ignore
    }

    // REPORT
    let report = `✅ *Forward Completed*\n\n` +
                 `🌴 Success: ${successCount}/${validJids.length}\n` +
                 `📦 File: ${fileName}\n` +
                 `🧾 Size: ${(fileSizeBytes / (1024 * 1024)).toFixed(2)} MB\n`;

    if (failedJids.length > 0) {
      report += `\n❌ Failed (${failedJids.length}): ${failedJids.slice(0, 8).join(", ")}`;
      if (failedJids.length > 8) report += ` +${failedJids.length - 8} more`;
    }

    if (rawJids.length > SAFETY.MAX_JIDS) {
      report += `\n⚠️ Note: Limited to first ${SAFETY.MAX_JIDS} JIDs`;
    }

    await message.reply(report);
  } catch (error) {
    console.error("Forward Error:", error);
    await message.reply(
      `💢 Error: ${error && error.message ? error.message.substring(0, 200) : String(error)}\n\n` +
      `Check:\n1) Bot permissions in target groups\n2) Quoted media availability\n3) WhatsApp file size limit (approx 2GB)`
    );
  }
});
