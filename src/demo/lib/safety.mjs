// Safety configuration of the demo Ghost: it must never contact anything outside this computer.
//
// - privacy.useTinfoil turns off the update check, Gravatar, the RPC ping and the IndexNow ping;
// - the "stub" mail transport sends nothing (Ghost's default "Direct" transport would contact the MX of the
//   recipients) ;
// - remote flags and recommendations are off, the update / Gravatar URLs point to a dead local port;
// - staff device verification is off: it would ask for a code sent by e-mail, which never arrives.
//
// The same keys exist as environment variables in src/docker-compose.yml (checked by a test). For the
// install without Docker, `node src/demo/lib/safety.mjs <config.development.json>` merges them into the file.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const SAFETY_CONFIG = {
	mail: { transport: "stub" },
	security: { staffDeviceVerification: false },
	privacy: {
		useTinfoil: true,
		useUpdateCheck: false,
		useGravatar: false,
		useRpcPing: false,
		useStructuredData: true,
	},
	updateCheck: { url: "http://127.0.0.1:9/disabled", forceUpdate: false },
	gravatar: { url: "http://127.0.0.1:9/disabled/{hash}" },
	remoteFlags: { enabled: false, url: null, pollInterval: null },
	services: { recommendations: { enabled: false } },
};

const isObject = value => value !== null && typeof value === "object" && !Array.isArray(value);

/** Deep merge: the keys of `safety` win, the other keys of `config` are kept. Returns a new object. */
export function mergeSafetyConfig(config = {}, safety = SAFETY_CONFIG) {
	const out = { ...config };
	for (const [key, value] of Object.entries(safety)) {
		out[key] = isObject(value) && isObject(out[key]) ? mergeSafetyConfig(out[key], value) : structuredClone(value);
	}
	return out;
}

export function applySafetyConfig(file) {
	const config = JSON.parse(fs.readFileSync(file, "utf8"));
	fs.writeFileSync(file, `${JSON.stringify(mergeSafetyConfig(config), null, 2)}\n`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
	const file = process.argv[2];
	if (!file) {
		process.stderr.write("usage : node safety.mjs <config.development.json>\n");
		process.exit(1);
	}
	applySafetyConfig(file);
	process.stdout.write(`Clés de sécurité fusionnées dans ${file}\n`);
}
