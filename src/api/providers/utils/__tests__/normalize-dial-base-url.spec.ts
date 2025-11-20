import { describe, expect, it } from "vitest"

import { dialDefaultBaseUrl } from "@roo-code/types"

import { normalizeDialBaseUrl, resolveDialApiConfig } from "../normalize-dial-base-url"

describe("normalizeDialBaseUrl", () => {
	it("falls back to the default URL when value is undefined", () => {
		expect(normalizeDialBaseUrl(undefined)).toBe(dialDefaultBaseUrl)
	})

	it("falls back to the default URL when value is blank", () => {
		expect(normalizeDialBaseUrl("   ")).toBe(dialDefaultBaseUrl)
	})

	it("returns the same host when no suffixes are present", () => {
		const base = "https://example.com/custom"
		expect(normalizeDialBaseUrl(base)).toBe(base)
	})

	it("strips trailing /openai", () => {
		expect(normalizeDialBaseUrl("https://example.com/openai")).toBe("https://example.com")
	})

	it("strips trailing /openai/", () => {
		expect(normalizeDialBaseUrl("https://example.com/openai/")).toBe("https://example.com")
	})

	it("strips trailing /openai/v1", () => {
		expect(normalizeDialBaseUrl("https://example.com/openai/v1")).toBe("https://example.com")
	})

	it("strips trailing /openai/v1/", () => {
		expect(normalizeDialBaseUrl("https://example.com/openai/v1/")).toBe("https://example.com")
	})

	it("handles uppercase suffixes", () => {
		expect(normalizeDialBaseUrl("https://example.com/OPENAI/V1/")).toBe("https://example.com")
	})

	it("trims whitespace before processing", () => {
		expect(normalizeDialBaseUrl("  https://example.com/openai  ")).toBe("https://example.com")
	})

	it("preserves bare hosts so they can be used in azure mode", () => {
		expect(normalizeDialBaseUrl("https://example.com")).toBe("https://example.com")
	})
})

describe("resolveDialApiConfig", () => {
	it("falls back to azure discovery when base url is empty", () => {
		const resolved = resolveDialApiConfig("")

		expect(resolved).toEqual({
			apiBaseUrl: dialDefaultBaseUrl,
			modelDiscoveryUrl: `${dialDefaultBaseUrl}/openai`,
			useAzure: true,
		})
	})

	it("treats openai/v1 paths as OpenAI-compatible", () => {
		const resolved = resolveDialApiConfig("https://example.com/openai/v1")

		expect(resolved).toEqual({
			apiBaseUrl: "https://example.com/openai/v1",
			modelDiscoveryUrl: "https://example.com/openai/v1",
			useAzure: false,
		})
	})

	it("defaults to azure-style routing when no openai suffix is present", () => {
		const resolved = resolveDialApiConfig("https://example.com")

		expect(resolved).toEqual({
			apiBaseUrl: "https://example.com",
			modelDiscoveryUrl: "https://example.com/openai",
			useAzure: true,
		})
	})

	it("treats trailing /openai as an azure resource root", () => {
		const resolved = resolveDialApiConfig("https://example.com/openai/")

		expect(resolved).toEqual({
			apiBaseUrl: "https://example.com",
			modelDiscoveryUrl: "https://example.com/openai",
			useAzure: true,
		})
	})
})
