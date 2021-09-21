// Set the date we're counting down to
// TODO get the time from cookies
// 23 Dec 2017 2:45 HKT or 22 Dec 2017 18:45 UTC
var countDownDate = new Date(Date.UTC(2021, 10, 15, 18, 00, 0));

function getCookie(name) {
  var value = "; " + document.cookie;
  var parts = value.split("; " + name + "=");
  if (parts.length == 2) return parts.pop().split(";").shift();
}

function setCountDownTime() {
	// Try getting from url query
	const queryString = window.location.search;
	const urlParams = new URLSearchParams(queryString);
	var dateField = urlParams.get('countdowndate');

	let today = new Date().toISOString().substr(0, 10);
	document.querySelector("#countdowndate").value = today;
	document.getElementById("countdowndate").setAttribute("min", today);
	if (typeof dateField === 'undefined' || dateField === null) {
		// Try getting from cookies
		dateField = getCookie("countDownDate");
	}

	if (typeof dateField !== 'undefined') {
		document.getElementById("countdown").style.display = "block";
		document.getElementById("title").innerHTML = "Time till " + dateField + " :";

	} else {
		document.getElementById("title").innerHTML = "Click the setting icon on the top right to get started";
		document.getElementById("countdown").style.display = "none";
	}
	countDownDate = dateField;
}

function model() {
	// Get the modal
	var modal = document.getElementById("settingModal");

	// Get the button that opens the modal
	var btn = document.getElementById("setting");

	var submit = document.getElementById("submit");

	// Get the <span> element that closes the modal
	var span = document.getElementsByClassName("close")[0];

	// When the user clicks on the button, open the modal
	btn.onclick = function() {
	  modal.style.display = "block";
	}

	// When the user clicks on <span> (x), close the modal
	span.onclick = function() {
	  modal.style.display = "none";
	}

	submit.onSubmit = function() {
		date = document.getElementById('countdowndate').value;
		document.cookie = "countDownDate=" + date;
		countDownDate = date;
	}

	// When the user clicks anywhere outside of the modal, close it
	window.onclick = function(event) {
	  if (event.target == modal) {
	    modal.style.display = "none";
	  }
	}
}

setCountDownTime();

// Update the count down every 1 second
var x = setInterval(function() {
    // Get todays date and time
    var today = new Date();
    var now = today.getTime();

    model();
    
    // Find the distance between now an the count down date
    var distance = Date.parse(countDownDate) - now;
    
    // Time calculations for days, hours, minutes and seconds
    var days = Math.floor(distance / (1000 * 60 * 60 * 24));
    var hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    hours = ("0" + hours).slice(-2);
    var minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
    minutes = ("0" + minutes).slice(-2);
    var seconds = Math.floor((distance % (1000 * 60)) / 1000);
    seconds = ("0" + seconds).slice(-2);
    
    // Output the result in an element with id="demo"
    if (days == 1) {
        document.getElementById("countdown").innerHTML = days + " Day<br>" + hours + ":" + minutes + ":" + seconds;
    } else {
        document.getElementById("countdown").innerHTML = days + " Days<br>" + hours + ":" + minutes + ":" + seconds;
    }
    
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
    if (distance < -864000000) {
        document.getElementById("countdown").innerHTML = "Time to plan for next trip!";
    } else if (distance < 0) {
        document.getElementById("countdown").innerHTML = "Happy Reunion!";
    }
}, 1000);
