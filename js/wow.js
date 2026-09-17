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
       Staz liczony od podanej daty

       Element z atrybutem data-since dostaje tekst w postaci "2 lata
       i 3 miesiace", a data startu przenosi sie do podpisu. Bez JavaScriptu
       w elemencie zostaje sama data, wiec nic sie nie przedawnia.
       ====================================================================== */

    /* polska odmiana liczebnikow: 1 rok, 2 lata, 5 lat, 12 lat, 22 lata */
    function odmiana(n, jeden, kilka, wiele) {
        if (n === 1) return jeden;
        var r10 = n % 10, r100 = n % 100;
        if (r10 >= 2 && r10 <= 4 && (r100 < 12 || r100 > 14)) return kilka;
        return wiele;
    }

    Array.prototype.forEach.call(document.querySelectorAll('[data-since]'), function (el) {
        var parts = (el.getAttribute('data-since') || '').split('-');
        if (parts.length !== 3) return;

        var rok = parseInt(parts[0], 10);
        var mies = parseInt(parts[1], 10) - 1;
        var dzien = parseInt(parts[2], 10);
        if (isNaN(rok) || isNaN(mies) || isNaN(dzien)) return;

        var teraz = new Date();
        var m = (teraz.getFullYear() - rok) * 12 + (teraz.getMonth() - mies);
        if (teraz.getDate() < dzien) m--;      /* niepelny miesiac sie nie liczy */
        if (m < 0) m = 0;

        var lat = Math.floor(m / 12);
        var miesiecy = m % 12;
        var txt;

        if (m === 0) {
            txt = 'niespełna miesiąc';
        } else if (lat === 0) {
            txt = miesiecy + ' ' + odmiana(miesiecy, 'miesiąc', 'miesiące', 'miesięcy');
        } else if (miesiecy === 0) {
            txt = lat + ' ' + odmiana(lat, 'rok', 'lata', 'lat');
        } else {
            txt = lat + ' ' + odmiana(lat, 'rok', 'lata', 'lat') +
                  ' i ' + miesiecy + ' ' + odmiana(miesiecy, 'miesiąc', 'miesiące', 'miesięcy');
        }

        el.textContent = txt;

        /* data startu ladnie schodzi do podpisu, zeby nadal byla widoczna */
        var cap = el.parentElement && el.parentElement.querySelector('.cap');
        if (cap) {
            var mm = parts[1].length === 2 ? parts[1] : '0' + parts[1];
            cap.textContent = 'od ' + mm + '.' + parts[0] + ', ' + cap.textContent;
        }
    });

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
       Ziarno
       ====================================================================== */

    var hoverable = window.matchMedia('(hover: hover)').matches;

    if (!reduced) {
        var grain = document.createElement('div');
        grain.id = 'grain';
        body.appendChild(grain);
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

       Wychodzac: tresc gasnie i unosi sie, powloka w kolorze tla przenika,
       a miedziany pasek u gory przeciaga sie do konca. Wchodzac: tresc
       osiada z dolu. Bez twardej zaslony, zeby zmiana byla spokojna.
       ====================================================================== */

    if (!reduced) {
        var veil = document.createElement('div');
        veil.id = 'veil';
        body.appendChild(veil);

        /* wejscie: klasa zdejmowana po pierwszej klatce, wiec tresc osiada */
        body.classList.add('entering');
        requestAnimationFrame(function () {
            requestAnimationFrame(function () { body.classList.remove('entering'); });
        });

        var leaving = false;

        document.addEventListener('click', function (e) {
            if (leaving) return;

            var a = e.target.closest('a');
            if (!a) return;
            if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
            if (a.target === '_blank' || a.hasAttribute('download')) return;

            var href = a.getAttribute('href') || '';
            if (!href || href.charAt(0) === '#' || /^(mailto:|tel:|javascript:)/i.test(href)) return;

            var url;
            try { url = new URL(a.href); } catch (err) { return; }
            if (url.origin !== location.origin) return;
            if (url.hash && url.pathname === location.pathname) return;
            if (url.href === location.href) return;

            e.preventDefault();
            leaving = true;

            var target = a.href;
            var went = false;

            function go() {
                if (went) return;
                went = true;
                location.href = target;
            }

            body.classList.add('leaving');
            veil.classList.add('on');
            if (progress) progress.classList.add('sweep');

            /* Czekamy az powloka naprawde sie domknie, zamiast odliczac staly
               czas. Na wolniejszym sprzecie klatki sa rzadsze, wiec sztywny
               zegar potrafilby przerwac wygaszanie w polowie. */
            veil.addEventListener('transitionend', function (ev) {
                if (ev.propertyName === 'opacity') go();
            });

            /* bezpiecznik: nawigacja nastapi nawet gdyby zdarzenie nie przyszlo */
            setTimeout(go, 700);
        });

        /* powrot przyciskiem wstecz z pamieci przegladarki nie moze
           zostawic strony wygaszonej */
        window.addEventListener('pageshow', function (ev) {
            if (!ev.persisted) return;
            leaving = false;
            body.classList.remove('leaving');
            veil.classList.remove('on');
            if (progress) { progress.classList.remove('sweep'); progress.style.width = '0'; }
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
