// Fetch fitbit summary data on page load
console.log("what");
$.get("/fitbit_summary")
.done(function(data) {
    $("#running-container").append(data);
})
.fail(function(err) {
    console.error(err);
});




// Event Handlers
$('#running-container').on('show.bs.collapse', ".activity-collapse", function (e) {
    // Remove rounded edges from bottom
    $(e.target).prev().addClass('act-header-flat-bot');
});

$('#running-container').on('hidden.bs.collapse', ".activity-collapse", function (e) {
    $(e.target).prev().removeClass('act-header-flat-bot');
});



