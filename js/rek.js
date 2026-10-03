/* ==========================================================================
   Jgolon.pl - podglad dokumentow w oknie modalnym

   Kazdy odnosnik z atrybutem data-podglad otwiera wskazany obraz, wiec
   dolozenie kolejnego dyplomu nie wymaga zmian w tym pliku.
   ========================================================================== */

(function () {
    'use strict';

    var modal = document.getElementById('myModal');
    var tresc = document.getElementById('modalContent');
    if (!modal || !tresc) return;

    var zamykacz = document.querySelector('.close');
    var EN = document.documentElement.lang === 'en';

    function otworz(src, opis) {
        var img = document.createElement('img');
        img.src = src;
        img.alt = opis || (EN ? 'Document preview' : 'Podgląd dokumentu');

        tresc.innerHTML = '';

        /* Podpis idzie nad dokumentem. Pod spodem wypadalby poza widoczny
           obszar okna i trzeba byloby do niego przewijac. */
        if (opis) {
            var podpis = document.createElement('p');
            podpis.className = 'modal-podpis';
            podpis.textContent = opis;
            tresc.appendChild(podpis);
        }

        tresc.appendChild(img);

        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';   /* tlo nie przewija sie pod oknem */
    }

    function zamknij() {
        modal.style.display = 'none';
        tresc.innerHTML = '';
        document.body.style.overflow = '';
    }

    Array.prototype.forEach.call(document.querySelectorAll('[data-podglad]'), function (el) {
        el.addEventListener('click', function (e) {
            e.preventDefault();
            otworz(el.getAttribute('data-podglad'), el.getAttribute('data-opis'));
        });
    });

    if (zamykacz) zamykacz.addEventListener('click', zamknij);

    modal.addEventListener('click', function (e) {
        if (e.target === modal) zamknij();
    });

    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && modal.style.display === 'flex') zamknij();
    });
})();
