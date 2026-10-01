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

    function otworz(src, opis) {
        var img = document.createElement('img');
        img.src = src;
        img.alt = opis || 'Podgląd dokumentu';

        tresc.innerHTML = '';
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
