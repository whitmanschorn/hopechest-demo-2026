/**
 * Phone/OTP delivery seam. The dev provider doesn't send SMS — it returns the
 * code so the UI can show it on screen ("temporary phone system"). Swap in a
 * real SMS provider (e.g. Twilio) later by implementing this interface and
 * selecting it via the PHONE_PROVIDER env var; real impls return {} so the code
 * is never surfaced to the client.
 */
export interface PhoneProvider {
  /** Deliver `code` to `phone`. Returns `surfacedCode` only for dev/on-screen flows. */
  sendCode(phone: string, code: string): Promise<{ surfacedCode?: string }>;
}

const devPhoneProvider: PhoneProvider = {
  async sendCode(phone, code) {
    console.log(`[dev phone] code for ${phone}: ${code}`);
    return { surfacedCode: code };
  },
};

// Only the dev provider exists today; this is where a Twilio impl would plug in.
export function getPhoneProvider(): PhoneProvider {
  switch (process.env.PHONE_PROVIDER) {
    case "dev":
    default:
      return devPhoneProvider;
  }
}
