/**
 * Nexora Theme Selector Integration
 *
 * Extends Frappe's built-in ThemeSwitcher to add a "Nexora Default" entry.
 * This does NOT replace Frappe's theme system — it augments it.
 *
 * Architecture:
 *   - Nexora Default is a color scheme applied on top of Frappe's light/dark modes.
 *   - When selected, we set data-theme-mode (light/dark/automatic) AND
 *     data-nexora-theme="default" on <html>.
 *   - The data-nexora-theme attribute is persisted in localStorage because
 *     Frappe's desk_theme User field only accepts "Light"/"Dark"/"Automatic".
 *   - When "Nexora Default" is active, Frappe's light/dark switch continues
 *     to work — data-theme updates from data-theme-mode, and our CSS follows.
 *
 * Extension method: prototype override
 *   We replace ThemeSwitcher.prototype methods rather than editing core files.
 *   This is robust because the class is defined once and instances are
 *   short-lived (created on each Switch Theme click).
 */

frappe.provide("frappe.ui");

(function () {
	"use strict";

	var NEXORA_THEME_KEY = "nexora_desk_theme";
	var NEXORA_THEME_DEFAULT = "default";

	/**
	 * Check if Nexora theme should be active on page load.
	 * Reads from localStorage; returns the theme name or null.
	 */
	function getPersistedNexoraTheme() {
		var saved = localStorage.getItem(NEXORA_THEME_KEY);
		return saved === NEXORA_THEME_DEFAULT ? saved : null;
	}

	/**
	 * Apply Nexora theme attribute to <html>.
	 * Called on init and when the user selects Nexora from the selector.
	 */
	function applyNexoraTheme() {
		var root = document.documentElement;
		var saved = getPersistedNexoraTheme();
		if (saved) {
			root.setAttribute("data-nexora-theme", saved);
		}
	}

	/**
	 * Remove Nexora theme attribute from <html>.
	 * Called when user selects a non-Nexora Frappe theme.
	 */
	function removeNexoraTheme() {
		var root = document.documentElement;
		root.removeAttribute("data-nexora-theme");
	}

	/**
	 * Persist Nexora theme preference.
	 * Called when user selects Nexora Default.
	 */
	function persistNexoraTheme() {
		localStorage.setItem(NEXORA_THEME_KEY, NEXORA_THEME_DEFAULT);
	}

	/**
	 * Clear persisted Nexora theme preference.
	 * Called when user selects a non-Nexora Frappe theme.
	 */
	function clearPersistedNexoraTheme() {
		localStorage.removeItem(NEXORA_THEME_KEY);
	}

	/**
	 * Extend Frappe's ThemeSwitcher by overriding prototype methods.
	 * We do NOT replace the constructor (ThemeSwitcher is an ES6 class
	 * and cannot be invoked with .apply() without 'new').
	 * Instead, we override the methods that need changing.
	 */
	// Override fetch_themes to add Nexora Default
	frappe.ui.ThemeSwitcher.prototype.fetch_themes = function () {
		var self = this;
		return new Promise(function (resolve) {
			self.themes = [
				{
					name: "light",
					label: __("Frappe Light"),
					info: __("Light Theme"),
				},
				{
					name: "nexora-default",
					label: __("Nexora Default"),
					info: __("Nexora Light & Dark Theme"),
				},
				{
					name: "dark",
					label: __("Timeless Night"),
					info: __("Dark Theme"),
				},
				{
					name: "automatic",
					label: __("Automatic"),
					info: __("Uses system's theme to switch between light and dark mode"),
				},
			];
			resolve(self.themes);
		});
	};

	/**
	 * Override refresh to detect the current theme accurately.
	 * When Nexora is active, data-theme-mode is "light" but
	 * data-nexora-theme="default" is also present — so we check
	 * that attribute to set current_theme to "nexora-default".
	 */
	frappe.ui.ThemeSwitcher.prototype.refresh = function () {
		var root = document.documentElement;
		var nexoraActive = root.getAttribute("data-nexora-theme") === "default";
		this.current_theme = nexoraActive
			? "nexora-default"
			: (root.getAttribute("data-theme-mode") || "light");
		this.fetch_themes().then(function () {
			this.render();
		}.bind(this));
	};

	/**
	 * Override toggle_theme to handle Nexora Default.
	 * Nexora Default is not a Frappe desk_theme value (Light/Dark/Automatic),
	 * so we handle persistence via localStorage and still call Frappe's
	 * switch_theme with "Light" to keep the User record compatible.
	 */
	frappe.ui.ThemeSwitcher.prototype.toggle_theme = function (theme) {
		this.current_theme = theme.toLowerCase();

		if (theme === "nexora-default") {
			// Activate Nexora on top of light mode
			persistNexoraTheme();
			applyNexoraTheme();
			document.documentElement.setAttribute("data-theme-mode", "light");
			frappe.ui.set_theme("light");
			// Nexora CSS automatically follows via data-theme
		} else if (theme === "automatic") {
			// Automatic mode + Nexora should not coexist — clear Nexora
			clearPersistedNexoraTheme();
			removeNexoraTheme();
			document.documentElement.setAttribute("data-theme-mode", theme);
			frappe.ui.set_theme();
		} else {
			// Frappe native themes: clear Nexora, behave as original
			clearPersistedNexoraTheme();
			removeNexoraTheme();
			document.documentElement.setAttribute("data-theme-mode", theme);
			frappe.ui.set_theme(theme);
		}

		frappe.show_alert(__("Theme Changed"), 3);

		// Always persist to desk_theme for sync (use "Light" for Nexora)
		var themeTitle = theme === "nexora-default" ? "Light" : toTitle(theme);
		frappe.xcall("frappe.core.doctype.user.user.switch_theme", {
			theme: themeTitle,
		});
	};

	/**
	 * Override get_preview_html to render Nexora's preview card.
	 * The Nexora preview card uses data-nexora-theme so it renders
	 * with Nexora's actual colors.
	 */
	frappe.ui.ThemeSwitcher.prototype.get_preview_html = function (theme) {
		var isNexora = theme.name === "nexora-default";
		var isAuto = theme.name === "automatic";

		var previewTheme = isAuto ? "light" : isNexora ? "light" : theme.name;
		var previewCheckTheme = isAuto ? "dark" : theme.name;

		var classes = this.current_theme === theme.name
			? "selected" : "";

		var html = $('<div class="' + classes + '">' +
			'<div data-theme="' + previewTheme + '" data-nexora-theme="' + (isNexora ? "default" : "") + '" data-is-auto-theme="' + isAuto + '" title="' + theme.info + '">' +
				'<div class="background">' +
					'<div>' +
						'<div class="preview-check" data-theme="' + previewCheckTheme + '">' +
							frappe.utils.icon("tick", "xs") +
						'</div>' +
					'</div>' +
					'<div class="navbar"></div>' +
					'<div class="p-2">' +
						'<div class="toolbar">' +
							'<span class="text"></span>' +
							'<span class="primary"></span>' +
						'</div>' +
						'<div class="foreground"></div>' +
						'<div class="foreground"></div>' +
					'</div>' +
				'</div>' +
			'</div>' +
			'<div class="mt-3 text-center">' +
				'<h5 class="theme-title">' + theme.label + '</h5>' +
			'</div>' +
		'</div>');

		html.on("click", () => {
			if (this.current_theme === theme.name) return;

			this.themes.forEach((th) => {
				th.$html.removeClass("selected");
			});

			html.addClass("selected");
			this.toggle_theme(theme.name);
		});

		return html;
	};

	// Apply persisted Nexora theme on load
	frappe.ready(function () {
		applyNexoraTheme();
	});

	// Export for testing/debug
	frappe.ui.nexora_theme = {
		THEME_KEY: NEXORA_THEME_KEY,
		THEME_DEFAULT: NEXORA_THEME_DEFAULT,
		apply: applyNexoraTheme,
		remove: removeNexoraTheme,
		persist: persistNexoraTheme,
		clear: clearPersistedNexoraTheme,
		get: getPersistedNexoraTheme,
	};
})();
