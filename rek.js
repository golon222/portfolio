        const modal = document.getElementById('myModal');
        const btn1 = document.getElementById('openModalBtn1');
        const btn2 = document.getElementById('openModalBtn2');
        const closeBtn = document.getElementsByClassName('close')[0];


        btn1.onclick = function(event) {
            event.preventDefault(); 
            modal.style.display = 'flex'; 
        };

        btn2.onclick = function(event) {
            event.preventDefault();
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
