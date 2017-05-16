$('.activity-collapse').on('show.bs.collapse', function () {
    // Remove rounded edges from bottom
    $(this).prev().addClass('act-header-flat-bot');
});

$('.activity-collapse').on('hidden.bs.collapse', function () {
    $(this).prev().removeClass('act-header-flat-bot');
});

