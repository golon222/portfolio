$(document).ready(function(){
    $('.slider').slick({
        dots: true, 
        infinite: true,  
        speed: 500,      
        slidesToShow: 1, 
        slidesToScroll: 1,
        arrows: true,    
        prevArrow: '<button type="button" class="slick-prev">&#10094;</button>',  
        nextArrow: '<button type="button" class="slick-next">&#10095;</button>'   
    });
});
