<script>
    window.onscroll = function() {stickyNav()};

    const nav = document.querySelector("nav");
    const sticky = nav.offsetTop;

    function stickyNav() {
        if (window.pageYOffset > sticky) {
            nav.classList.add("sticky");
        } else {
            nav.classList.remove("sticky");
        }
    }
</script>
