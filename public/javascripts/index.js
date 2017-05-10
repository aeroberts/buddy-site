$('.activity-collapse').on('hidden.bs.collapse', function () {
    console.log("Helloooo");
    $(this).prev().addClass("Bumps");
    console.log($(this).prev());
});

$('.panel').on('hidden.bs.collapse', function (e) {
    alert('Event fired on #' + e.currentTarget.id);
});


console.log("Start");
$('.collapse').collapse({toggle: false});
console.log("end");


