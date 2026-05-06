import { useState } from "react";
import { AnimatePresence, motion, useAnimationControls } from "framer-motion";

const BG = "linear-gradient(135deg, #c4b5f7 0%, #93b8f5 22%, #bae1fb 44%, #d8b4f8 66%, #fbcfe8 88%, #fde68a 100%)";

// ── Icons ─────────────────────────────────────────────────────────────────────
function EyeIcon({ off }) {
  return off ? (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  ) : (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

// ── Reusable field ────────────────────────────────────────────────────────────
function Field({ label, id, type = "text", value, onChange, placeholder, autoComplete, onReveal, revealed }) {
  const isPassword = type === "password" || (type === "text" && onReveal);

  return (
    <div>
      <label
        htmlFor={id}
        className="block text-[12px] font-medium text-gray-600 mb-1.5"
        style={{ letterSpacing: "-0.011em" }}
      >
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={revealed ? "text" : type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          autoComplete={autoComplete}
          required
          className="w-full px-3.5 py-2.5 rounded-[10px] text-[14px] outline-none
                     bg-white/70 border border-gray-200/80 text-gray-900
                     placeholder:text-gray-300
                     focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100
                     transition-all duration-150"
          style={{ letterSpacing: "-0.011em", paddingRight: isPassword ? "2.75rem" : undefined }}
        />
        {isPassword && (
          <button
            type="button"
            onClick={onReveal}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400
                       hover:text-gray-600 transition-colors duration-100 cursor-pointer"
            tabIndex={-1}
            aria-label={revealed ? "Hide password" : "Show password"}
          >
            <EyeIcon off={revealed} />
          </button>
        )}
      </div>
    </div>
  );
}

// ── Form variants ─────────────────────────────────────────────────────────────
const formVariants = {
  enter: (dir) => ({ x: dir > 0 ? 28 : -28, opacity: 0 }),
  center: { x: 0, opacity: 1, transition: { duration: 0.26, ease: [0.4, 0, 0.2, 1] } },
  exit:  (dir) => ({ x: dir > 0 ? -28 : 28, opacity: 0, transition: { duration: 0.18 } }),
};

// ── Main component ────────────────────────────────────────────────────────────
export default function LoginPage({ onSuccess }) {
  const [mode,       setMode]       = useState("signin"); // "signin" | "signup"
  const [dir,        setDir]        = useState(1);
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState("");
  const [showPass,   setShowPass]   = useState(false);
  const [showPass2,  setShowPass2]  = useState(false);
  const formControls = useAnimationControls();

  const [fields, setFields] = useState({
    name: "", email: "", password: "", confirm: "",
  });

  function field(key) {
    return { value: fields[key], onChange: (e) => setFields((f) => ({ ...f, [key]: e.target.value }) ) };
  }

  function switchMode(next) {
    setDir(next === "signup" ? 1 : -1);
    setMode(next);
    setError("");
    setFields({ name: "", email: "", password: "", confirm: "" });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    // Client-side guard for confirm password
    if (mode === "signup" && fields.password !== fields.confirm) {
      setError("Passwords do not match.");
      shake();
      return;
    }

    setLoading(true);
    try {
      const body = mode === "signin"
        ? { email: fields.email, password: fields.password }
        : { name: fields.name, email: fields.email, password: fields.password };

      const res  = await fetch(`/api/auth/${mode === "signin" ? "login" : "register"}`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Something went wrong. Please try again.");
        shake();
        return;
      }

      onSuccess(data.token, data.user);
    } catch {
      setError("Network error — is the server running?");
      shake();
    } finally {
      setLoading(false);
    }
  }

  async function shake() {
    await formControls.start({
      x: [0, -10, 10, -7, 7, -3, 3, 0],
      transition: { duration: 0.45, ease: "easeInOut" },
    });
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 font-sans"
      style={{ background: BG }}
    >
      {/* ── Central glass card ─────────────────────────────────────────────── */}
      <motion.div
        animate={formControls}
        className="w-full max-w-[420px]"
      >
        <div
          className="rounded-[24px] px-8 py-9"
          style={{
            background: "rgba(255, 255, 255, 0.80)",
            border: "1px solid rgba(255, 255, 255, 0.65)",
            backdropFilter: "blur(32px) saturate(200%)",
            WebkitBackdropFilter: "blur(32px) saturate(200%)",
            boxShadow:
              "0 32px 80px rgba(0,0,0,0.14), 0 8px 24px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.95)",
          }}
        >
          {/* ── App identity ─────────────────────────────────────────────── */}
          <div className="flex flex-col items-center mb-7">
            <div
              className="w-14 h-14 rounded-[18px] bg-gradient-to-br from-violet-500 to-indigo-600
                         flex items-center justify-center shadow-lg shadow-indigo-300/40 mb-4"
            >
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
                <path d="M6 12v5c3 3 9 3 12 0v-5" />
              </svg>
            </div>
            <h1
              className="text-[22px] font-semibold text-gray-900"
              style={{ letterSpacing: "-0.03em" }}
            >
              Semester
            </h1>
            <p className="text-[13px] text-gray-400 mt-0.5">Organise your academic year.</p>
          </div>

          {/* ── Tab control ──────────────────────────────────────────────── */}
          <div className="flex p-1 rounded-[11px] bg-black/[0.05] mb-6">
            {[
              { key: "signin",  label: "Sign In" },
              { key: "signup",  label: "Create Account" },
            ].map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => switchMode(tab.key)}
                className="relative flex-1 py-1.5 text-[13px] font-medium rounded-[8px] cursor-pointer
                           transition-colors duration-100"
                style={{ color: mode === tab.key ? "#111827" : "#9ca3af" }}
              >
                {mode === tab.key && (
                  <motion.span
                    layoutId="login-tab-pill"
                    className="absolute inset-0 rounded-[8px] bg-white shadow-sm"
                    style={{ zIndex: 0 }}
                    transition={{ type: "spring", stiffness: 500, damping: 38 }}
                  />
                )}
                <span className="relative z-10">{tab.label}</span>
              </button>
            ))}
          </div>

          {/* ── Form ─────────────────────────────────────────────────────── */}
          <form onSubmit={handleSubmit} noValidate>
            <div className="overflow-hidden">
              <AnimatePresence mode="wait" custom={dir}>
                <motion.div
                  key={mode}
                  custom={dir}
                  variants={formVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  className="space-y-3.5"
                >
                  {mode === "signup" && (
                    <Field
                      label="Full name"
                      id="name"
                      autoComplete="name"
                      placeholder="Ada Lovelace"
                      {...field("name")}
                    />
                  )}

                  <Field
                    label="Email"
                    id="email"
                    type="email"
                    autoComplete="email"
                    placeholder="ada@university.edu"
                    {...field("email")}
                  />

                  <Field
                    label="Password"
                    id="password"
                    type="password"
                    autoComplete={mode === "signin" ? "current-password" : "new-password"}
                    placeholder={mode === "signup" ? "At least 8 characters" : "••••••••"}
                    onReveal={() => setShowPass((v) => !v)}
                    revealed={showPass}
                    {...field("password")}
                  />

                  {mode === "signup" && (
                    <Field
                      label="Confirm password"
                      id="confirm"
                      type="password"
                      autoComplete="new-password"
                      placeholder="Repeat your password"
                      onReveal={() => setShowPass2((v) => !v)}
                      revealed={showPass2}
                      {...field("confirm")}
                    />
                  )}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Error */}
            <div className="h-5 mt-2.5">
              <AnimatePresence>
                {error && (
                  <motion.p
                    key="err"
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.16 }}
                    className="text-[12px] text-rose-500 font-medium"
                  >
                    {error}
                  </motion.p>
                )}
              </AnimatePresence>
            </div>

            {/* Submit */}
            <motion.button
              type="submit"
              disabled={loading}
              whileHover={!loading ? { scale: 1.015 } : {}}
              whileTap={!loading ? { scale: 0.985 } : {}}
              className="mt-3 w-full py-2.5 rounded-[10px] text-[14px] font-semibold text-white
                         bg-gradient-to-r from-indigo-500 to-violet-500
                         hover:from-indigo-600 hover:to-violet-600
                         shadow-sm shadow-indigo-300/50
                         transition-all duration-200 cursor-pointer
                         disabled:opacity-70 disabled:cursor-not-allowed"
              style={{ letterSpacing: "-0.011em" }}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                  </svg>
                  {mode === "signin" ? "Signing in…" : "Creating account…"}
                </span>
              ) : (
                mode === "signin" ? "Sign In" : "Create Account"
              )}
            </motion.button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
