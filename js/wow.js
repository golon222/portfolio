/* ==========================================================================
   Jgolon.pl - warstwa interakcji
   Jedna petla rAF obsluguje pasek postepu, parallakse hero, wypelnianie osi
   czasu i przycisk powrotu. Canvas zatrzymuje sie poza widokiem i w tle karty.
   Animowane sa tylko transform oraz opacity, wiec nie wymuszaja przeliczen
   ukladu strony.
   ========================================================================== */

(function () {
    'use strict';

    var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var body = document.body;

    body.classList.add('js');

    /* ======================================================================
       Wspolna petla przewijania
       ====================================================================== */

    var progress = document.getElementById('progress');
    var toTop = document.getElementById('scrollToTop');
    var heroWrap = document.querySelector('[data-parallax]');
    var timelines = Array.prototype.slice.call(document.querySelectorAll('.timeline'));
    var ticking = false;
    var lastTopVisible = null;

    function update() {
        ticking = false;

        var y = window.pageYOffset;
        var vh = window.innerHeight;
        var max = document.documentElement.scrollHeight - vh;

        if (progress) progress.style.width = (max > 0 ? (y / max) * 100 : 0) + '%';

        if (toTop) {
            var show = y > 420;
            if (show !== lastTopVisible) {
                toTop.classList.toggle('show', show);
                lastTopVisible = show;
            }
        }

        /* parallaksa tresci hero: wyjazd w gore, zeby tekst nie wchodzil pod
           pasek faktow, ktory nachodzi na dolna krawedz hero */
        if (heroWrap && !reduced && y < vh * 1.2) {
            var speed = parseFloat(heroWrap.getAttribute('data-parallax')) || 0.15;
            heroWrap.style.transform = 'translate3d(0,' + (-y * speed).toFixed(1) + 'px,0)';
            heroWrap.style.opacity = Math.max(0, 1 - y / (vh * 0.7)).toFixed(3);
        }

        /* os czasu wypelnia sie w miare przewijania */
        if (!reduced) {
            for (var i = 0; i < timelines.length; i++) {
                var tl = timelines[i];
                var b = tl.getBoundingClientRect();
                if (b.bottom < 0 || b.top > vh) continue;
                var p = (vh * 0.75 - b.top) / b.height;
                tl.style.setProperty('--tl', (Math.max(0, Math.min(1, p)) * 100).toFixed(1) + '%');
            }
        }
    }

    function requestUpdate() {
        if (!ticking) {
            ticking = true;
            requestAnimationFrame(update);
        }
    }

    window.addEventListener('scroll', requestUpdate, { passive: true });
    window.addEventListener('resize', requestUpdate, { passive: true });
    update();

    /* ======================================================================
       Odslanianie elementow
       ====================================================================== */

    var revealables = document.querySelectorAll('.reveal');

    if (reduced || !('IntersectionObserver' in window)) {
        Array.prototype.forEach.call(revealables, function (el) { el.classList.add('in'); });
    } else {
        var io = new IntersectionObserver(function (entries) {
            for (var i = 0; i < entries.length; i++) {
                var e = entries[i];
                if (!e.isIntersecting) continue;
                var el = e.target;
                var delay = parseInt(el.getAttribute('data-delay') || '0', 10);
                if (delay) {
                    setTimeout(function (node) {
                        return function () { node.classList.add('in'); };
                    }(el), delay);
                } else {
                    el.classList.add('in');
                }
                io.unobserve(el);
            }
        }, { threshold: 0.1, rootMargin: '0px 0px -8% 0px' });

        Array.prototype.forEach.call(revealables, function (el) { io.observe(el); });
    }

    /* ======================================================================
       Siatka punktow w hero
       ====================================================================== */

    var canvas = document.getElementById('heroCanvas');

    if (canvas && !reduced) {
        var ctx = canvas.getContext('2d', { alpha: true });
        var host = canvas.parentElement;
        var dots = [];
        var w = 0, h = 0;
        var dpr = Math.min(window.devicePixelRatio || 1, 2);
        var running = false;
        var inView = true;
        var LINK = 126;
        var mouse = { x: -999, y: -999 };

        function resize() {
            var box = host.getBoundingClientRect();
            w = Math.round(box.width);
            h = Math.round(box.height);
            canvas.width = w * dpr;
            canvas.height = h * dpr;
            canvas.style.width = w + 'px';
            canvas.style.height = h + 'px';
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

            /* liczba punktow skalowana powierzchnia i ograniczona z gory */
            var count = Math.max(22, Math.min(64, Math.round((w * h) / 19000)));

            dots.length = 0;
            for (var i = 0; i < count; i++) {
                dots.push({
                    x: Math.random() * w,
                    y: Math.random() * h,
                    vx: (Math.random() - 0.5) * 0.22,
                    vy: (Math.random() - 0.5) * 0.22,
                    r: Math.random() * 1.5 + 0.7
                });
            }
        }

        function frame() {
            if (!running) return;

            ctx.clearRect(0, 0, w, h);

            var n = dots.length;

            for (var i = 0; i < n; i++) {
                var d = dots[i];

                d.x += d.vx;
                d.y += d.vy;
                if (d.x < 0 || d.x > w) d.vx = -d.vx;
                if (d.y < 0 || d.y > h) d.vy = -d.vy;

                ctx.beginPath();
                ctx.arc(d.x, d.y, d.r, 0, 6.283185);
                ctx.fillStyle = 'rgba(201, 138, 104, 0.6)';
                ctx.fill();

                for (var j = i + 1; j < n; j++) {
                    var o = dots[j];
                    var dx = d.x - o.x;
                    if (dx > LINK || dx < -LINK) continue;
                    var dy = d.y - o.y;
                    if (dy > LINK || dy < -LINK) continue;
                    var sq = dx * dx + dy * dy;
                    if (sq > LINK * LINK) continue;

                    ctx.beginPath();
                    ctx.moveTo(d.x, d.y);
                    ctx.lineTo(o.x, o.y);
                    ctx.strokeStyle = 'rgba(169, 105, 71, ' + (0.26 * (1 - Math.sqrt(sq) / LINK)).toFixed(3) + ')';
                    ctx.lineWidth = 1;
                    ctx.stroke();
                }

                if (mouse.x > -900) {
                    var mx = d.x - mouse.x, my = d.y - mouse.y;
                    var msq = mx * mx + my * my;
                    if (msq < 28900) {
                        ctx.beginPath();
                        ctx.moveTo(d.x, d.y);
                        ctx.lineTo(mouse.x, mouse.y);
                        ctx.strokeStyle = 'rgba(242, 239, 234, ' + (0.34 * (1 - Math.sqrt(msq) / 170)).toFixed(3) + ')';
                        ctx.lineWidth = 1;
                        ctx.stroke();
                    }
                }
            }

            requestAnimationFrame(frame);
        }

        function setRunning(v) {
            if (v === running) return;
            running = v;
            if (v) requestAnimationFrame(frame);
        }

        function evaluate() {
            setRunning(inView && !document.hidden);
        }

        if ('IntersectionObserver' in window) {
            new IntersectionObserver(function (entries) {
                inView = entries[0].isIntersecting;
                evaluate();
            }, { threshold: 0 }).observe(host);
        }

        document.addEventListener('visibilitychange', evaluate);

        if (window.matchMedia('(hover: hover)').matches) {
            host.addEventListener('mousemove', function (e) {
                var box = canvas.getBoundingClientRect();
                mouse.x = e.clientX - box.left;
                mouse.y = e.clientY - box.top;
            }, { passive: true });

            host.addEventListener('mouseleave', function () {
                mouse.x = mouse.y = -999;
            }, { passive: true });
        }

        var rt;
        window.addEventListener('resize', function () {
            clearTimeout(rt);
            rt = setTimeout(resize, 160);
        }, { passive: true });

        resize();
        evaluate();
    }

    /* ======================================================================
       Rotacja opisu roli
       ====================================================================== */

    var roleEl = document.getElementById('roleRotator');

    if (roleEl) {
        var roles = (roleEl.getAttribute('data-roles') || '').split('|').filter(Boolean);

        if (roles.length > 1 && !reduced) {
            var ri = 0, ci = roles[0].length, deleting = true, paused = false;

            document.addEventListener('visibilitychange', function () {
                paused = document.hidden;
            });

            setTimeout(function type() {
                if (paused) { setTimeout(type, 600); return; }

                var full = roles[ri];
                ci += deleting ? -1 : 1;
                roleEl.textContent = full.slice(0, ci);

                var wait = deleting ? 32 : 58;

                if (!deleting && ci >= full.length) {
                    deleting = true;
                    wait = 2400;
                } else if (deleting && ci <= 0) {
                    deleting = false;
                    ri = (ri + 1) % roles.length;
                    wait = 300;
                }

                setTimeout(type, wait);
            }, 2400);
        }
    }

    /* ======================================================================
       Pochylanie kart i poswiata pod kursorem
       ====================================================================== */

    if (!reduced && window.matchMedia('(hover: hover)').matches) {
        Array.prototype.forEach.call(document.querySelectorAll('[data-tilt]'), function (el) {
            var queued = false, lx = 0, ly = 0;

            function apply() {
                queued = false;
                el.style.transform = 'perspective(900px) rotateY(' + ((lx - 0.5) * 6).toFixed(2) +
                    'deg) rotateX(' + ((0.5 - ly) * 6).toFixed(2) + 'deg) translate3d(0,-4px,0)';
                el.style.setProperty('--mx', (lx * 100).toFixed(1) + '%');
                el.style.setProperty('--my', (ly * 100).toFixed(1) + '%');
            }

            el.addEventListener('mouseenter', function () {
                el.style.willChange = 'transform';
            });

            el.addEventListener('mousemove', function (e) {
                var b = el.getBoundingClientRect();
                lx = (e.clientX - b.left) / b.width;
                ly = (e.clientY - b.top) / b.height;
                if (!queued) { queued = true; requestAnimationFrame(apply); }
            }, { passive: true });

            el.addEventListener('mouseleave', function () {
                el.style.transform = '';
                el.style.willChange = '';
            });
        });
    }

    /* ======================================================================
       Kopiowanie danych kontaktowych
       ====================================================================== */

    var toast = document.getElementById('toast');
    var toastTimer;

    function showToast(msg) {
        if (!toast) return;
        toast.textContent = msg;
        toast.classList.add('show');
        clearTimeout(toastTimer);
        toastTimer = setTimeout(function () { toast.classList.remove('show'); }, 2200);
    }

    Array.prototype.forEach.call(document.querySelectorAll('[data-copy]'), function (el) {
        el.addEventListener('click', function (e) {
            if (!navigator.clipboard) return;
            e.preventDefault();
            var val = el.getAttribute('data-copy');
            navigator.clipboard.writeText(val).then(function () {
                showToast('Skopiowano: ' + val);
            }, function () {
                showToast('Nie udalo sie skopiowac');
            });
        });
    });

    /* ======================================================================
       Ziarno i kursor
       ====================================================================== */

    var hoverable = window.matchMedia('(hover: hover)').matches;

    if (!reduced) {
        var grain = document.createElement('div');
        grain.id = 'grain';
        body.appendChild(grain);
    }

    if (!reduced && hoverable) {
        var dot = document.createElement('div');
        var ring = document.createElement('div');
        dot.id = 'cur';
        ring.id = 'curRing';
        body.appendChild(dot);
        body.appendChild(ring);

        var tx = -100, ty = -100;   /* cel, czyli pozycja kursora */
        var rx = -100, ry = -100;   /* pierscien dogania z opoznieniem */
        var curRunning = false;

        function curFrame() {
            rx += (tx - rx) * 0.16;
            ry += (ty - ry) * 0.16;
            ring.style.transform = 'translate3d(' + rx.toFixed(1) + 'px,' + ry.toFixed(1) + 'px,0)';

            /* gdy pierscien dogonil kursor, petla sie zatrzymuje */
            if (Math.abs(tx - rx) < 0.3 && Math.abs(ty - ry) < 0.3) {
                curRunning = false;
                return;
            }
            requestAnimationFrame(curFrame);
        }

        function curStart() {
            if (!curRunning) {
                curRunning = true;
                requestAnimationFrame(curFrame);
            }
        }

        document.addEventListener('mousemove', function (e) {
            tx = e.clientX;
            ty = e.clientY;
            dot.style.transform = 'translate3d(' + tx + 'px,' + ty + 'px,0)';
            body.classList.add('cur-on');

            /* na ciemnych pasmach kursor zmienia kolor */
            var dark = false;
            var el = e.target;
            while (el && el !== body) {
                if (el.classList && (el.classList.contains('hero') ||
                    el.classList.contains('page-head') ||
                    el.classList.contains('closing') ||
                    el.tagName === 'FOOTER')) { dark = true; break; }
                el = el.parentElement;
            }
            body.classList.toggle('cur-dark', dark);

            curStart();
        }, { passive: true });

        document.addEventListener('mouseleave', function () {
            body.classList.remove('cur-on');
        });

        /* pierscien rosnie nad elementami interaktywnymi */
        document.addEventListener('mouseover', function (e) {
            var hot = e.target.closest('a, button, .stack-tile, .contact-card, [data-tilt]');
            body.classList.toggle('cur-hot', !!hot);
        }, { passive: true });
    }

    /* ======================================================================
       Odslanianie naglowkow slowo po slowie
       ====================================================================== */

    if (!reduced && 'IntersectionObserver' in window) {
        var heads = document.querySelectorAll('.hero h1, .page-head h1, .section-head h2, .closing h2');

        var split = function (el) {
            var out = [];

            Array.prototype.forEach.call(el.childNodes, function (node) {
                if (node.nodeType === 3) {
                    node.nodeValue.split(/(\s+)/).forEach(function (part) {
                        if (!part) return;
                        if (/^\s+$/.test(part)) { out.push(document.createTextNode(' ')); return; }
                        var w = document.createElement('span');
                        var i = document.createElement('span');
                        w.className = 'sp-w';
                        i.className = 'sp-i';
                        i.textContent = part;
                        w.appendChild(i);
                        out.push(w);
                    });
                } else {
                    /* element potomny, na przyklad wyrozniony fragment, zostaje caloscia */
                    var w2 = document.createElement('span');
                    var i2 = document.createElement('span');
                    w2.className = 'sp-w';
                    i2.className = 'sp-i';
                    i2.appendChild(node.cloneNode(true));
                    w2.appendChild(i2);
                    out.push(w2);
                }
            });

            el.textContent = '';
            out.forEach(function (n) { el.appendChild(n); });
        };

        var sio = new IntersectionObserver(function (entries) {
            for (var i = 0; i < entries.length; i++) {
                if (!entries[i].isIntersecting) continue;
                var el = entries[i].target;
                var parts = el.querySelectorAll('.sp-i');
                Array.prototype.forEach.call(parts, function (p, k) {
                    p.style.transitionDelay = (k * 0.055).toFixed(3) + 's';
                });
                el.classList.add('sp-on');
                sio.unobserve(el);
            }
        }, { threshold: 0.2 });

        Array.prototype.forEach.call(heads, function (el) {
            split(el);
            sio.observe(el);
        });

        /* zabezpieczenie: gdyby obserwator nie zadzialal, naglowek widoczny na
           ekranie nie moze zostac ukryty na stale */
        setTimeout(function () {
            Array.prototype.forEach.call(heads, function (el) {
                if (el.classList.contains('sp-on')) return;
                var r = el.getBoundingClientRect();
                if (r.top < window.innerHeight && r.bottom > 0) el.classList.add('sp-on');
            });
        }, 2500);
    }

    /* ======================================================================
       Przyciski przyciagane kursorem
       ====================================================================== */

    if (!reduced && hoverable) {
        Array.prototype.forEach.call(document.querySelectorAll('.btn'), function (el) {
            var q = false, mx = 0, my = 0;

            function put() {
                q = false;
                el.style.transform = 'translate3d(' + (mx * 9).toFixed(1) + 'px,' + (my * 6 - 3).toFixed(1) + 'px,0)';
            }

            el.addEventListener('mousemove', function (e) {
                var b = el.getBoundingClientRect();
                mx = (e.clientX - b.left) / b.width - 0.5;
                my = (e.clientY - b.top) / b.height - 0.5;
                if (!q) { q = true; requestAnimationFrame(put); }
            }, { passive: true });

            el.addEventListener('mouseleave', function () { el.style.transform = ''; });
        });
    }

    /* ======================================================================
       Przejscie miedzy podstronami
       ====================================================================== */

    if (!reduced) {
        var wipe = document.createElement('div');
        wipe.id = 'wipe';
        wipe.className = 'in';
        body.appendChild(wipe);

        /* po wczytaniu zasona zjezdza w gore i odslania strone */
        requestAnimationFrame(function () {
            requestAnimationFrame(function () { wipe.className = 'out'; });
        });

        document.addEventListener('click', function (e) {
            var a = e.target.closest('a');
            if (!a) return;
            if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
            if (a.target === '_blank' || a.hasAttribute('download')) return;

            var href = a.getAttribute('href') || '';
            if (!href || href.charAt(0) === '#' || /^(mailto:|tel:|javascript:)/i.test(href)) return;

            var url;
            try { url = new URL(a.href); } catch (err) { return; }
            if (url.origin !== location.origin) return;
            if (url.pathname === location.pathname && url.hash) return;

            e.preventDefault();
            wipe.className = 'in';

            /* nawigacja i tak nastapi, nawet gdyby animacja nie doszla do konca */
            setTimeout(function () { location.href = a.href; }, 480);
        });
    }

    /* ======================================================================
       Start
       ====================================================================== */

    if (document.readyState === 'complete') {
        body.classList.add('loaded');
    } else {
        window.addEventListener('load', function () { body.classList.add('loaded'); });
    }
})();
