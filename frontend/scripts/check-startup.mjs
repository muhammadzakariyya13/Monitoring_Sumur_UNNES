import { chromium } from "@playwright/test";
const browser = await chromium.launch({ channel: "chrome", headless: true });
try {
  const page = await browser.newPage();
  page.on("pageerror", (error) => console.log("Browser error:", error.message));
  page.on("console", (message) => {
    if (message.type() === "error") console.log("Console:", message.text());
  });
  page.on("response", (response) => {
    if (response.status() >= 400)
      console.log("HTTP", response.status(), response.url());
  });
  page.on("requestfailed", (request) =>
    console.log("Request failed:", request.url(), request.failure()?.errorText),
  );
  const started = Date.now();
  await page.goto(process.argv[2] || "http://localhost:3000/", {
    waitUntil: "domcontentloaded",
    timeout: 30000,
  });
  console.log("HTML ready (ms):", Date.now() - started);
  await page.waitForURL("**/login/", { timeout: 15000 });
  await page
    .getByRole("button", { name: "Masuk dengan Google UNNES" })
    .waitFor();
  console.log("Login ready (ms):", Date.now() - started);
} finally {
  await browser.close();
}
