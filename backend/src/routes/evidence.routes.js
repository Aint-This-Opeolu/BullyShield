const express = require('express');
const fs = require('fs');
const path = require('path');
const { get } = require('../db');
const { authenticate, authorize } = require('../middleware/auth');
const { decrypt } = require('../utils/encryption');
const { logAction } = require('../utils/audit');

const router = express.Router();
const UPLOAD_DIR = path.join(__dirname, '..', '..', 'uploads');

/**
 * GET /api/evidence/:fileId
 * Serves a previously uploaded evidence file, decrypting it on the fly.
 * Administrators may view any evidence; Counsellors only for cases
 * assigned to them.
 */
router.get('/:fileId', authenticate, authorize('ADMINISTRATOR', 'COUNSELLOR'), async (req, res) => {
  const evidence = get('SELECT * FROM evidence WHERE fileId = :fileId', { fileId: req.params.fileId });
  if (!evidence) return res.status(404).json({ error: 'Evidence file not found' });

  const caseRow = get('SELECT * FROM cases WHERE reportId = :reportId', { reportId: evidence.reportId });

  if (req.user.role === 'COUNSELLOR' && caseRow?.assignedToId !== req.user.id) {
    return res.status(403).json({ error: 'You are not assigned to this case' });
  }

  const fullPath = path.join(UPLOAD_DIR, evidence.filePath);
  if (!fs.existsSync(fullPath)) {
    return res.status(404).json({ error: 'File missing from storage' });
  }

  try {
    const encryptedContent = fs.readFileSync(fullPath, 'utf8');
    const decryptedBase64 = decrypt(encryptedContent, evidence.fileIv, evidence.fileTag);
    const buffer = Buffer.from(decryptedBase64, 'base64');

    await logAction({
      userId: req.user.id,
      action: 'Viewed/downloaded evidence file',
      affectedRecordId: evidence.fileId,
    });

    res.setHeader('Content-Type', evidence.mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${evidence.originalName}"`);
    return res.send(buffer);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to decrypt evidence file' });
  }
});

module.exports = router;
