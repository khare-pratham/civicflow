import assert from "node:assert/strict";
import { chromium } from "playwright";

const baseUrl = process.env.E2E_BASE_URL ?? "http://127.0.0.1:4173";
const initialIssues = [
  { id: 1, title: "Broken footpath paving", description: "Several paving stones are loose near the corner.", category: "Footpaths", location: "Outside 40 Garden Avenue", priority: "High", status: "Submitted", assigned_team: null, created_at: "2026-10-28T00:00:00Z", updated_at: "2026-10-28T00:00:00Z" },
  { id: 2, title: "Pothole near pedestrian crossing", description: "A deep pothole is close to the crossing.", category: "Roads", location: "12 King Street", priority: "Urgent", status: "In progress", assigned_team: "Roads Team", created_at: "2026-10-28T00:00:00Z", updated_at: "2026-10-28T00:00:00Z" },
  { id: 3, title: "Overflowing public bin in the park", description: "The public bin needs to be emptied.", category: "Waste", location: "North playground, Riverside Park", priority: "Normal", status: "Assigned", assigned_team: "Waste Team", created_at: "2026-10-28T00:00:00Z", updated_at: "2026-10-28T00:00:00Z" },
  { id: 4, title: "Streetlight out near community centre", description: "The streetlight is not turning on at night.", category: "Lighting", location: "Community Centre, Main Street", priority: "High", status: "Under review", assigned_team: null, created_at: "2026-10-28T00:00:00Z", updated_at: "2026-10-28T00:00:00Z" }
];

function createApiMock() {
  let issues = initialIssues.map((issue) => ({ ...issue }));
  let nextId = 5;

  return async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const pathname = url.pathname;

    if (pathname === "/api/issues" && request.method() === "GET") {
      let result = [...issues];
      const q = (url.searchParams.get("q") ?? "").toLowerCase();
      const status = url.searchParams.get("status");
      const category = url.searchParams.get("category");
      if (q) result = result.filter((issue) => [issue.title, issue.description, issue.location].some((value) => value.toLowerCase().includes(q)));
      if (status) result = result.filter((issue) => issue.status === status);
      if (category) result = result.filter((issue) => issue.category === category);
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(result) });
    }

    if (pathname === "/api/issues" && request.method() === "POST") {
      const payload = request.postDataJSON();
      const now = new Date().toISOString();
      const issue = { id: nextId++, ...payload, status: "Submitted", assigned_team: null, created_at: now, updated_at: now };
      issues.unshift(issue);
      return route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify(issue) });
    }

    const statusMatch = pathname.match(/^\/api\/issues\/(\d+)\/status$/);
    if (statusMatch && request.method() === "PATCH") {
      const id = Number(statusMatch[1]);
      const payload = request.postDataJSON();
      const index = issues.findIndex((issue) => issue.id === id);
      if (index < 0) return route.fulfill({ status: 404, contentType: "application/json", body: JSON.stringify({ detail: "Issue not found" }) });
      issues[index] = { ...issues[index], ...payload, updated_at: new Date().toISOString() };
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(issues[index]) });
    }

    return route.fulfill({ status: 404, contentType: "application/json", body: JSON.stringify({ detail: "Not found" }) });
  };
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.route("**/api/issues**", createApiMock());
  await page.route("**/health", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ status: "ok", service: "civicflow-api" }) }));

  try {
    await page.goto(baseUrl, { waitUntil: "networkidle" });
    await page.getByRole("heading", { name: "Community service desk" }).waitFor();
    await page.getByRole("status").getByText("Live API").waitFor();
    console.log("PASS: API health indicator reports online status");
    await page.getByRole("button", { name: "Broken footpath paving", exact: true }).waitFor();
    assert.equal(await page.locator(".issue-title").count(), 4, "dashboard should display four seeded issues");
    console.log("PASS: dashboard loads issue records");

    await page.getByRole("textbox", { name: "Search issues" }).fill("pothole");
    await page.getByRole("button", { name: "Pothole near pedestrian crossing", exact: true }).waitFor();
    assert.equal(await page.locator(".issue-title").count(), 1, "search should narrow the queue to one issue");
    console.log("PASS: search filters issue queue");

    await page.getByRole("button", { name: "Clear filters" }).click();
    await page.getByLabel("Filter by category").selectOption("Lighting");
    await page.getByRole("button", { name: "Streetlight out near community centre", exact: true }).waitFor();
    assert.equal(await page.locator(".issue-title").count(), 1, "category filter should narrow the queue");
    console.log("PASS: category filter works");

    await page.getByRole("button", { name: "Clear filters" }).click();
    await page.getByRole("button", { name: "Report an issue" }).first().click();
    await page.getByLabel("Issue title").fill("Playwright test issue");
    await page.getByLabel("Description").fill("This issue was created by the automated browser test.");
    await page.getByRole("dialog").locator("form").getByLabel("Category").selectOption("Parks");
    await page.getByRole("dialog").locator("form").getByLabel("Priority").selectOption("Normal");
    await page.getByLabel("Location").fill("Automated test location");
    await page.getByRole("button", { name: "Submit issue" }).click();
    await page.getByRole("button", { name: "Playwright test issue", exact: true }).waitFor();
    console.log("PASS: user can create an issue");

    await page.getByRole("button", { name: "View Broken footpath paving" }).click();
    await page.getByLabel("Update status").selectOption("Under review");
    await page.getByText("Issue #1 moved to Under review.").waitFor();
    await page.reload({ waitUntil: "networkidle" });
    await page.getByRole("button", { name: "Broken footpath paving", exact: true }).click();
    await page.getByLabel("Update status").waitFor();
    assert.equal(await page.getByLabel("Update status").inputValue(), "Under review", "status should persist after page reload");
    console.log("PASS: issue status updates and persists after refresh");

    const errorPage = await browser.newPage();
    await errorPage.route("**/api/issues**", (route) => route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ detail: "Test API unavailable" }) }));
    await errorPage.route("**/health", (route) => route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ detail: "Test API unavailable" }) }));
    await errorPage.goto(baseUrl, { waitUntil: "networkidle" });
    await errorPage.getByRole("alert").getByText("Test API unavailable").waitFor();
    await errorPage.getByRole("status").getByText("Offline").waitFor();
    console.log("PASS: API health indicator reports offline status");
    console.log("PASS: API errors are shown to the user");
    await errorPage.close();

    console.log("\nAll CivicFlow end-to-end checks passed.");
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
