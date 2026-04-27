import { describe, expect, it } from "vitest";
import {
	extractSessionFilePath,
	formatNameStatus,
	isSubagentSessionPath,
	MAX_STATUS_CHARS,
	SUBAGENT_SESSION_DIR,
} from "./auto-name-utils.ts";

describe("auto-name utils", () => {
	it("detects subagent session paths", () => {
		expect(isSubagentSessionPath(`${SUBAGENT_SESSION_DIR}/child/session.json`)).toBe(true);
		expect(isSubagentSessionPath("/tmp/session.json")).toBe(false);
		expect(isSubagentSessionPath(undefined)).toBe(false);
	});

	it("extracts and sanitizes the session file path", () => {
		const sessionManager = {
			getSessionFile: () => "\n /tmp/example.json \t",
		};
		expect(extractSessionFilePath(sessionManager)).toBe("/tmp/example.json");
		expect(extractSessionFilePath({ getSessionFile: () => undefined })).toBeUndefined();
		expect(extractSessionFilePath({ getSessionFile: "nope" })).toBeUndefined();
		expect(extractSessionFilePath(null)).toBeUndefined();
		expect(
			extractSessionFilePath({
				getSessionFile: () => {
					throw new Error("boom");
				},
			}),
		).toBeUndefined();
	});

	it("formats the status line into a single clipped line", () => {
		const noisy = `  alpha\n beta\t${"x".repeat(MAX_STATUS_CHARS)}  `;
		const formatted = formatNameStatus(noisy);
		expect(formatted).not.toContain("\n");
		expect(formatted.length).toBeLessThanOrEqual(MAX_STATUS_CHARS);
	});
});
