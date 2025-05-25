import { describe, it, expect } from "vitest";

// Test utility functions that might be used in the app
describe("Utility Functions", () => {
	it("should handle text truncation correctly", () => {
		const truncateText = (text: string, maxLength: number) => {
			if (text.length <= maxLength) return text;
			return text.substring(0, maxLength) + "...";
		};

		expect(truncateText("Hello World", 10)).toBe("Hello Worl...");
		expect(truncateText("Short", 10)).toBe("Short");
		expect(truncateText("", 10)).toBe("");
	});

	it("should calculate usage percentage correctly", () => {
		const calculateUsage = (current: number, max: number) => {
			if (max === 0) return 0;
			return Math.round((current / max) * 100);
		};

		expect(calculateUsage(500, 1000)).toBe(50);
		expect(calculateUsage(0, 1000)).toBe(0);
		expect(calculateUsage(1000, 1000)).toBe(100);
		expect(calculateUsage(1, 0)).toBe(0);
	});

	it("should validate API key format", () => {
		const isValidApiKey = (key: string) => {
			if (!key || key.trim().length === 0) return false;
			if (key.length < 10) return false;
			return key.startsWith("sk-") || key.includes("-");
		};

		expect(isValidApiKey("sk-1234567890")).toBe(true);
		expect(isValidApiKey("api-key-1234567890")).toBe(true);
		expect(isValidApiKey("short")).toBe(false);
		expect(isValidApiKey("")).toBe(false);
		expect(isValidApiKey("   ")).toBe(false);
	});
});
