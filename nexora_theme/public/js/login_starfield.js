/**
 * Nexora Starfield — Canvas-based animated starfield for the login page.
 *
 * Architecture: canvas-based (chosen over CSS/DOM for performance, memory, and
 * animation control). Inspired by pernebye/starfield-canvas.
 *
 * Layers:
 *   1. Distant stars — very small, slow drift, low opacity
 *   2. Mid stars — small, subtle twinkle, moderate opacity
 *   3. Foreground stars — slightly larger, slow movement, higher opacity
 *
 * Shooting stars appear occasionally, triggered by randomized intervals.
 * All animation is gated behind prefers-reduced-motion and mobile detection.
 */

(function () {
	"use strict";

	// Gate: only run on the login page
	if (document.body && document.body.dataset && document.body.dataset.path !== "login") {
		return;
	}

	if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
		return;
	}

	var isMobile = window.matchMedia("(max-width: 767px)").matches;

	var canvas = document.createElement("canvas");
	canvas.id = "nexora-star-canvas";
	document.body.appendChild(canvas);

	var ctx = canvas.getContext("2d");
	if (!ctx) {
		canvas.style.display = "none";
		return;
	}

	var width, height;
	var animationFrameId;
	var lastTime = 0;
	var nextShootingStar = 0;
	var dpr = Math.min(window.devicePixelRatio || 1, 2);

	var colors = {};
	function cacheColors() {
		var style = getComputedStyle(document.body);
		colors.canvasBg = style.getPropertyValue("--nexora-star-canvas").trim() || "#0a0a12";
		colors.starDistant = parseRgba(style.getPropertyValue("--nexora-login-star-distant").trim() || "rgba(255, 255, 255, 0.35)");
		colors.starMid = parseRgba(style.getPropertyValue("--nexora-login-star-mid").trim() || "rgba(255, 255, 255, 0.55)");
		colors.starForeground = parseRgba(style.getPropertyValue("--nexora-login-star-foreground").trim() || "rgba(255, 255, 255, 0.8)");
		colors.shootingStar = parseRgba(style.getPropertyValue("--nexora-login-shooting-star").trim() || "rgba(255, 255, 255, 0.95)");
	}

	function parseRgba(str) {
		var m = str.match(/rgba?\s*\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\s*\)/);
		if (!m) return { r: 255, g: 255, b: 255, a: 0.6 };
		return {
			r: parseInt(m[1]),
			g: parseInt(m[2]),
			b: parseInt(m[3]),
			a: m[4] !== undefined ? parseFloat(m[4]) : 1,
		};
	}

	function rgba(color, alpha) {
		var a = color.a * (alpha !== undefined ? alpha : 1);
		return "rgba(" + color.r + ", " + color.g + ", " + color.b + ", " + a + ")";
	}

	// Star layers — each with independent speed, radius, opacity, and twinkle
	var layers = [
		{
			count: isMobile ? 50 : 180,
			speed: 0.02,
			radiusMin: 0.4,
			radiusMax: 0.8,
			opacityMin: 0.2,
			opacityMax: 0.35,
			twinkleSpeed: 0.3,
			twinkleAmp: 0.15,
			starChance: 0.05,
		},
		{
			count: isMobile ? 25 : 80,
			speed: 0.06,
			radiusMin: 0.9,
			radiusMax: 1.3,
			opacityMin: 0.45,
			opacityMax: 0.65,
			twinkleSpeed: 0.7,
			twinkleAmp: 0.2,
			starChance: 0.15,
		},
		{
			count: isMobile ? 10 : 45,
			speed: 0.12,
			radiusMin: 1.2,
			radiusMax: 1.8,
			opacityMin: 0.7,
			opacityMax: 0.9,
			twinkleSpeed: 1.2,
			twinkleAmp: 0.25,
			starChance: 0.25,
		},
	];

	var stars = [];
	var shootingStars = [];

	function init() {
		width = window.innerWidth;
		height = window.innerHeight;
		canvas.width = width * dpr;
		canvas.height = height * dpr;
		canvas.style.width = width + "px";
		canvas.style.height = height + "px";
		ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

		cacheColors();

		stars.length = 0;
		for (var layerIndex = 0; layerIndex < layers.length; layerIndex++) {
			var layer = layers[layerIndex];
			for (var i = 0; i < layer.count; i++) {
				stars.push({
					layer: layerIndex,
					x: Math.random() * width,
					y: Math.random() * height,
					radius: layer.radiusMin + Math.random() * (layer.radiusMax - layer.radiusMin),
					opacity: layer.opacityMin + Math.random() * (layer.opacityMax - layer.opacityMin),
					twinklePhase: Math.random() * Math.PI * 2,
					twinkleSpeed: layer.twinkleSpeed,
					twinkleAmp: layer.twinkleAmp,
					isStar: Math.random() < layer.starChance,
				});
			}
		}

		shootingStars.length = 0;
		nextShootingStar = 2000 + Math.random() * 3000;
	}

	function resize() {
		init();
	}

	window.addEventListener("resize", resize);

	function drawStarShape(cx, cy, radius, alpha, color) {
		ctx.globalAlpha = alpha;
		ctx.fillStyle = color;
		ctx.beginPath();
		var spikes = 4;
		var outerRadius = radius;
		var innerRadius = radius * 0.25;
		for (var i = 0; i < spikes * 2; i++) {
			var r = i % 2 === 0 ? outerRadius : innerRadius;
			var angle = (i * Math.PI) / spikes - Math.PI / 2;
			var x = cx + Math.cos(angle) * r;
			var y = cy + Math.sin(angle) * r;
			if (i === 0) ctx.moveTo(x, y);
			else ctx.lineTo(x, y);
		}
		ctx.closePath();
		ctx.fill();
	}

	function animate(time) {
		var delta = time - lastTime;
		lastTime = time;
		if (delta <= 0) delta = 16;
		if (delta > 100) delta = 16;

		ctx.fillStyle = colors.canvasBg;
		ctx.fillRect(0, 0, width, height);

		// Draw star layers
		for (var i = 0; i < stars.length; i++) {
			var star = stars[i];
			var layer = layers[star.layer];

			// Twinkle
			var twinkle = 1 + Math.sin(time * 0.001 * star.twinkleSpeed + star.twinklePhase) * star.twinkleAmp;
			var currentOpacity = Math.max(0.1, star.opacity * twinkle);

			var starColor = colors.starDistant;
			if (star.layer === 1) starColor = colors.starMid;
			if (star.layer === 2) starColor = colors.starForeground;

			ctx.globalAlpha = currentOpacity;
			ctx.fillStyle = rgba(starColor);

			if (star.isStar) {
				drawStarShape(star.x, star.y, star.radius * 2.5, currentOpacity, rgba(starColor));
			} else {
				ctx.beginPath();
				ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
				ctx.fill();
			}

			// Subtle glow for larger foreground stars
			// if (star.layer === 2 && star.radius > 1.4) {
			// 	ctx.globalAlpha = currentOpacity * 0.25;
			// 	ctx.beginPath();
			// 	ctx.arc(star.x, star.y, star.radius * 4, 0, Math.PI * 2);
			// 	ctx.fill();
			// }
		}

		// Shooting stars
		nextShootingStar -= delta;
		if (!isMobile && nextShootingStar <= 0) {
			spawnShootingStar();
			nextShootingStar = 4000 + Math.random() * 5000;
		}

		for (var j = shootingStars.length - 1; j >= 0; j--) {
			var s = shootingStars[j];
			s.life -= delta;

			if (s.life <= 0) {
				shootingStars.splice(j, 1);
				continue;
			}

			// Move shooting star
			s.x += s.vx * delta * 0.001;
			s.y += s.vy * delta * 0.001;

			drawShootingStar(s);
		}

		animationFrameId = requestAnimationFrame(animate);
	}

	function spawnShootingStar() {
		var isDownRight = Math.random() > 0.3;
		var angle;
		var startX, startY;

		if (isDownRight) {
			angle = Math.PI / 4 + (Math.random() - 0.5) * 0.6;
			if (Math.random() > 0.5) {
				startX = Math.random() * width * 0.7;
				startY = -30;
			} else {
				startX = -30;
				startY = Math.random() * height * 0.5;
			}
		} else {
			angle = 3 * Math.PI / 4 + (Math.random() - 0.5) * 0.6;
			if (Math.random() > 0.5) {
				startX = width * 0.3 + Math.random() * width * 0.7;
				startY = -30;
			} else {
				startX = width + 30;
				startY = Math.random() * height * 0.5;
			}
		}

		var speed = 700 + Math.random() * 1100;
		var trailLength = 80 + Math.random() * 100;
		var life = 900 + Math.random() * 600;

		shootingStars.push({
			x: startX,
			y: startY,
			vx: Math.cos(angle) * speed,
			vy: Math.sin(angle) * speed,
			speed: speed,
			trailLength: trailLength,
			life: life,
			totalLife: life,
		});
	}

	function drawShootingStar(s) {
		var angle = Math.atan2(s.vy, s.vx);
		var trailLength = s.trailLength;

		// Fade in during first 120ms, fade out during last 200ms
		var age = s.totalLife - s.life;
		var fadeIn = Math.min(1, age / 120);
		var fadeOut = Math.min(1, s.life / 200);
		var alpha = fadeIn * fadeOut;

		var sc = colors.shootingStar;

		ctx.save();
		ctx.globalAlpha = alpha;
		ctx.translate(s.x, s.y);
		ctx.rotate(angle);

		// Trail — horizontal gradient extending backward
		var gradient = ctx.createLinearGradient(-trailLength, 0, 0, 0);
		gradient.addColorStop(0, "rgba(255, 255, 255, 0)");
		gradient.addColorStop(0.3, rgba(sc, 0.15));
		gradient.addColorStop(0.7, rgba(sc, 0.6));
		gradient.addColorStop(1, "rgba(255, 255, 255, 1)");

		ctx.fillStyle = gradient;
		ctx.fillRect(-trailLength, -1.4, trailLength, 2.8);

		// Head — sharp bright point
		ctx.fillStyle = "#ffffff";
		ctx.beginPath();
		ctx.arc(0, 0, 1.0, 0, Math.PI * 2);
		ctx.fill();

		ctx.restore();
	}

	function start() {
		init();
		lastTime = performance.now();
		animationFrameId = requestAnimationFrame(animate);
	}

	function stop() {
		if (animationFrameId) {
			cancelAnimationFrame(animationFrameId);
			animationFrameId = null;
		}
	}

	start();

	// Expose for potential cleanup
	window.__nexoraStarfield = {
		start: start,
		stop: stop,
	};
})();
