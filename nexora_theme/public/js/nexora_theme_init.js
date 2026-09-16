/**
 * Nexora Theme Initialization
 *
 * On page load, checks whether the user previously selected "Nexora Default"
 * in the theme selector (stored in localStorage by nexora_theme_toggle.js).
 * If so, sets data-nexora-theme="default" on <html> to activate the CSS
 * variable overrides.
 *
 * This is additive — it does not interfere with Frappe's existing
 * data-theme-mode / data-theme attributes. Frappe's set_theme() updates
 * data-theme in response to data-theme-mode changes; our CSS follows via
 * the [data-nexora-theme="default"][data-theme="light|dark"] selectors.
 *
 * Login page starfield is handled separately in login_starfield.js
 * and is isolated to body[data-path="login"].
 */

(function () {
	"use strict";

	var NEXORA_THEME_KEY = "nexora_desk_theme";

	function applyNexoraTheme() {
		var saved = localStorage.getItem(NEXORA_THEME_KEY);
		if (saved) {
			document.documentElement.setAttribute("data-nexora-theme", saved);
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
	applyNexoraTheme();
})();
