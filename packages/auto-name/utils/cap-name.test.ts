import { describe, expect, it } from "vitest";
import { capFirstMessage, MAX_NAME_LENGTH } from "./cap-name.ts";

describe("capFirstMessage", () => {
	it("returns the trimmed message when short and unpunctuated", () => {
		expect(capFirstMessage("Ship the next release")).toBe("Ship the next release");
	});

	it("cuts at the first sentence-ender", () => {
		expect(capFirstMessage("Fix the bug. Then ship.")).toBe("Fix the bug");
		expect(capFirstMessage("Wat? Then ship.")).toBe("Wat");
	});

	it("strips fenced code blocks before sampling", () => {
		expect(capFirstMessage("Run ```bash\nrm -rf /tmp/foo\n``` and report")).toBe("Run and report");
	});

	it("strips inline code", () => {
		expect(capFirstMessage("Update `package.json` and rebuild")).toBe("Update and rebuild");
	});

	it("strips list and heading markers", () => {
		expect(capFirstMessage("- Add tests for the parser")).toBe("Add tests for the parser");
		expect(capFirstMessage("## Refactor the auth flow")).toBe("Refactor the auth flow");
		expect(capFirstMessage("1. Migrate to Postgres")).toBe("Migrate to Postgres");
	});

	it("hard-caps overly long messages with an ellipsis", () => {
		const long = "a".repeat(MAX_NAME_LENGTH + 50);
		const result = capFirstMessage(long);
		expect(result.length).toBe(MAX_NAME_LENGTH);
		expect(result.endsWith("\u2026")).toBe(true);
	});

	it("returns an empty string for blank input", () => {
		expect(capFirstMessage("")).toBe("");
		expect(capFirstMessage("    \n\t  ")).toBe("");
	});

	it("respects a custom max length", () => {
		expect(capFirstMessage("Hello world from pi", 10)).toBe("Hello wor\u2026");
	});

	it("cuts at em-dash separator", () => {
		expect(capFirstMessage("Refactor parser \u2014 split lexer")).toBe("Refactor parser");
	});

	it("cuts at colon separator", () => {
		expect(capFirstMessage("VPS deploy: rebuild and restart")).toBe("VPS deploy");
	});
});
