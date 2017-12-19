// Set the date we're counting down to
var countDownDate = new Date("23 Dec, 2017 02:45:00").getTime();
// Update the count down every 1 second
var x = setInterval(function() {
    // Get todays date and time
    var today = new Date();
    var now = today.getTime();
    
    // Find the distance between now an the count down date
    var distance = countDownDate - now;
    
    // Time calculations for days, hours, minutes and seconds
    var days = Math.floor(distance / (1000 * 60 * 60 * 24));
    var hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    hours = ("0" + hours).slice(-2);
    var minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
    minutes = ("0" + minutes).slice(-2);
    var seconds = Math.floor((distance % (1000 * 60)) / 1000);
    seconds = ("0" + seconds).slice(-2);
    
    // Output the result in an element with id="demo"
    document.getElementById("countdown").innerHTML = days + " Days<br>" + hours + ":"
    + minutes + ":" + seconds;
    
    var h = today.getHours();
    var m = today.getMinutes();
    document.getElementById("clock").innerHTML = ("0" + h).slice(-2) + ":" + ("0" + m).slice(-2);
    document.getElementById("date").innerHTML = today.toDateString();
    if (h == 5) {
        document.body.className = "night-to-day"
        // magic number to fade the sky colour
        var r = Math.round(44 + 3.52 * parseInt(m));
        var g = Math.round(71 + 3.07 * parseInt(m));
        var b = Math.round(86 + 2.82 * parseInt(m));
        document.body.style.backgroundColor = 'rgb(' + r + ',' + g + ',' + b + ')';
    } else if (h > 5 && h < 16) {
        document.body.className = "day"
    } else if (h == 16) {
        document.body.className = "day-to-dawn";
        // fade to dawn
        var r = 255;
        var g = Math.round(255 - 0.53 * parseInt(m));
        var b = Math.round(255 - 2.03 * parseInt(m));
        document.body.style.backgroundColor = 'rgb(' + r + ',' + g + ',' + b + ')';
    } else if (h == 17) {
        document.body.className = "dawn"
    } else if (h == 18) {
        document.body.className = "dawn-to-night";
        // fade to night
        var r = Math.round(255 - 3.52 * parseInt(m))
        var g = Math.round(223 - 2.53 * parseInt(m));
        var b = Math.round(133 - 0.78 * parseInt(m));
        document.body.style.backgroundColor = 'rgb(' + r + ',' + g + ',' + b + ')';
    } else {
        document.body.className = "night"
    }
    
    
    // If the count down is over, write some text 
    if (distance < 0) {
        document.getElementById("countdown").innerHTML = "Time to plan for next trip!";
    }
}, 1000);
