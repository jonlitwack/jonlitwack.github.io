/**
 * Agent guard plugin.
 *
 * The OB1 pipeline signs in as a Contributor. EmDash roles don't scope by
 * collection, so a Contributor could otherwise create drafts in essays,
 * pages or datasets. This hook rejects any save by an actor below Author
 * outside `notes`. Jon is the only Admin, so his writes are never affected.
 *
 * Internal writes (seeding, plugins) may arrive without an actor and are let
 * through: an agent token can't make one.
 *
 * Covered by scripts/test-agent-permissions.mjs.
 */
import { ContentSaveRejectedError, definePlugin } from "emdash";
import type { PluginDescriptor } from "emdash";

/** Role.AUTHOR in @emdash-cms/auth. Anything below it is restricted. */
const AUTHOR_ROLE = 30;
const ALLOWED_COLLECTIONS = new Set(["notes"]);

export function agentGuardPlugin(): PluginDescriptor {
	return {
		id: "jonlitwack-agent-guard",
		version: "1.0.0",
		format: "native",
		entrypoint: "@jonlitwack/plugin-agent-guard",
		options: {},
	};
}

export function createPlugin() {
	return definePlugin({
		id: "jonlitwack-agent-guard",
		version: "1.0.0",
		capabilities: ["content:write"],
		hooks: {
			"content:beforeSave": {
				// Run before any other plugin can transform the content.
				priority: 0,
				errorPolicy: "abort",
				handler: async (event) => {
					const { actor, collection } = event;
					if (!actor || actor.role >= AUTHOR_ROLE) return;
					if (ALLOWED_COLLECTIONS.has(collection)) return;
					throw new ContentSaveRejectedError(
						`Contributors can only create notes. "${collection}" is not allowed.`,
					);
				},
			},
		},
	});
}

export default createPlugin;
