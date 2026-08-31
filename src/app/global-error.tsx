"use client";

/** Last-resort boundary: replaces the whole document, so it carries its own html/body. */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en-GB">
      <body
        style={{
          fontFamily: "system-ui, sans-serif",
          background: "#F6F8FB",
          color: "#1B2A44",
          display: "grid",
          placeItems: "center",
          minHeight: "100vh",
          margin: 0,
        }}
      >
        <div style={{ textAlign: "center", padding: 24 }}>
          <h1 style={{ color: "#1F3864", fontSize: 22, marginBottom: 8 }}>Something broke.</h1>
          <p style={{ fontSize: 13, color: "#5A6B85", marginBottom: 16 }}>
            Your data is safe. Reload to try again{error.digest ? ` (error ${error.digest})` : ""}.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              background: "#4472C4",
              color: "#fff",
              border: 0,
              borderRadius: 8,
              padding: "8px 16px",
              fontSize: 14,
              cursor: "pointer",
            }}
          >
            Reload
          </button>
        </div>
      </body>
    </html>
  );
}
