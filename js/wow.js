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
       Staz liczony z okresow zatrudnienia

       Atrybut data-periods zawiera liste zakresow "poczatek:koniec"
       rozdzielonych przecinkiem, pusty koniec oznacza trwajacy nadal.
       Sumowane sa tylko dni faktycznie przepracowane, wiec przerwa miedzy
       posadami nie jest doliczana. Bez JavaScriptu w elemencie zostaje
       sama data poczatku, wiec zapasowa tresc nigdy sie nie przedawnia.
       ====================================================================== */

    /* polska odmiana liczebnikow: 1 rok, 2 lata, 5 lat, 12 lat, 22 lata */
    function odmiana(n, jeden, kilka, wiele) {
        if (n === 1) return jeden;
        var r10 = n % 10, r100 = n % 100;
        if (r10 >= 2 && r10 <= 4 && (r100 < 12 || r100 > 14)) return kilka;
        return wiele;
    }

    var DZIEN = 86400000;

    /* Roznica dwoch dat w pelnych miesiacach kalendarzowych plus reszta dni.
       Liczenie przez srednia dlugosc miesiaca zanizalo wynik o caly miesiac
       przy okraglych rocznicach, dlatego liczymy po kalendarzu. */
    function roznica(od, doD) {
        var m = (doD.getFullYear() - od.getFullYear()) * 12 + (doD.getMonth() - od.getMonth());
        var d = doD.getDate() - od.getDate();

        if (d < 0) {
            m--;
            /* ile dni uplynelo od ostatniego dnia o tym samym numerze */
            var dniPoprzedniego = new Date(doD.getFullYear(), doD.getMonth(), 0).getDate();
            var dzien = Math.min(od.getDate(), dniPoprzedniego);
            var poprzedni = new Date(doD.getFullYear(), doD.getMonth() - 1, dzien, 12);
            d = Math.round((doD - poprzedni) / DZIEN);
        }

        return { m: m, d: d };
    }

    Array.prototype.forEach.call(document.querySelectorAll('[data-periods]'), function (el) {
        var teraz = new Date();
        teraz.setHours(12, 0, 0, 0);

        var miesiaceRazem = 0;
        var dniRazem = 0;
        var pierwszy = null;
        var ok = true;

        el.getAttribute('data-periods').split(',').forEach(function (zakres) {
            var kv = zakres.split(':');
            var od = new Date(kv[0] + 'T12:00:00');
            if (isNaN(od)) { ok = false; return; }
            if (!pierwszy) pierwszy = kv[0];

            var doD = (kv[1] && kv[1].length) ? new Date(kv[1] + 'T12:00:00') : teraz;
            if (isNaN(doD)) { ok = false; return; }
            if (doD > teraz) doD = teraz;          /* przyszlosc sie nie liczy */
            if (doD <= od) return;                 /* okres jeszcze sie nie zaczal */

            var r = roznica(od, doD);
            miesiaceRazem += r.m;
            dniRazem += r.d;
        });

        if (!ok) return;

        /* reszty dni z roznych okresow skladaja sie na pelne miesiace */
        while (dniRazem >= 30) { miesiaceRazem++; dniRazem -= 30; }

        if (miesiaceRazem <= 0 && dniRazem <= 0) return;

        var lat = Math.floor(miesiaceRazem / 12);
        var miesiecy = miesiaceRazem % 12;
        var txt;

        if (miesiaceRazem === 0) {
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

        var cap = el.parentElement && el.parentElement.querySelector('.cap');
        if (cap && pierwszy) {
            var cz = pierwszy.split('-');
            cap.textContent = 'od ' + cz[1] + '.' + cz[0] + ', ' + cap.textContent;
        }
    });

    /* ======================================================================
       Pochylanie kart i poswiata pod kursorem
       ====================================================================== */

    if (!reduced && window.matchMedia('(hover: hover)').matches) {
        /* w trakcie przeciagania mysza uzytkownik zaznacza tekst, a ruszajaca
           sie karta psulaby to zaznaczenie */
        var przeciaganie = false;
        var pochylane = document.querySelectorAll('[data-tilt]');

        document.addEventListener('mousedown', function () {
            przeciaganie = true;
            /* karta wraca na plasko, zeby zaznaczany tekst nie byl skosny */
            Array.prototype.forEach.call(pochylane, function (el) { el.style.transform = ''; });
        }, { passive: true });

        document.addEventListener('mouseup', function () { przeciaganie = false; }, { passive: true });

        Array.prototype.forEach.call(pochylane, function (el) {
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
                if (przeciaganie) return;
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
            el.setAttribute('data-orig', el.innerHTML);

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

                /* Po animacji zdejmujemy maski i wracamy do zwyklego tekstu.
                   Maska ma overflow hidden, ktory przycina podswietlenie
                   zaznaczenia i utrudnia zlapanie slowa kursorem. */
                (function (node, ile) {
                    setTimeout(function () {
                        var orig = node.getAttribute('data-orig');
                        if (orig === null) return;
                        node.innerHTML = orig;
                        node.removeAttribute('data-orig');
                        node.classList.remove('sp-on');
                    }, ile * 55 + 1100);
                })(el, parts.length);
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
                if (r.top >= window.innerHeight || r.bottom <= 0) return;
                el.classList.add('sp-on');
                var orig = el.getAttribute('data-orig');
                if (orig !== null) {
                    setTimeout(function () {
                        el.innerHTML = orig;
                        el.removeAttribute('data-orig');
                        el.classList.remove('sp-on');
                    }, 1400);
                }
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
