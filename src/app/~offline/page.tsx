export default function OfflinePage() {
    return (
        <main
            style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                height: "100dvh",
                fontFamily: "sans-serif",
                color: "#fff",
                background: "#050508",
                gap: "12px",
                textAlign: "center",
                padding: "20px",
            }}
        >
            <span style={{ fontSize: "3rem" }}>📡</span>
            <h1 style={{ fontSize: "1.5rem", margin: 0 }}>لا يوجد اتصال بالإنترنت</h1>
            <p style={{ color: "#888", margin: 0 }}>
                يرجى التحقق من اتصالك والمحاولة مرة أخرى
            </p>
        </main>
    );
}
