define(['jquery'], ($) => {
    function $loadingPanel(message) {
        const $loadingPanelContainer = $('<div>').addClass('LoadingPanelContainer');
        $loadingPanelContainer.append($('<i>').addClass('fa fa-spinner fa-2x fa-spin'));
        if (message) {
            $loadingPanelContainer.append($('<span>').text(message).addClass('LoadingPanelLabel'));
        }
        return $('<div>').addClass('LoadingPanelWrapper')
            .append($loadingPanelContainer);
    }

    return {$loadingPanel};
});