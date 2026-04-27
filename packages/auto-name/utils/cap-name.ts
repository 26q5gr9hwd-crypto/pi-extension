/**
 * Pure, LLM-free derivation of a session name from the first user message.
 *
 * Strategy:
 *   1. Strip code fences, inline code, and leading list/heading markers so
 *      markdown noise does not become the title.
 *   2. Collapse all whitespace to single spaces.
 *   3. Cut at the first natural clause boundary (sentence-ender, colon,
 *      semicolon, em/en dash, or " - " separator).
 *   4. Hard-cap at MAX_NAME_LENGTH characters with an ellipsis.
 */

export const MAX_NAME_LENGTH = 30;

const CODE_FENCE = /```[\s\S]*?```/g;
const INLINE_CODE = /`[^`\n]*`/g;
const LIST_HEADING_MARKER = /^[\s>#*+\-\d.)]+/gm;
const WHITESPACE = /\s+/g;
const CLAUSE_BOUNDARY = /^(.+?)(?:[.!?\u2026\u2014\u2013]|\s[-\u2013\u2014]\s|:|;)/;

export function capFirstMessage(raw: string, max: number = MAX_NAME_LENGTH): string {
	if (!raw) return "";

	const cleaned = raw
		.replace(CODE_FENCE, " ")
		.replace(INLINE_CODE, " ")
		.replace(LIST_HEADING_MARKER, "")
		.replace(WHITESPACE, " ")
		.trim();

	if (!cleaned) return "";

	const clauseMatch = cleaned.match(CLAUSE_BOUNDARY);
	const clause = (clauseMatch?.[1] ?? cleaned).trim();

	if (!clause) return "";

	return clause.length > max ? `${clause.slice(0, max - 1)}\u2026` : clause;
}
