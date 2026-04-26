import { completeSimple } from "@mariozechner/pi-ai";

type SummaryModel = Parameters<typeof completeSimple>[0];
type SummaryResult = Awaited<ReturnType<typeof completeSimple>>;

type AuthResult = {
	ok: boolean;
	apiKey?: string;
	headers?: Record<string, string>;
};

export type ShortLabelContext = {
	model?: SummaryModel;
	modelRegistry?: {
		getApiKeyAndHeaders: (model: SummaryModel) => Promise<AuthResult>;
		find?: (provider: string, modelId: string) => SummaryModel | undefined;
		getAll?: () => SummaryModel[];
	};
};

export type GenerateShortLabelOptions = {
	systemPrompt: string;
	prompt: string;
	maxTokens?: number;
	timeoutMs?: number;
	modelReference?: string;
	extractText?: (content: SummaryResult["content"]) => string;
};

function defaultExtractText(content: SummaryResult["content"]): string {
	return content
		.filter((part): part is { type: "text"; text: string } => part.type === "text" && typeof part.text === "string")
		.map((part) => part.text)
		.join("")
		.trim();
}

function resolveConfiguredModel(ctx: ShortLabelContext, modelReference: string | undefined): SummaryModel | undefined {
	const trimmed = modelReference?.trim();
	if (!trimmed || !ctx.modelRegistry) return undefined;

	const explicitSeparatorIndex = trimmed.indexOf(":") > 0 ? trimmed.indexOf(":") : trimmed.indexOf("/");
	if (explicitSeparatorIndex > 0 && explicitSeparatorIndex < trimmed.length - 1 && ctx.modelRegistry.find) {
		const provider = trimmed.slice(0, explicitSeparatorIndex);
		const modelId = trimmed.slice(explicitSeparatorIndex + 1);
		const model = ctx.modelRegistry.find(provider, modelId);
		if (model) return model;
	}

	const models = ctx.modelRegistry.getAll?.() ?? [];
	const exactMatches = models.filter((model) => model.id === trimmed);
	if (exactMatches.length === 1) return exactMatches[0];

	return undefined;
}

export async function generateShortLabel(ctx: ShortLabelContext, options: GenerateShortLabelOptions): Promise<string> {
	const model = resolveConfiguredModel(ctx, options.modelReference) ?? ctx.model;
	if (!model || !ctx.modelRegistry) return "";

	const auth = await ctx.modelRegistry.getApiKeyAndHeaders(model);
	if (!auth.ok) return "";

	const controller = new AbortController();
	const timeoutMs = options.timeoutMs ?? 10000;
	const timer = setTimeout(() => controller.abort(), timeoutMs);

	try {
		const result = await completeSimple(
			model,
			{
				systemPrompt: options.systemPrompt,
				messages: [
					{
						role: "user",
						content: [{ type: "text", text: options.prompt }],
						timestamp: Date.now(),
					},
				],
			},
			{
				apiKey: auth.apiKey,
				headers: auth.headers,
				signal: controller.signal,
				reasoning: "minimal",
				maxTokens: options.maxTokens ?? 60,
			},
		);

		if (result.stopReason !== "stop") return "";
		const extractText = options.extractText ?? defaultExtractText;
		return extractText(result.content);
	} catch {
		return "";
	} finally {
		clearTimeout(timer);
	}
}
