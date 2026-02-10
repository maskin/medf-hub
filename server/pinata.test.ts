import { describe, expect, it } from "vitest";

describe("Pinata API credentials", () => {
  it("should have PINATA_API_KEY and PINATA_API_SECRET set", () => {
    // Regular Pinata API requires both key and secret
    const apiKey = process.env.PINATA_API_KEY;
    const apiSecret = process.env.PINATA_API_SECRET;
    expect(apiKey).toBeDefined();
    expect(typeof apiKey).toBe("string");
    expect(apiKey!.length).toBeGreaterThan(0);
    expect(apiSecret).toBeDefined();
    expect(typeof apiSecret).toBe("string");
    expect(apiSecret!.length).toBeGreaterThan(0);
  });

  it("should authenticate with Pinata API", async () => {
    const apiKey = process.env.PINATA_API_KEY;
    const apiSecret = process.env.PINATA_API_SECRET;
    if (!apiKey || !apiSecret) {
      // Skip if not configured
      return;
    }

    const response = await fetch("https://api.pinata.cloud/data/testAuthentication", {
      method: "GET",
      headers: {
        "pinata_api_key": apiKey,
        "pinata_secret_api_key": apiSecret,
      },
    });

    expect(response.ok).toBe(true);
    const data = await response.json() as { message: string };
    expect(data.message).toBe("Congratulations! You are communicating with the Pinata API!");
  });
});
