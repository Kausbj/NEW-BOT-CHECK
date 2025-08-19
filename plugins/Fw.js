// forward.js
const { cmd } = require("../command");
const fs = require("fs");
const path = require("path");
const os = require("os");
const { downloadContentFromMessage, getContentType } = require("@adiwajshing/baileys"); // ensure baileys is installed
// Safety Configuration
const SAFETY = {
  MAX_JIDS: 20,
  BASE_DELAY: 2000,
  EXTRA_DELAY: 4000,
  PROGRESS_UPDATE_EVERY: 10 // every N sends, reply progress
};

cmd({
  pattern: "forward",
  alias: ["f", "fwd"],
  desc: "Bulk forward media to groups (newsletter style) — supports large files via streaming",
  category: "owner",
  filename: __filename
}, async (client, message, match, { isOwner }) => {
  try {
    if (!isOwner) return await message.reply("*📛 Owner Only Command*");

    if (!message.quoted) return await message.reply("*🍁 Please reply to a message to forward*");

    // parse JIDs from match text (or from quoted text if none)
    let jidInput = typeof match === "string" ? match.trim() : "";
    if (!jidInput && message.quoted && (message.quoted.text || message.quoted.conversation)) {
      jidInput = (message.quoted.text || message.quoted.conversation || "").trim();
    }
    const rawJids = jidInput.split(/[\s,]+/).filter(j => j && j.length > 0);
    const validJids = rawJids
      .map(jid => {
        // if user passed numeric ids, add @g.us
        const cleaned = jid.replace(/@g\.us$/i, "");
        return /^\d+$/.test(cleaned) ? `${cleaned}@g.us` : (/@g\.us$/i.test(jid) ? jid : null);
      })
      .filter(Boolean)
      .slice(0, SAFETY.MAX_JIDS);

    if (validJids.length === 0) {
      return await message.reply(
        "❌ No valid group JIDs found\nExamples:\n.fwd 120363411055156472@g.us,120363333939099948@g.us\n.fwd 120363411055156472 120363333939099948"
      );
    }

    // determine quoted message type
    const mtype = getContentType(message.quoted) || message.quoted.mtype || "";
    let sendContent = null;
    let tempFilePath = null;
    let cleanupAfter = false;

    // If it's a media/document and large, stream to temp file then send as fs stream.
    if (["imageMessage", "videoMessage", "audioMessage", "stickerMessage", "documentMessage"].includes(mtype)) {
      // prefer streaming download for big files
      try {
        // create temp dir & filename
        const extMap = {
          imageMessage: ".jpg",
          videoMessage: ".mp4",
          audioMessage: ".mp4",
          stickerMessage: ".webp",
          documentMessage: (message.quoted.fileName && path.extname(message.quoted.fileName)) || ".bin"
        };
        const ext = extMap[mtype] || ".bin";
        const tmpDir = path.join(os.tmpdir(), "kavi-forward");
        if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
        tempFilePath = path.join(tmpDir, `${Date.now()}_${Math.floor(Math.random()*10000)}${ext}`);
        // downloadContentFromMessage returns async iterable of Buffers
        const messageContent = message.quoted.message || message.quoted; // support different shapes
        const stream = await downloadContentFromMessage(messageContent, mtype.replace("Message", "").toLowerCase());

        // pipe the async iterable to a writable stream
        await new Promise(async (resolve, reject) => {
          const writeStream = fs.createWriteStream(tempFilePath);
          writeStream.on("finish", resolve);
          writeStream.on("error", reject);
          try {
            for await (const chunk of stream) {
              if (!writeStream.write(chunk)) {
                await new Promise(r => writeStream.once("drain", r));
              }
            }
            writeStream.end();
          } catch (e) {
            writeStream.destroy();
            reject(e);
          }
        });

        // prepare sendContent using file stream (so we don't load file into memory)
        const mimetype = (message.quoted.mimetype || message.quoted.message?.document?.mimetype) || undefined;
        const filename = message.quoted.fileName || (mtype === "documentMessage" ? "document" : `file${ext}`);
        // build send content according to type
        switch (mtype) {
          case "imageMessage":
            sendContent = { image: fs.createReadStream(tempFilePath), caption: message.quoted.text || message.quoted.caption || "" , mimetype, fileName: filename };
            break;
          case "videoMessage":
            sendContent = { video: fs.createReadStream(tempFilePath), caption: message.quoted.text || message.quoted.caption || "", mimetype, fileName: filename };
            break;
          case "audioMessage":
            sendContent = { audio: fs.createReadStream(tempFilePath), mimetype, ptt: message.quoted.ptt || false, fileName: filename };
            break;
          case "stickerMessage":
            sendContent = { sticker: fs.createReadStream(tempFilePath), mimetype };
            break;
          case "documentMessage":
            sendContent = { document: fs.createReadStream(tempFilePath), mimetype: mimetype || "application/octet-stream", fileName: filename };
            break;
        }
        cleanupAfter = true;
      } catch (err) {
        console.error("Streaming download failed, falling back to in-memory download:", err);
        // fallback — try buffer download (may fail for > memory)
        const buffer = await message.quoted.download();
        const mimetype = message.quoted.mimetype || undefined;
        const filename = message.quoted.fileName || `document`;
        sendContent = { document: buffer, mimetype, fileName: filename };
      }
    } else if (mtype === "extendedTextMessage" || mtype === "conversation" || mtype === "text") {
      sendContent = { text: message.quoted.text || message.quoted.conversation || "" };
    } else {
      // unknown: try forwarding raw quoted message (best-effort)
      sendContent = message.quoted;
    }

    // newsletter context (optional)
    const newsletterInfo = {
      key: { remoteJid: "status@broadcast", participant: "0@s.whatsapp.net" },
      message: {
        newsletterAdminInviteMessage: {
          newsletterJid: "120363417070951702@newsletter",
          newsletterName: "MOVIE CIRCLE",
          caption: "𝙺𝙰𝚅𝙸 𝙼𝙳 𝙼𝙾𝚅𝙸𝙴 𝚅𝙴𝚁𝙸𝙵𝙸𝙴𝙳",
          inviteExpiration: 0,
        }
      }
    };

    // forwarding loop
    let successCount = 0;
    const failedJids = [];
    for (const [index, jid] of validJids.entries()) {
      try {
        await client.sendMessage(
          jid,
          {
            ...sendContent,
            contextInfo: {
              isForwarded: true,
              forwardingScore: 999,
              forwarded: true
            }
          },
          { quoted: newsletterInfo }
        );
        successCount++;
        if ((index + 1) % SAFETY.PROGRESS_UPDATE_EVERY === 0) {
          await message.reply(`🔄 Sent to ${index + 1}/${validJids.length} groups...`);
        }
        const delayTime = (index + 1) % 10 === 0 ? SAFETY.EXTRA_DELAY : SAFETY.BASE_DELAY;
        await new Promise(r => setTimeout(r, delayTime));
      } catch (err) {
        console.error(`Failed to send to ${jid}:`, err);
        failedJids.push(jid.replace("@g.us", ""));
        await new Promise(r => setTimeout(r, SAFETY.BASE_DELAY));
      }
    }

    // cleanup temp file if created
    if (cleanupAfter && tempFilePath) {
      try { fs.unlinkSync(tempFilePath); } catch (e) { /* ignore */ }
    }

    // report
    let report = `✅ *Forward Finished*\n\n` +
                 `🌴 Success: ${successCount}/${validJids.length}\n` +
                 `📦 Content Type: ${mtype.replace("Message", "") || "text"}\n`;
    if (failedJids.length > 0) {
      report += `\n❌ Failed (${failedJids.length}): ${failedJids.slice(0,5).join(", ")}`;
      if (failedJids.length > 5) report += ` +${failedJids.length - 5} more`;
    }
    if (rawJids.length > SAFETY.MAX_JIDS) {
      report += `\n⚠️ Note: Limited to first ${SAFETY.MAX_JIDS} JIDs`;
    }
    await message.reply(report);

  } catch (error) {
    console.error("Forward Error:", error);
    await message.reply(
      `💢 Error: ${error.message ? error.message.substring(0, 200) : String(error)}\n\nPlease check:\n1. JID formatting\n2. Bot permissions (can it send media to those groups?)\n3. File size limits by WhatsApp`
    );
  }
});
