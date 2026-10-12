/**
 * Values shared by the plugin, the signup form and the CSV export.
 * No EmDash runtime imports, so the site can import this anywhere.
 */
export const PLUGIN_ID = "jonlitwack-subscribe";
export const COLLECTION = "subscribers";
export const INDEXES = ["createdAt"];
export const SUBSCRIBE_PATH = `/_emdash/api/plugins/${PLUGIN_ID}/subscribe`;

/**
 * Shown under the form and stored with each signup as the consent record
 * (CASL). Change CONSENT_VERSION whenever the wording changes.
 */
export const CONSENT_TEXT =
	"New essays and notes by email. I'll only use your address for this, and you can unsubscribe any time.";
export const CONSENT_VERSION = "2026-10-12";

export interface Subscriber {
	email: string;
	createdAt: string;
	/** Path of the page the form was on. */
	page: string;
	consentText: string;
	consentVersion: string;
}
