        const modal = document.getElementById('myModal');
        const btn1 = document.getElementById('openModalBtn1');
        const btn2 = document.getElementById('openModalBtn2');
        const btn3 = document.getElementById('openModalBtn3');
        const closeBtn = document.getElementsByClassName('close')[0];
        const modalContent = document.getElementById('modalContent');

        btn1.onclick = function(event) {
            event.preventDefault();
            modalContent.innerHTML = '<img src="/jpg/Scan12.10.2024105751_001.jpg" alt="Preferencje" style="max-width: 100%;">';
            modal.style.display = 'flex';
        };

        btn2.onclick = function(event) {
            event.preventDefault();
            modalContent.innerHTML = '<img src="/jpg/Cer1.jpg" alt="Certyfikat" style="max-width: 100%;">';
            modal.style.display = 'flex';
        };

        btn3.onclick = function(event) {
            event.preventDefault();
            modalContent.innerHTML = '<img src="/jpg/Cer2.jpg" alt="Certyfikat" style="max-width: 100%;">';
            modal.style.display = 'flex';
        };

        closeBtn.onclick = function() {
            modal.style.display = 'none';
        };

        window.onclick = function(event) {
            if (event.target == modal) {
                modal.style.display = 'none';
            }
        };
