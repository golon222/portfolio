const modal = document.getElementById('myModal');
const btn = document.getElementById('openModalBtn');
const closeBtn = document.getElementsByClassName('close')[0];

btn.onclick = function(event) {
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
