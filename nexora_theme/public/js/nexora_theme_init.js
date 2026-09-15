/**
 * Nexora Theme Init
 *
 * Sets data-nexora-theme="default" on <html> when the page loads.
 * This activates the Nexora CSS variable override system.
 *
 * Runs on both Desk (via app_include_js) and Website (via web_include_js).
 * The data-nexora-theme attribute is additive — it does not interfere
 * with Frappe's existing data-theme-mode / data-theme attributes.
 *
 * Frappe's set_theme() updates data-theme in response to data-theme-mode
 * changes (via MutationObserver). Our CSS selectors respond automatically.
 */

(function () {
	"use strict";

	function applyNexoraTheme() {
		var root = document.documentElement;
		var current = root.getAttribute("data-nexora-theme");
		if (!current) {
			root.setAttribute("data-nexora-theme", "default");
		}
	}

	function onReady(fn) {
		if (document.readyState === "loading") {
			document.addEventListener("DOMContentLoaded", fn);
		} else {
			fn();
		}
	}

	onReady(applyNexoraTheme);

	// Also apply immediately if documentElement is already available
	applyNexoraTheme();
})();
