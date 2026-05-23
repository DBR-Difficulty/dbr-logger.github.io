const VERSION_URL = new URL("../version.json", import.meta.url);

async function resolveBuildVersion() {
  try {
    const response = await fetch(`${VERSION_URL.href}?ts=${Date.now()}`, { cache: "no-store" });
    if (!response.ok) {
      return "";
    }

    const payload = await response.json();
    return typeof payload?.build === "string" ? payload.build.trim() : "";
  } catch {
    return "";
  }
}

const buildVersion = await resolveBuildVersion();
window.__DBR_BUILD_VERSION__ = buildVersion;

if (buildVersion) {
  await import(`./main.js?v=${encodeURIComponent(buildVersion)}`);
} else {
  await import("./main.js");
}
