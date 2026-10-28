// Interactive assay plate behind the homepage hero (styled by .plate-hero-canvas in theme.css).
// Load sweep reveals the readout, hover highlights wells, click fills or empties a single well.
(function () {
    var PITCH = 22, R = 6.3, FILL_R = 5.6;
    var RED = [192, 57, 43];
    var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    var hero, canvas, ctx, dpr, cols, rows, fill, grow, hover, pointer;
    var sweepStart = 0, raf = 0;

    // Small seeded PRNG so the readout is the same on every load
    function rng(seed) {
        return function () {
            seed = (seed * 1664525 + 1013904223) >>> 0;
            return seed / 4294967296;
        };
    }

    function layout() {
        var rect = { width: hero.clientWidth, height: hero.clientHeight };
        dpr = window.devicePixelRatio || 1;
        canvas.width = Math.round(rect.width * dpr);
        canvas.height = Math.round(rect.height * dpr);
        canvas.style.width = rect.width + "px";
        canvas.style.height = rect.height + "px";
        cols = Math.ceil(rect.width / PITCH);
        rows = Math.ceil(rect.height / PITCH);
        var rand = rng(21);
        fill = new Float32Array(cols * rows);
        grow = new Float32Array(cols * rows).fill(1);
        hover = new Float32Array(cols * rows);
        for (var i = 0; i < fill.length; i++) {
            var r = rand();
            fill[i] = r < 0.035 ? 1 : r < 0.065 ? 0.6 : r < 0.1 ? 0.3 : 0;
        }
        draw(performance.now());
    }

    function draw(now) {
        var sweepCol = reduced ? cols : ((now - sweepStart) / 900) * cols;
        var busy = sweepCol < cols;
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        for (var c = 0; c < cols; c++) {
            var revealed = c < sweepCol;
            for (var r = 0; r < rows; r++) {
                var i = c * rows + r;
                var x = c * PITCH + PITCH / 2, y = r * PITCH + PITCH / 2;

                // hover rims ease towards the pointer distance
                var target = 0;
                if (pointer) {
                    var d = Math.hypot(x - pointer.x, y - pointer.y);
                    target = Math.max(0, 1 - d / 70);
                }
                hover[i] += (target - hover[i]) * 0.2;
                if (Math.abs(target - hover[i]) > 0.01) busy = true;

                // a freshly filled well swells in from the centre
                if (grow[i] < 1) { grow[i] = Math.min(1, grow[i] + 0.12); busy = true; }

                var v = revealed ? fill[i] : 0;
                if (v > 0) {
                    ctx.beginPath();
                    ctx.arc(x, y, FILL_R * grow[i], 0, Math.PI * 2);
                    ctx.fillStyle = "rgba(" + RED + "," + v + ")";
                    ctx.fill();
                }
                var h = hover[i];
                ctx.beginPath();
                ctx.arc(x, y, R + h * 1.2, 0, Math.PI * 2);
                ctx.lineWidth = 1 + h;
                ctx.strokeStyle = h > 0.02
                    ? "rgba(" + RED + "," + (0.16 + h * 0.84) + ")"
                    : "rgba(0,0,0,0.11)";
                ctx.stroke();
            }
            // the reader head
            if (!reduced && Math.floor(sweepCol) === c) {
                ctx.fillStyle = "rgba(192,57,43,0.08)";
                ctx.fillRect(c * PITCH, 0, PITCH, rows * PITCH);
            }
        }
        return busy;
    }

    function loop(now) {
        raf = draw(now) ? requestAnimationFrame(loop) : 0;
    }
    function kick() {
        if (!raf) raf = requestAnimationFrame(loop);
    }

    function localPoint(e) {
        var rect = canvas.getBoundingClientRect();
        return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    }
    function onMove(e) { pointer = localPoint(e); kick(); }
    function onLeave() { pointer = null; kick(); }
    // clicks where the plate is visible, i.e. not on a link or faded out under the copy
    function onPlate(e) {
        return !e.target.closest("a, button") && localPoint(e).x >= canvas.clientWidth * 0.55;
    }
    // stop the press starting a text selection, which swaps out the crosshair cursor
    function onDown(e) { if (onPlate(e)) e.preventDefault(); }
    function onClick(e) {
        if (!onPlate(e)) return;
        var p = localPoint(e);
        var c = Math.floor(p.x / PITCH), r = Math.floor(p.y / PITCH);
        if (c < 0 || c >= cols || r < 0 || r >= rows) return;
        var i = c * rows + r;
        // empty wells get a full dose; anything already in a well is cleared
        fill[i] = fill[i] > 0 ? 0 : 1;
        grow[i] = reduced || !fill[i] ? 1 : 0;
        kick();
    }

    function start() {
        hero = document.querySelector(".hero-split");
        if (!hero || canvas) return;
        canvas = document.createElement("canvas");
        canvas.className = "plate-hero-canvas";
        canvas.setAttribute("aria-hidden", "true");
        canvas.style.cssText = "position:absolute;left:0;top:0;z-index:-1;pointer-events:none";
        if (getComputedStyle(hero).position === "static") hero.style.position = "relative";
        ctx = canvas.getContext("2d");
        hero.prepend(canvas);
        hero.addEventListener("pointermove", onMove);
        hero.addEventListener("pointerleave", onLeave);
        hero.addEventListener("mousedown", onDown);
        hero.addEventListener("click", onClick);
        new ResizeObserver(layout).observe(hero);
        sweepStart = performance.now();
        kick();
    }

    start();
})();
