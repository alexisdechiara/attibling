const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });
const GhostAdminApi = require("@tryghost/admin-api");

(async function main() {
	try {
		const api = new GhostAdminApi({
			url: process.env.GHOST_ADMIN_API_URL,
			key: process.env.GHOST_ADMIN_API_KEY,
			version: "v6.0",
		});

		// Deploy it to the configured site
		await api.themes.upload({ file: path.join(__dirname, "..", "..", "attibling.zip") });
		console.log("Theme successfully uploaded.");
	} catch (err) {
		console.error(err);
		process.exit(1);
	}
})();
