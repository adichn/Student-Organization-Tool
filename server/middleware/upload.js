import multer from "multer";

/**
 * Multer instance for in-memory file uploads.
 *
 * Accepted types: PDF, plain-text, Markdown, DOCX
 * Hard size cap:  10 MB
 * Storage:        memory — buffer is passed directly to the controller
 */
const ALLOWED_MIMES = new Set([
  "application/pdf",
  "text/plain",
  "text/markdown",
  "text/x-markdown",
  // DOCX — Word Open XML
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  // Some browsers send this for .docx
  "application/msword",
]);

// Fallback: allow by extension if the MIME is wrong (common on Windows)
const ALLOWED_EXTS = /\.(pdf|txt|md|docx|doc)$/i;

const upload = multer({
  storage: multer.memoryStorage(),

  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB
    files: 1,
  },

  fileFilter(_req, file, cb) {
    const mimeOk = ALLOWED_MIMES.has(file.mimetype);
    const extOk  = ALLOWED_EXTS.test(file.originalname);

    if (mimeOk || extOk) return cb(null, true);

    const err = Object.assign(
      new Error("Only PDF, plain-text (.txt, .md), and Word (.docx) files are accepted."),
      { code: "INVALID_FILE_TYPE" }
    );
    cb(err, false);
  },
});

export default upload;
